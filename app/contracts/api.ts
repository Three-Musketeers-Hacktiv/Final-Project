import type {
  ActiveEvent,
  BattleResult,
  Difficulty,
  EffectiveStats,
  GameState,
  RewardOption,
  WaveRole,
} from "../../src/game";

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
  wave: number;
  day: number;
  name: string;
  role: WaveRole;
  hp: number;
  attack: number;
  cityAttack: number;
  cityDefense: number;
} | null;

export type BattleReportView = {
  id: string;
  runId: string;
  wave: number;
  day: number;
  sourceRevision: number;
  battleResult: BattleResult;
  createdAt: string;
};

export type TimelineCategory = "city" | "battle" | "event";
export type TimelineTone = "city" | "gain" | "loss" | "neutral";
export type TimelineIcon =
  | "wallLevel"
  | "troopLevel"
  | "cityLevel"
  | "repairWall"
  | "timeline"
  | "upcomingWaves"
  | "thisWave"
  | "minus"
  | "plus";

export type TimelineEntry = {
  id: string;
  day: number;
  category: TimelineCategory;
  tone: TimelineTone;
  icon: TimelineIcon;
  highlight?: string;
  text: string;
};

export type GameView = {
  state: GameState;
  stats: EffectiveStats;
  wavePreview: WavePreviewView;
  eventNarrative: ActiveEvent | null;
  rewardOptions: RewardOption[];
  report: BattleReportView | null;
  timeline: TimelineEntry[];
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
  difficulty: Difficulty;
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
  | BaseAction<"chooseReward", { rewardId: string }>
  | BaseAction<"surrender", EmptyPayload>;

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
