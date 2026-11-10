import {
  gameConfig,
  getRepairCost,
  getUpgradeCost,
  repairCity,
  upgradeCity,
  upgradeTroops,
  upgradeWall,
  type Effect,
  type GameState,
  type UpgradeTrack,
} from "../../../src/game/index";
import { mustOk } from "./mustOk";

function damageOf(effects: Effect[]): number {
  return effects.reduce((total, effect) => total + (effect.type === "damageCity" ? effect.amount : 0), 0);
}

function levelOf(state: GameState, track: UpgradeTrack): number {
  if (track === "wall") return state.wallLevel;
  if (track === "troops") return state.troopLevel;
  return state.cityLevel;
}

function upgrade(track: UpgradeTrack) {
  if (track === "wall") return upgradeWall;
  if (track === "troops") return upgradeTroops;
  return upgradeCity;
}

/**
 * Pilihan event yang dipakai simulasi dan jalur menang yang sudah dikenal.
 * Utamakan pilihan yang tidak membunuh kota, lalu bonus defense/diskon/HP.
 * Pilihan berbayar dan consequence mendapat penalti supaya jalur ini stabil.
 */
export function scoredEventChoice(state: GameState): string {
  const choices = state.activeEvent?.choices ?? [];
  const survivable = choices.filter((choice) => {
    if (choice.goldCost > state.gold) return false;
    return state.cityHp - damageOf(choice.effects) > 0;
  });
  const pool = survivable.length > 0 ? survivable : choices.filter((choice) => choice.goldCost === 0);
  const scored = (pool.length > 0 ? pool : choices).map((choice) => {
    let score = choice.goldCost === 0 ? 1 : 0;
    for (const effect of choice.effects) {
      if (effect.type === "nextWaveDefense") score += effect.amount * 8;
      else if (effect.type === "upgradeDiscount") score += 24;
      else if (effect.type === "maxHpBonus") score += effect.amount * 2;
      else if (effect.type === "healCity") score += state.cityHp < state.cityMaxHp ? effect.amount : 0;
      else if (effect.type === "grantGold") score += 3;
      else if (effect.type === "damageCity") score -= effect.amount * 4;
    }
    if (choice.consequence) score -= 6;
    if (choice.goldCost > 0) score -= 30;
    return { id: choice.id, score };
  });
  scored.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  return scored[0]!.id;
}

/** Hindari damage jika masih ada pilihan yang terjangkau. Dipakai jalur kalah di battle, bukan di event. */
export function avoidDamageChoice(state: GameState): string {
  const choices = state.activeEvent?.choices ?? [];
  const affordable = choices.filter((choice) => choice.goldCost <= state.gold);
  const pool = affordable.length > 0 ? affordable : choices;
  const ranked = pool.map((choice) => ({
    id: choice.id,
    damage: damageOf(choice.effects),
    consequence: choice.consequence ? 1 : 0,
    gold: choice.goldCost,
  }));
  ranked.sort(
    (left, right) =>
      left.damage - right.damage ||
      left.consequence - right.consequence ||
      left.gold - right.gold ||
      left.id.localeCompare(right.id),
  );
  return ranked[0]!.id;
}

/**
 * Belanja harian yang sama dengan jalur `easy-campaign` di test lama:
 * repair bila HP di bawah 80%, lalu troops sampai 12, wall sampai 8, city sampai 8,
 * setelah itu troops, wall, city sampai level maksimum jika gold cukup.
 * Mengembalikan null bila jatah tidak dipakai.
 */
export function knownWinAction(state: GameState): GameState | null {
  if (state.actionUsedToday || state.phase !== "preparation") return null;
  const hpRatio = state.cityHp / state.cityMaxHp;
  if (hpRatio < 0.8 && state.gold >= getRepairCost(state) && state.cityHp < state.cityMaxHp) {
    return mustOk(repairCity(state));
  }
  const troopCost = getUpgradeCost(state, "troops");
  const wallCost = getUpgradeCost(state, "wall");
  const cityCost = getUpgradeCost(state, "city");
  if (state.troopLevel < 12 && state.gold >= troopCost) return mustOk(upgradeTroops(state));
  if (state.wallLevel < 8 && state.gold >= wallCost) return mustOk(upgradeWall(state));
  if (state.cityLevel < 8 && state.gold >= cityCost) return mustOk(upgradeCity(state));
  if (state.troopLevel < gameConfig.maxTrackLevel && state.gold >= troopCost) return mustOk(upgradeTroops(state));
  if (state.wallLevel < gameConfig.maxTrackLevel && state.gold >= wallCost) return mustOk(upgradeWall(state));
  if (state.cityLevel < gameConfig.maxTrackLevel && state.gold >= cityCost) return mustOk(upgradeCity(state));
  return null;
}

export type SpendOrder = "troops" | "wall" | "city" | "balanced" | "skip" | "knownWin";

/** Repair memakai jatah harian dan gold, jadi upgrade hari itu tidak terjadi. */
export type RepairPolicy = "off" | "below80";

export type SpendResult = {
  state: GameState;
  repaired: boolean;
  repairCost: number;
};

const ORDER: Record<Exclude<SpendOrder, "balanced" | "skip" | "knownWin">, UpgradeTrack[]> = {
  troops: ["troops", "wall", "city"],
  wall: ["wall", "troops", "city"],
  city: ["city", "troops", "wall"],
};

function tracksFor(state: GameState, mode: Exclude<SpendOrder, "skip" | "knownWin">): UpgradeTrack[] {
  if (mode === "balanced") {
    return ([...ORDER.troops] as UpgradeTrack[]).sort(
      (left, right) => levelOf(state, left) - levelOf(state, right) || left.localeCompare(right),
    );
  }
  return ORDER[mode];
}

/**
 * Satu percobaan belanja. Null berarti hari ini dilewati.
 * `below80`: jika HP di bawah 80% MaxHP dan gold cukup, repair didahulukan dari upgrade.
 */
export function spendOnce(
  state: GameState,
  mode: SpendOrder,
  repair: RepairPolicy = "off",
): SpendResult | null {
  if (state.actionUsedToday || state.phase !== "preparation") return null;
  if (mode === "skip") return null;
  if (mode === "knownWin") {
    const next = knownWinAction(state);
    if (!next) return null;
    const repaired = next.cityHp > state.cityHp && next.wallLevel === state.wallLevel && next.troopLevel === state.troopLevel && next.cityLevel === state.cityLevel;
    return { state: next, repaired, repairCost: repaired ? state.gold - next.gold : 0 };
  }
  if (
    repair === "below80" &&
    state.cityHp < state.cityMaxHp &&
    state.cityHp / state.cityMaxHp < 0.8 &&
    state.gold >= getRepairCost(state)
  ) {
    const next = mustOk(repairCity(state));
    return { state: next, repaired: true, repairCost: state.gold - next.gold };
  }
  for (const track of tracksFor(state, mode)) {
    const result = upgrade(track)(state);
    if (result.ok) return { state: result.state, repaired: false, repairCost: 0 };
  }
  return null;
}