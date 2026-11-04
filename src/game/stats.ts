import { GAME_CONFIG, nextWaveId } from "./config";
import type { EffectiveStats, GameState, WaveId } from "./types";

export function baseAttack(state: GameState): number {
  return (
    GAME_CONFIG.baseAttack +
    state.upgradeLevel * GAME_CONFIG.upgradeAttackBonus
  );
}

export function baseDefense(state: GameState): number {
  return (
    GAME_CONFIG.baseDefense +
    state.upgradeLevel * GAME_CONFIG.upgradeDefenseBonus
  );
}

export function defenseBonusForWave(state: GameState, wave: WaveId): number {
  return state.effects.defenseBonuses
    .filter((b) => b.wave === wave)
    .reduce((sum, b) => sum + b.amount, 0);
}

/** Max discount rate among discounts still valid for the upcoming wave. */
export function activeUpgradeDiscountRate(state: GameState): number {
  const upcoming = nextWaveId(state.wavesCleared);
  let max = 0;
  for (const d of state.effects.upgradeDiscounts) {
    if (d.untilWave >= upcoming && d.rate > max) max = d.rate;
  }
  return max;
}

export function rawUpgradeCost(level: number): number {
  return GAME_CONFIG.firstUpgradeCost + level * GAME_CONFIG.upgradeCostStep;
}

export function discountedCost(raw: number, rate: number): number {
  if (rate <= 0) return raw;
  return Math.ceil(raw * (1 - rate));
}

export function getEffectiveStats(state: GameState): EffectiveStats {
  const wave = nextWaveId(state.wavesCleared);
  const discount = activeUpgradeDiscountRate(state);
  return {
    attack: baseAttack(state),
    defense: baseDefense(state) + defenseBonusForWave(state, wave),
    upgradeCost: discountedCost(rawUpgradeCost(state.upgradeLevel), discount),
    repairCost: GAME_CONFIG.repairCost,
    upgradeDiscountRate: discount,
  };
}
