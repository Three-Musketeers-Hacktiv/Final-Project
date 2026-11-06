import type { ActiveEvent, BattleResult, EffectiveStats, GameState } from "../../src/game";

export type ApiMeta = {
  requestId: string;
  contractVersion: 1;
};

export type ApiSuccess<T> = { ok: true; data: T; meta: ApiMeta };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; fields?: Record<string, string> };
  meta: ApiMeta;
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type PublicUserView = {
  id: string;
  username: string;
  hasActiveSave: boolean;
};

export type WavePreviewView = {
  wave: 1 | 2;
  day: number;
  name: string;
  hp: number;
  attack: number;
  cityAttack: number;
  cityDefense: number;
} | null;

export type BattleReportView = {
  id: string;
  runId: string;
  wave: 1 | 2;
  day: number;
  sourceRevision: number;
  battleResult: BattleResult;
  createdAt: string;
};

export type GameView = {
  state: GameState;
  stats: EffectiveStats;
  wavePreview: WavePreviewView;
  eventNarrative: ActiveEvent | null;
  report: BattleReportView | null;
};

export type RegisterRequest = {
  username: string;
  password: string;
  confirmPassword: string;
};
export type LoginRequest = { username: string; password: string };
export type AuthResponse = {
  user: PublicUserView;
  sessionExpiresAt: string;
};

export type CreateRunRequest = {
  startRequestId: string;
  replaceActiveSave: boolean;
};

type BaseAction<TType extends string, TPayload> = {
  actionId: string;
  expectedRevision: number;
  type: TType;
  payload: TPayload;
};
type EmptyPayload = Record<string, never>;

export type SubmitActionRequest =
  | BaseAction<"upgradeWall", EmptyPayload>
  | BaseAction<"upgradeTroops", EmptyPayload>
  | BaseAction<"upgradeCity", EmptyPayload>
  | BaseAction<"repairCity", EmptyPayload>
  | BaseAction<"endPreparationDay", EmptyPayload>
  | BaseAction<"chooseEventOption", { choiceId: string }>
  | BaseAction<"startBattle", EmptyPayload>
  | BaseAction<"continueFromReport", EmptyPayload>
  | BaseAction<"chooseReward", { rewardId: string }>;

export type RunResponse = { runId: string; game: GameView };
export type CreateRunResponse = RunResponse & { replayed: boolean };
export type SubmitActionResponse = {
  action: {
    actionId: string;
    type: SubmitActionRequest["type"];
    revisionBefore: number;
    revisionAfter: number;
  };
  game: GameView;
};
