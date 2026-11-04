export type GamePhase =
  | "preparation"
  | "event"
  | "battleReady"
  | "battleReport"
  | "reward"
  | "gameOver"
  | "victory";

export type WaveId = 1 | 2;

export type GameErrorCode =
  | "INVALID_PHASE"
  | "NO_ACTION_LEFT"
  | "INSUFFICIENT_GOLD"
  | "MAX_UPGRADE"
  | "HP_FULL"
  | "INVALID_CHOICE"
  | "EVENT_REQUIRED"
  | "EVENT_ALREADY_RESOLVED"
  | "REWARD_ALREADY_CHOSEN"
  | "BATTLE_INVALID"
  | "BATTLE_ALREADY_RESOLVED"
  | "GAME_ENDED";

export type GameError = {
  code: GameErrorCode;
  message: string;
};

export type ActionResult<T> =
  | { ok: true; state: T }
  | { ok: false; error: GameError };

export type Effect =
  | { type: "gold_gain"; amount: number }
  | { type: "city_hp_loss"; amount: number }
  | { type: "defense_bonus"; amount: number; wave: WaveId }
  | { type: "upgrade_discount"; rate: number; untilWave: WaveId };

export type EventChoicePackage = {
  id: string;
  label: string;
  goldCost: number;
  effects: Effect[];
};

export type EventPackage = {
  id: string;
  day: number;
  title: string;
  description: string;
  choices: [EventChoicePackage, EventChoicePackage];
};

export type ActiveEvent = {
  packageId: string;
  day: number;
  title: string;
  description: string;
  choiceIds: [string, string];
  source: "mock" | "fallback";
};

export type RewardOption = {
  id: string;
  label: string;
  kind: "gold" | "income_bonus" | "upgrade_discount";
  amount: number;
};

export type ActiveEffects = {
  defenseBonuses: Array<{ amount: number; wave: WaveId; sourceId: string }>;
  upgradeDiscounts: Array<{
    rate: number;
    untilWave: WaveId;
    sourceId: string;
  }>;
  incomeBonus: number;
  incomeBonusSourceId: string | null;
};

export type MonsterSnapshot = {
  name: string;
  hp: number;
  attack: number;
};

export type CityBattleSnapshot = {
  hp: number;
  attack: number;
  defense: number;
};

export type BattleRoundLog = {
  round: number;
  damageToMonster: number;
  damageToCity: number;
  cityHpAfter: number;
  monsterHpAfter: number;
};

export type BattleResult = {
  wave: WaveId;
  won: boolean;
  rounds: BattleRoundLog[];
  cityHpBefore: number;
  cityHpAfter: number;
  monsterHpBefore: number;
  monsterHpAfter: number;
  cityAttack: number;
  cityDefense: number;
  monsterAttack: number;
};

export type GameState = {
  version: 1;
  runId: string;
  day: number;
  phase: GamePhase;
  gold: number;
  cityHp: number;
  cityMaxHp: number;
  upgradeLevel: number;
  actionUsedToday: boolean;
  incomeGrantedForDay: number | null;
  completedEventIds: string[];
  activeEvent: ActiveEvent | null;
  effects: ActiveEffects;
  wavesCleared: number;
  battleResult: BattleResult | null;
  rewardChosenId: string | null;
};

export type EffectiveStats = {
  attack: number;
  defense: number;
  upgradeCost: number;
  repairCost: number;
  upgradeDiscountRate: number;
};
