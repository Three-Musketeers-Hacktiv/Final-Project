import type { ObjectId } from "mongodb";

import type { GameState } from "@/server/game-engine/adapter";

export const RULESET_ID = "prototype-v3";

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
  rulesetId: ObjectId;
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
  | "chooseReward";

export type GameActionDocument = {
  _id: ObjectId;
  runId: ObjectId;
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
  runId: ObjectId;
  gameActionId: ObjectId | null;
  revision: number;
  statKey: GamePropertyKey;
  statValue: number;
  createdAt: Date;
};

export type GameReportDocument = {
  _id: ObjectId;
  runId: ObjectId;
  userId: ObjectId;
  wave: 1 | 2;
  day: number;
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
