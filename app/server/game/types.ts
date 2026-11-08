import type { ObjectId } from "mongodb";

import type { GameState } from "@/server/game-engine/adapter";
import type {
  BattleDay,
  EventDay,
  PersistedNarrativeSource,
} from "@/server/game/persisted-values";

export type GameRulesetDocument = {
  _id: ObjectId;
  rulesetId: string;
  engineVersion: string;
  stateVersion: 3;
  configFingerprint: string;
  status: "active" | "retired";
  createdAt: Date;
};

export type GameRunDocument = {
  _id: ObjectId;
  userId: ObjectId;
  gameRulesetId: ObjectId;
  startRequestId: string;
  startRequestPayloadHash: string;
  state: GameState;
  createdAt: Date;
  updatedAt: Date;
  endedAt: Date | null;
};

export type GameActionType =
  | "upgradeWall"
  | "upgradeTroops"
  | "upgradeCity"
  | "repairCity"
  | "endPreparationDay"
  | "chooseEventOption"
  | "startBattle"
  | "continueFromReport"
  | "chooseReward"
  | "surrender"
  | "attachActiveEvent";

export type GameActionDocument = {
  _id: ObjectId;
  gameRunId: ObjectId;
  userId: ObjectId;
  actionId: string;
  type: GameActionType;
  payload: Record<string, unknown>;
  payloadHash: string;
  revisionBefore: number;
  revisionAfter: number;
  createdAt: Date;
};

export type GamePropertyKey =
  | "gold"
  | "cityHp"
  | "cityMaxHp"
  | "wallLevel"
  | "troopLevel"
  | "cityLevel"
  | "attack"
  | "defense";

export type GamePropertyDocument = {
  _id: ObjectId;
  gameRunId: ObjectId;
  gameActionId: ObjectId | null;
  revision: number;
  statKey: GamePropertyKey;
  statValue: number;
  createdAt: Date;
};

export type GameReportDocument = {
  _id: ObjectId;
  gameRunId: ObjectId;
  userId: ObjectId;
  wave: 1 | 2;
  day: BattleDay;
  actionId: string;
  gameActionId: ObjectId;
  sourceRevision: number;
  battleResult: NonNullable<GameState["battleResult"]>;
  postAttack: {
    cityHp: number;
    gold: number;
    wallLevel: number;
    troopLevel: number;
    cityLevel: number;
    phase: GameState["phase"];
    wavesCleared: number;
    effects: GameState["effects"];
  };
  createdAt: Date;
};

export type EventDataDocument = {
  _id: ObjectId;
  gameRulesetId: ObjectId;
  packageId: string;
  day: EventDay;
  narrative: {
    title: string;
    description: string;
    choices: [{ id: string; label: string }, { id: string; label: string }];
  };
  source: PersistedNarrativeSource;
  provider?: string;
  model?: string;
  promptVersion: string;
  schemaVersion: 1;
  validationStatus: "valid";
  createdAt: Date;
};

export type RunEventDocument = {
  _id: ObjectId;
  gameRunId: ObjectId;
  eventDataId: ObjectId;
  eventId: string;
  packageId: string;
  day: EventDay;
  narrativeSnapshot: EventDataDocument["narrative"] & { source: PersistedNarrativeSource };
  chosenChoiceId: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};
