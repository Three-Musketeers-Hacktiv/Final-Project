export type GamePhase =
  | "preparation"
  | "event"
  | "battleReady"
  | "battleReport"
  | "reward"
  | "gameOver"
  | "victory";

export type GameErrorCode =
  | "INVALID_PHASE"
  | "INVALID_TRANSITION"
  | "EVENT_REQUIRED"
  | "NO_ACTION_LEFT"
  | "INSUFFICIENT_GOLD"
  | "MAX_UPGRADE"
  | "HP_FULL"
  | "INVALID_CHOICE"
  | "EVENT_ALREADY_RESOLVED"
  | "REWARD_ALREADY_CHOSEN"
  | "BATTLE_INVALID"
  | "BATTLE_ALREADY_RESOLVED"
  | "GAME_ENDED";

export type GameError = {
  code: GameErrorCode;
  message: string;
};

export type ActionResult =
  | { ok: true; state: GameState }
  | { ok: false; error: GameError };

export type Effect =
  | { type: "grantGold"; amount: number }
  | { type: "damageCity"; amount: number }
  | { type: "nextWaveDefense"; amount: number; wave: 1 | 2 }
  | { type: "upgradeDiscount"; rate: number; untilWave: 1 | 2 };

export type EventChoice = {
  id: string;
  label: string;
  goldCost: number;
  effects: Effect[];
};

export type EventPackage = {
  packageId: string;
  eventId: string;
  day: number;
  title: string;
  description: string;
  choices: [EventChoice, EventChoice];
};

/** One trusted package chosen for a scheduled event day in this run. */
export type EventPlanEntry = {
  day: number;
  packageId: string;
  eventId: string;
};

export type ActiveEvent = {
  eventId: string;
  packageId: string;
  day: number;
  title: string;
  description: string;
  choices: [EventChoice, EventChoice];
  source: "local" | "mock" | "fallback" | "ai";
};

export type ActiveEffects = {
  /** Additive defense bonus keyed by wave number. */
  defenseByWave: { 1?: number; 2?: number };
  /** Highest active upgrade discount rate in [0, 1]. */
  upgradeDiscountRate: number;
  /** Clears after this wave resolves; null when no discount. */
  upgradeDiscountUntilWave: 1 | 2 | null;
  /** Extra gold on preparation days 11–19 while run is mid/late. */
  prepIncomeBonus: number;
};

export type BattleRoundLog = {
  round: number;
  damageToMonster: number;
  damageToCity: number;
  cityHpAfter: number;
  monsterHpAfter: number;
};

export type BattleResult = {
  wave: 1 | 2;
  day: number;
  won: boolean;
  rounds: BattleRoundLog[];
  cityHpBefore: number;
  cityHpAfter: number;
  monsterHpBefore: number;
  monsterHpAfter: number;
  cityAttack: number;
  cityDefense: number;
  monsterAttack: number;
  cityHpLost: number;
  monsterHpLost: number;
};

export type RewardOption = {
  id: string;
  label: string;
  kind: "grantGold" | "prepIncomeBonus" | "upgradeDiscount";
  amount: number;
};

export type UpgradeTrack = "wall" | "troops" | "city";

export type GameState = {
  version: 3;
  revision: number;
  runId: string;
  day: number;
  phase: GamePhase;
  gold: number;
  cityHp: number;
  cityMaxHp: number;
  wallLevel: number;
  troopLevel: number;
  cityLevel: number;
  actionUsedToday: boolean;
  incomeGrantedDays: number[];
  completedEventIds: string[];
  /** Trusted packages selected for this run (one per scheduled event day). */
  eventPlan: EventPlanEntry[];
  activeEvent: ActiveEvent | null;
  effects: ActiveEffects;
  wavesCleared: number;
  battleResult: BattleResult | null;
  rewardChosenId: string | null;
};

export type EffectiveStats = {
  attack: number;
  defense: number;
  wallCost: number;
  troopCost: number;
  cityCost: number;
  repairCost: number;
  /** Gold granted when this calendar day is a preparation day. */
  dailyIncome: number;
};
