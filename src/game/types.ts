export type GamePhase =
  | "preparation"
  | "event"
  | "battleReady"
  | "battleReport"
  | "reward"
  | "gameOver"
  | "victory";

export type Difficulty = "easy" | "normal" | "hard";

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
  | { type: "healCity"; amount: number }
  | { type: "maxHpBonus"; amount: number }
  | { type: "nextWaveDefense"; amount: number; wave: number }
  | { type: "upgradeDiscount"; rate: number; untilWave: number };

export type ChoiceConsequence = {
  packageId: string;
  minDelayDays: number;
  maxDelayDays: number;
  /** Optional wave lock for a dynamic follow-up. Catalog packages keep using the successor map. */
  targetWave?: number;
  /**
   * Depth-1 package the engine can run when a follow-up is not regenerated.
   * Its choices must not declare another consequence.
   */
  fallbackPackage?: EventPackage;
};

export type EventChoice = {
  id: string;
  label: string;
  goldCost: number;
  effects: Effect[];
  consequence?: ChoiceConsequence;
};

export type EventPackage = {
  packageId: string;
  eventId: string;
  /** Decade pool 1–10 (prep segment before that decade's battle). */
  decade: number;
  title: string;
  description: string;
  /** Length 2–4; at least one choice must be free. */
  choices: EventChoice[];
};

export type EventPlanEntry = {
  day: number;
  packageId: string;
  eventId: string;
};

export type PendingConsequence = {
  id: string;
  originEventId: string;
  originChoiceId: string;
  packageId: string;
  triggerDay: number;
};

export type ActiveEvent = {
  eventId: string;
  packageId: string;
  day: number;
  title: string;
  description: string;
  choices: EventChoice[];
  source: "local" | "mock" | "fallback" | "ai";
  isConsequence?: boolean;
  originEventId?: string;
  originChoiceId?: string;
};

export type ActiveEffects = {
  defenseByWave: Record<number, number | undefined>;
  upgradeDiscountRate: number;
  upgradeDiscountUntilWave: number | null;
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
  wave: number;
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

export type RewardKind =
  | "grantGold"
  | "prepIncomeBonus"
  | "upgradeDiscount"
  | "healCity"
  | "nextWaveDefense"
  | "maxHpBonus"
  | "combo";

export type RewardOption = {
  id: string;
  label: string;
  kind: RewardKind;
  amount: number;
  wave?: number;
  rate?: number;
  untilWave?: number;
  effects?: Effect[];
};

export type WaveRewardSet = {
  afterWave: number;
  options: [RewardOption, RewardOption, RewardOption];
};

export type UpgradeTrack = "wall" | "troops" | "city";

export type WaveRole = "tutorial" | "check" | "spike" | "tank" | "midboss" | "attrition" | "finale";

export type WaveDefinition = {
  wave: number;
  day: number;
  name: string;
  role: WaveRole;
  hp: number;
  attack: number;
};

export type GameState = {
  version: 4;
  revision: number;
  runId: string;
  difficulty: Difficulty;
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
  eventPlan: EventPlanEntry[];
  /**
   * Committed dynamic or snapshotted packages keyed by packageId.
   * Absent on older v4 saves; those runs keep resolving the local catalog.
   */
  eventPackageStore?: Record<string, EventPackage>;
  pendingConsequences: PendingConsequence[];
  activeEvent: ActiveEvent | null;
  effects: ActiveEffects;
  wavesCleared: number;
  battleResult: BattleResult | null;
  rewardsChosenByWave: Record<string, string>;
};

export type EffectiveStats = {
  attack: number;
  defense: number;
  wallCost: number;
  troopCost: number;
  cityCost: number;
  repairCost: number;
  dailyIncome: number;
};
