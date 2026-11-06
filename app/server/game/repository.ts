import { MongoServerError, ObjectId } from "mongodb";

import type { UserDocument } from "@/server/auth/types";
import { getDatabase, getMongoClient } from "@/server/db/mongodb";
import { createGameState, getEngineRulesetMetadata } from "@/server/game-engine/adapter";
import { createPropertyDocuments } from "@/server/game/properties";
import type {
  GameActionDocument,
  EventDataDocument,
  GameReportDocument,
  GameRulesetDocument,
  GameRunDocument,
  RunEventDocument,
} from "@/server/game/types";
import { RULESET_ID } from "@/server/game/types";
import { ApiError } from "@/server/http/api-error";

async function ensureRuleset(): Promise<GameRulesetDocument> {
  const database = await getDatabase();
  const collection = database.collection<GameRulesetDocument>("game_rulesets");
  const now = new Date();
  const metadata = getEngineRulesetMetadata();
  await collection.updateOne(
    { rulesetId: RULESET_ID },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        engineVersion: metadata.engineVersion,
        stateVersion: metadata.stateVersion,
        configFingerprint: metadata.configFingerprint,
        status: "active",
        createdAt: now,
      },
    },
    { upsert: true },
  );
  const ruleset = await collection.findOne({ rulesetId: RULESET_ID });
  if (!ruleset) throw new Error("Ruleset metadata could not be created");
  return ruleset;
}

export async function findRunByStartRequest(
  userId: ObjectId,
  startRequestId: string,
): Promise<GameRunDocument | null> {
  const database = await getDatabase();
  return database.collection<GameRunDocument>("game_runs").findOne({ userId, startRequestId });
}

export async function createRunTransaction(
  user: UserDocument,
  startRequestId: string,
  payloadHash: string,
  replaceActiveSave: boolean,
): Promise<GameRunDocument> {
  const ruleset = await ensureRuleset();
  const client = await getMongoClient();
  const database = await getDatabase();
  const mongoSession = client.startSession();
  const now = new Date();
  const runId = new ObjectId();
  const state = createGameState(runId.toHexString());
  const run: GameRunDocument = {
    _id: runId,
    userId: user._id,
    rulesetId: ruleset._id,
    startRequestId,
    startRequestPayloadHash: payloadHash,
    state,
    createdAt: now,
    updatedAt: now,
    endedAt: null,
  };

  try {
    await mongoSession.withTransaction(async () => {
      await database.collection<GameRunDocument>("game_runs").insertOne(run, { session: mongoSession });
      await database.collection("game_properties").insertMany(
        createPropertyDocuments(runId, state, null, now),
        { session: mongoSession },
      );
      const userUpdate = await database.collection<UserDocument>("users").updateOne(
        replaceActiveSave ? { _id: user._id } : { _id: user._id, saveGame: null },
        {
          $set: {
            saveGame: { runId, savedRevision: state.revision, savedAt: now },
            updatedAt: now,
          },
        },
        { session: mongoSession },
      );
      if (userUpdate.modifiedCount !== 1) {
        throw new ApiError(409, "ACTIVE_SAVE_EXISTS", "An active save already exists");
      }
    });
    return run;
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      const existing = await findRunByStartRequest(user._id, startRequestId);
      if (existing) return existing;
    }
    throw error;
  } finally {
    await mongoSession.endSession();
  }
}

export async function findRunForUser(runId: ObjectId, userId: ObjectId): Promise<GameRunDocument | null> {
  const database = await getDatabase();
  return database.collection<GameRunDocument>("game_runs").findOne({ _id: runId, userId });
}

export async function findCurrentRun(userId: ObjectId): Promise<GameRunDocument | null> {
  const database = await getDatabase();
  const user = await database.collection<UserDocument>("users").findOne({ _id: userId });
  if (!user?.saveGame) return null;
  return findRunForUser(user.saveGame.runId, userId);
}

export async function findAction(runId: ObjectId, actionId: string): Promise<GameActionDocument | null> {
  const database = await getDatabase();
  return database.collection<GameActionDocument>("game_actions").findOne({ runId, actionId });
}

export async function findLatestReport(runId: ObjectId): Promise<GameReportDocument | null> {
  const database = await getDatabase();
  return database.collection<GameReportDocument>("game_reports").findOne(
    { runId },
    { sort: { createdAt: -1 } },
  );
}

export async function commitGameAction(input: {
  currentRun: GameRunDocument;
  nextRun: GameRunDocument;
  action: GameActionDocument;
  report: GameReportDocument | null;
  generatedEvent: { eventData: EventDataDocument; runEvent: RunEventDocument } | null;
  resolvedEvent: { eventId: string; choiceId: string } | null;
}): Promise<void> {
  const client = await getMongoClient();
  const database = await getDatabase();
  const session = client.startSession();
  const { currentRun, nextRun, action, report, generatedEvent, resolvedEvent } = input;

  try {
    await session.withTransaction(async () => {
      const update = await database.collection<GameRunDocument>("game_runs").updateOne(
        { _id: currentRun._id, userId: currentRun.userId, "state.revision": currentRun.state.revision },
        { $set: { state: nextRun.state, updatedAt: nextRun.updatedAt, endedAt: nextRun.endedAt } },
        { session },
      );
      if (update.modifiedCount !== 1) {
        throw new ApiError(409, "STALE_REVISION", "Game state has changed; reload the current game");
      }

      await database.collection<GameActionDocument>("game_actions").insertOne(action, { session });
      await database.collection("game_properties").insertMany(
        createPropertyDocuments(currentRun._id, nextRun.state, action._id, nextRun.updatedAt),
        { session },
      );
      if (report) {
        await database.collection<GameReportDocument>("game_reports").insertOne(report, { session });
      }
      if (generatedEvent) {
        await database.collection<EventDataDocument>("event_data").insertOne(generatedEvent.eventData, { session });
        await database.collection<RunEventDocument>("runs_event").insertOne(generatedEvent.runEvent, { session });
      }
      if (resolvedEvent) {
        await database.collection<RunEventDocument>("runs_event").updateOne(
          { runId: currentRun._id, eventId: resolvedEvent.eventId },
          { $set: { chosenChoiceId: resolvedEvent.choiceId, resolvedAt: nextRun.updatedAt } },
          { session },
        );
      }

      const userUpdate: Record<string, unknown> = {
        $set: {
          saveGame: {
            runId: currentRun._id,
            savedRevision: nextRun.state.revision,
            savedAt: nextRun.updatedAt,
          },
          updatedAt: nextRun.updatedAt,
        },
      };
      if (nextRun.endedAt && !currentRun.endedAt) {
        userUpdate.$push = {
          gameHistory: {
            runId: currentRun._id,
            result: nextRun.state.phase === "victory" ? "victory" : "gameOver",
            endedAt: nextRun.endedAt,
          },
        };
      }
      await database.collection<UserDocument>("users").updateOne(
        { _id: currentRun.userId },
        userUpdate,
        { session },
      );
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new ApiError(409, "DUPLICATE_ACTION", "This action has already been applied");
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export function createReportDocument(
  run: GameRunDocument,
  action: GameActionDocument,
): GameReportDocument | null {
  const result = run.state.battleResult;
  if (action.type !== "startBattle" || !result) return null;
  return {
    _id: new ObjectId(),
    runId: run._id,
    userId: run.userId,
    wave: result.wave,
    day: result.day,
    actionId: action.actionId,
    gameActionId: action._id,
    sourceRevision: action.revisionAfter,
    battleResult: result,
    postAttack: {
      cityHp: run.state.cityHp,
      gold: run.state.gold,
      wallLevel: run.state.wallLevel,
      troopLevel: run.state.troopLevel,
      cityLevel: run.state.cityLevel,
      phase: run.state.phase,
      wavesCleared: run.state.wavesCleared,
      effects: run.state.effects,
    },
    createdAt: run.updatedAt,
  };
}
