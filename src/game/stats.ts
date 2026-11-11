import { gameConfig } from "./config";
import { incomeAmountForDay } from "./calendar";
import { getDifficultyModifiers, scaleMonsterStat } from "./difficulty";
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

export function getEffectiveDefense(state: GameState, wave: number = upcomingWave(state)): number {
  return (
    gameConfig.baseDefense +
    state.wallLevel * gameConfig.wallDefenseBonus +
    defenseBonusForWave(state.effects, wave)
  );
}

export function getUpgradeCost(state: GameState, track: UpgradeTrack): number {
  return discountedUpgradeCost(trackLevel(state, track), state.effects, state.difficulty);
}

export function getRepairCost(state?: GameState): number {
  const difficulty = state?.difficulty ?? "normal";
  const mods = getDifficultyModifiers(difficulty);
  return Math.max(1, Math.ceil(gameConfig.repairCost * mods.repairCost));
}

export function getEffectiveStats(state: GameState): EffectiveStats {
  return {
    attack: getEffectiveAttack(state),
    defense: getEffectiveDefense(state),
    wallCost: getUpgradeCost(state, "wall"),
    troopCost: getUpgradeCost(state, "troops"),
    cityCost: getUpgradeCost(state, "city"),
    repairCost: getRepairCost(state),
    dailyIncome: incomeAmountForDay(state, state.day),
  };
}

export function getWavePreview(state: GameState) {
  const wave = upcomingWave(state);
  const monster = gameConfig.waves.find((entry) => entry.wave === wave);
  if (!monster) return null;
  const mods = getDifficultyModifiers(state.difficulty);
  return {
    wave: monster.wave,
    day: monster.day,
    name: monster.name,
    role: monster.role,
    hp: scaleMonsterStat(monster.hp, mods.monsterHp),
    attack: scaleMonsterStat(monster.attack, mods.monsterAttack),
    cityAttack: getEffectiveAttack(state),
    cityDefense: getEffectiveDefense(state, monster.wave),
  };
}
