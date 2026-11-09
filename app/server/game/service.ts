import { MongoServerError, ObjectId } from "mongodb";

import { decorateActiveEvent, generateEventNarrative } from "@/server/ai/event-narrative";
import type { UserDocument } from "@/server/auth/types";
import { applyGameAction, type EngineGameAction } from "@/server/game-engine/adapter";
import { hashPayload } from "@/server/game/hash";
import { assertActionIdempotency } from "@/server/game/idempotency";
import { assertLoadableRun } from "@/server/game/load";
import { describeTimelineAction } from "@/server/game/timeline";
import {
  toEventDay,
  toPersistedNarrativeSource,
} from "@/server/game/persisted-values";
import {
  commitGameAction,
  createReportDocument,
  createRunTransaction,
  findAction,
  findCurrentRun,
  findLatestReport,
  findRunByStartRequest,
  findRunForUser,
  findRulesetById,
  findSavePointer,
} from "@/server/game/repository";
import type { CreateRunInput, SubmitActionInput } from "@/server/game/schemas";
import type {
  EventDataDocument,
  GameActionDocument,
  GameRunDocument,
  RunEventDocument,
} from "@/server/game/types";
import { toGameView } from "@/server/game/view";
import { ApiError } from "@/server/http/api-error";

function parseRunId(runId: string): ObjectId {
  if (!/^[a-f\d]{24}$/i.test(runId)) {
    throw new ApiError(400, "VALIDATION_ERROR", "runId must be a valid ObjectId");
  }
  return new ObjectId(runId);
}

async function viewForRun(run: GameRunDocument) {
  return toGameView(run, await findLatestReport(run._id));
}

async function validateRun(
  run: GameRunDocument,
  pointer?: NonNullable<UserDocument["saveGame"]>,
): Promise<void> {
  assertLoadableRun(run, await findRulesetById(run.gameRulesetId), pointer);
}

export async function createRun(user: UserDocument, input: CreateRunInput) {
  const payloadHash = hashPayload({ replaceActiveSave: input.replaceActiveSave });
  const existing = await findRunByStartRequest(user._id, input.startRequestId);
  if (existing) {
    if (existing.startRequestPayloadHash !== payloadHash) {
      throw new ApiError(409, "START_REQUEST_CONFLICT", "startRequestId was already used with another payload");
    }
    await validateRun(existing);
    return { run: existing, game: await viewForRun(existing), replayed: true };
  }

  if (user.saveGame && !input.replaceActiveSave) {
    throw new ApiError(409, "ACTIVE_SAVE_EXISTS", "An active save already exists");
  }

  const run = await createRunTransaction(
    user,
    input.startRequestId,
    payloadHash,
    input.replaceActiveSave,
  );
  if (run.startRequestPayloadHash !== payloadHash) {
    throw new ApiError(409, "START_REQUEST_CONFLICT", "startRequestId was already used with another payload");
  }
  await validateRun(run);
  return { run, game: await viewForRun(run), replayed: false };
}

export async function getCurrentGame(userId: ObjectId) {
  const current = await findCurrentRun(userId);
  if (!current) throw new ApiError(404, "NO_ACTIVE_SAVE", "No active save was found");
  if (!current.run) {
    throw new ApiError(409, "SAVE_POINTER_MISMATCH", "Active save does not reference a valid run");
  }
  await validateRun(current.run, current.pointer);
  return { run: current.run, game: await viewForRun(current.run) };
}

export async function getGameById(userId: ObjectId, runId: string) {
  const run = await findRunForUser(parseRunId(runId), userId);
  if (!run) throw new ApiError(404, "RUN_NOT_FOUND", "Game run was not found");
  await validateRun(run);
  return { run, game: await viewForRun(run) };
}

function toEngineAction(input: SubmitActionInput): EngineGameAction {
  return input as EngineGameAction;
}

async function replayCommittedAction(
  run: GameRunDocument,
  action: GameActionDocument,
  payloadHash: string,
) {
  assertActionIdempotency(action, payloadHash, run.state.revision);
  return {
    action: {
      actionId: action.actionId,
      type: action.type,
      revisionBefore: action.revisionBefore,
      revisionAfter: action.revisionAfter,
    },
    game: await viewForRun(run),
  };
}

export async function submitGameAction(
  userId: ObjectId,
  runIdValue: string,
  input: SubmitActionInput,
) {
  const runId = parseRunId(runIdValue);
  const payloadHash = hashPayload({ type: input.type, payload: input.payload });
  const currentRun = await findRunForUser(runId, userId);
  if (!currentRun) throw new ApiError(404, "RUN_NOT_FOUND", "Game run was not found");

  const duplicate = await findAction(runId, input.actionId);
  if (duplicate) {
    await validateRun(currentRun);
    return replayCommittedAction(currentRun, duplicate, payloadHash);
  }

  if (currentRun.endedAt) throw new ApiError(409, "GAME_ENDED", "Game run has ended");

  const pointer = await findSavePointer(userId);
  if (!pointer) {
    throw new ApiError(409, "SAVE_POINTER_MISMATCH", "Game run is not the active save");
  }
  await validateRun(currentRun, pointer);
  if (currentRun.state.revision !== input.expectedRevision) {
    throw new ApiError(409, "STALE_REVISION", "Game state has changed; reload the current game", {
      currentRevision: currentRun.state.revision.toString(),
    });
  }

  const result = applyGameAction(currentRun.state, toEngineAction(input));
  if (!result.ok) throw new ApiError(422, result.error.code, result.error.message);
  if (result.state.revision !== currentRun.state.revision + 1) {
    throw new Error("Engine action did not advance exactly one revision");
  }

  const now = new Date();
  let nextState = result.state;
  let generatedEvent: { eventData: EventDataDocument; runEvent: RunEventDocument } | null = null;
  if (
    result.state.activeEvent &&
    currentRun.state.activeEvent?.eventId !== result.state.activeEvent.eventId
  ) {
    const narrativeResult = await generateEventNarrative(result.state.activeEvent);
    nextState = decorateActiveEvent(result.state, narrativeResult);
    const eventDataId = new ObjectId();
    const narrative = narrativeResult.narrative;
    const eventDay = toEventDay(result.state.activeEvent.day);
    const narrativeSource = toPersistedNarrativeSource(narrativeResult.source);
    const eventData: EventDataDocument = {
      _id: eventDataId,
      gameRulesetId: currentRun.gameRulesetId,
      packageId: result.state.activeEvent.packageId,
      day: eventDay,
      narrative,
      source: narrativeSource,
      ...(narrativeResult.provider ? { provider: narrativeResult.provider } : {}),
      ...(narrativeResult.model ? { model: narrativeResult.model } : {}),
      promptVersion: narrativeResult.promptVersion,
      schemaVersion: 1,
      validationStatus: "valid",
      createdAt: now,
    };
    generatedEvent = {
      eventData,
      runEvent: {
        _id: new ObjectId(),
        gameRunId: runId,
        eventDataId,
        eventId: result.state.activeEvent.eventId,
        packageId: result.state.activeEvent.packageId,
        day: eventDay,
        narrativeSnapshot: { ...narrative, source: narrativeSource },
        chosenChoiceId: null,
        createdAt: now,
        resolvedAt: null,
      },
    };
  }
  const action: GameActionDocument = {
    _id: new ObjectId(),
    gameRunId: runId,
    userId,
    actionId: input.actionId,
    type: input.type,
    payload: input.payload,
    payloadHash,
    revisionBefore: currentRun.state.revision,
    revisionAfter: nextState.revision,
    createdAt: now,
  };
  const ended = nextState.phase === "gameOver" || nextState.phase === "victory";
  let nextRun: GameRunDocument = {
    ...currentRun,
    state: nextState,
    timeline: currentRun.timeline ?? [],
    updatedAt: now,
    endedAt: ended ? now : null,
  };
  const report = createReportDocument(nextRun, action);
  const timelineEntries = describeTimelineAction(
    input,
    toGameView(currentRun),
    toGameView(nextRun, report),
  );
  nextRun = {
    ...nextRun,
    timeline: [...(currentRun.timeline ?? []), ...timelineEntries],
  };
  const resolvedEvent = input.type === "chooseEventOption" && currentRun.state.activeEvent
    ? { eventId: currentRun.state.activeEvent.eventId, choiceId: input.payload.choiceId }
    : null;

  try {
    await commitGameAction({ currentRun, nextRun, action, report, generatedEvent, resolvedEvent });
  } catch (error) {
    if (error instanceof ApiError && error.code === "STALE_REVISION") {
      const committed = await findAction(runId, input.actionId);
      if (committed) {
        const latest = await findRunForUser(runId, userId);
        if (!latest) throw new ApiError(404, "RUN_NOT_FOUND", "Game run was not found");
        return replayCommittedAction(latest, committed, payloadHash);
      }
    }
    if (error instanceof MongoServerError && error.code === 11000) {
      const committed = await findAction(runId, input.actionId);
      if (committed) {
        const latest = await findRunForUser(runId, userId);
        if (!latest) throw new ApiError(404, "RUN_NOT_FOUND", "Game run was not found");
        return replayCommittedAction(latest, committed, payloadHash);
      }
      throw new ApiError(409, "STALE_REVISION", "Game state has changed; reload the current game");
    }
    throw error;
  }

  return {
    action: {
      actionId: action.actionId,
      type: action.type,
      revisionBefore: action.revisionBefore,
      revisionAfter: action.revisionAfter,
    },
    game: toGameView(nextRun, report ?? (await findLatestReport(runId))),
  };
}
