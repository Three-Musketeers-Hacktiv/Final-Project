import { gameConfig } from "./config";
import { incomeAmountForDay } from "./calendar";
import { upcomingWave, defenseBonusForWave, discountedUpgradeCost } from "./effects";
import type { EffectiveStats, GameState, UpgradeTrack } from "./types";

export function trackLevel(state: GameState, track: UpgradeTrack): number {
  if (track === "wall") return state.wallLevel;
  if (track === "troops") return state.troopLevel;
  return state.cityLevel;
}

export function getEffectiveAttack(state: GameState): number {
  return gameConfig.baseAttack + state.troopLevel * gameConfig.troopAttackBonus;
}

export function getEffectiveDefense(state: GameState, wave: 1 | 2 = upcomingWave(state)): number {
  return (
    gameConfig.baseDefense +
    state.wallLevel * gameConfig.wallDefenseBonus +
    defenseBonusForWave(state.effects, wave)
  );
}

export function getUpgradeCost(state: GameState, track: UpgradeTrack): number {
  return discountedUpgradeCost(trackLevel(state, track), state.effects);
}

export function getRepairCost(): number {
  return gameConfig.repairCost;
}

export function getEffectiveStats(state: GameState): EffectiveStats {
  return {
    attack: getEffectiveAttack(state),
    defense: getEffectiveDefense(state),
    wallCost: getUpgradeCost(state, "wall"),
    troopCost: getUpgradeCost(state, "troops"),
    cityCost: getUpgradeCost(state, "city"),
    repairCost: getRepairCost(),
    dailyIncome: incomeAmountForDay(state, state.day),
  };
}

export function getWavePreview(state: GameState) {
  const wave = upcomingWave(state);
  const monster = gameConfig.waves.find((entry) => entry.wave === wave);
  if (!monster) return null;
  return {
    wave: monster.wave,
    day: monster.day,
    name: monster.name,
    hp: monster.hp,
    attack: monster.attack,
    cityAttack: getEffectiveAttack(state),
    cityDefense: getEffectiveDefense(state, monster.wave),
  };
}
