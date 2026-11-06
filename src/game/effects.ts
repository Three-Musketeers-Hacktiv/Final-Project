import { gameConfig } from "./config";
import type { ActiveEffects, Effect, GameState } from "./types";

export function emptyEffects(): ActiveEffects {
  return {
    defenseByWave: {},
    upgradeDiscountRate: 0,
    upgradeDiscountUntilWave: null,
    prepIncomeBonus: 0,
  };
}

export function copyEffects(effects: ActiveEffects): ActiveEffects {
  return {
    defenseByWave: { ...effects.defenseByWave },
    upgradeDiscountRate: effects.upgradeDiscountRate,
    upgradeDiscountUntilWave: effects.upgradeDiscountUntilWave,
    prepIncomeBonus: effects.prepIncomeBonus,
  };
}

export function upcomingWave(state: GameState): 1 | 2 {
  return state.wavesCleared >= 1 ? 2 : 1;
}

export function defenseBonusForWave(effects: ActiveEffects, wave: 1 | 2): number {
  return effects.defenseByWave[wave] ?? 0;
}

export function rawUpgradeCost(level: number): number {
  return gameConfig.upgradeBaseCost + level * gameConfig.upgradeCostStep;
}

/** Highest discount rate; ceil after discount. Repair is never discounted. */
export function discountedUpgradeCost(level: number, effects: ActiveEffects): number {
  const raw = rawUpgradeCost(level);
  if (effects.upgradeDiscountRate <= 0) return raw;
  return Math.ceil(raw * (1 - effects.upgradeDiscountRate));
}

export function applyEffect(effects: ActiveEffects, effect: Effect, state: { gold: number; cityHp: number }): {
  effects: ActiveEffects;
  gold: number;
  cityHp: number;
} {
  const next = copyEffects(effects);
  let { gold, cityHp } = state;
  switch (effect.type) {
    case "grantGold":
      gold += effect.amount;
      break;
    case "damageCity":
      cityHp = Math.max(0, cityHp - effect.amount);
      break;
    case "nextWaveDefense": {
      const current = next.defenseByWave[effect.wave] ?? 0;
      next.defenseByWave = { ...next.defenseByWave, [effect.wave]: current + effect.amount };
      break;
    }
    case "upgradeDiscount":
      next.upgradeDiscountRate = Math.max(next.upgradeDiscountRate, effect.rate);
      next.upgradeDiscountUntilWave =
        next.upgradeDiscountUntilWave == null
          ? effect.untilWave
          : effect.untilWave > next.upgradeDiscountUntilWave
            ? effect.untilWave
            : next.upgradeDiscountUntilWave;
      break;
    default: {
      const _never: never = effect;
      return _never;
    }
  }
  return { effects: next, gold, cityHp };
}

export function applyEffects(
  effects: ActiveEffects,
  list: Effect[],
  state: { gold: number; cityHp: number },
): { effects: ActiveEffects; gold: number; cityHp: number } {
  return list.reduce((acc, effect) => applyEffect(acc.effects, effect, acc), {
    effects: copyEffects(effects),
    gold: state.gold,
    cityHp: state.cityHp,
  });
}

export function clearWaveDefense(effects: ActiveEffects, wave: 1 | 2): ActiveEffects {
  const defenseByWave = { ...effects.defenseByWave };
  delete defenseByWave[wave];
  const next = { ...effects, defenseByWave };
  if (next.upgradeDiscountUntilWave === wave) {
    next.upgradeDiscountRate = 0;
    next.upgradeDiscountUntilWave = null;
  }
  return next;
}

/** Phase bonuses end after the final wave. */
export function clearEndOfCampaignEffects(): ActiveEffects {
  return emptyEffects();
}
