import { gameConfig, lastWaveNumber } from "./config";
import { getDifficultyModifiers, scaleEconomyCost } from "./difficulty";
import type { ActiveEffects, Difficulty, Effect, GameState } from "./types";

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

export function upcomingWave(state: GameState): number {
  return Math.min(state.wavesCleared + 1, lastWaveNumber());
}

export function defenseBonusForWave(effects: ActiveEffects, wave: number): number {
  return effects.defenseByWave[wave] ?? 0;
}

export function rawUpgradeCost(level: number): number {
  return gameConfig.upgradeBaseCost + level * gameConfig.upgradeCostStep;
}

/** Difficulty then discount; repair is never discounted. */
export function discountedUpgradeCost(
  level: number,
  effects: ActiveEffects,
  difficulty: Difficulty,
): number {
  const mods = getDifficultyModifiers(difficulty);
  const withDifficulty = scaleEconomyCost(rawUpgradeCost(level), mods.upgradeCost);
  if (effects.upgradeDiscountRate <= 0) return withDifficulty;
  return Math.max(1, Math.ceil(withDifficulty * (1 - effects.upgradeDiscountRate)));
}

export type MutableCity = {
  gold: number;
  cityHp: number;
  cityMaxHp: number;
};

export function applyEffect(
  effects: ActiveEffects,
  effect: Effect,
  state: MutableCity,
): { effects: ActiveEffects; gold: number; cityHp: number; cityMaxHp: number } {
  const next = copyEffects(effects);
  let { gold, cityHp, cityMaxHp } = state;
  switch (effect.type) {
    case "grantGold":
      gold += effect.amount;
      break;
    case "damageCity":
      cityHp = Math.max(0, cityHp - effect.amount);
      break;
    case "healCity":
      cityHp = Math.min(cityMaxHp, cityHp + effect.amount);
      break;
    case "maxHpBonus":
      cityMaxHp += effect.amount;
      cityHp = Math.min(cityMaxHp, cityHp + effect.amount);
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
          : Math.max(next.upgradeDiscountUntilWave, effect.untilWave);
      break;
    default: {
      const _never: never = effect;
      return _never;
    }
  }
  return { effects: next, gold, cityHp, cityMaxHp };
}

export function applyEffects(
  effects: ActiveEffects,
  list: Effect[],
  state: MutableCity,
): { effects: ActiveEffects; gold: number; cityHp: number; cityMaxHp: number } {
  return list.reduce(
    (acc, effect) => applyEffect(acc.effects, effect, acc),
    {
      effects: copyEffects(effects),
      gold: state.gold,
      cityHp: state.cityHp,
      cityMaxHp: state.cityMaxHp,
    },
  );
}

export function clearWaveDefense(effects: ActiveEffects, wave: number): ActiveEffects {
  const defenseByWave = { ...effects.defenseByWave };
  delete defenseByWave[wave];
  const next = { ...effects, defenseByWave };
  if (next.upgradeDiscountUntilWave === wave) {
    next.upgradeDiscountRate = 0;
    next.upgradeDiscountUntilWave = null;
  }
  // Prep income bonus is timed until next battle; clear when that wave resolves.
  // Callers that need to keep income across a wave should re-apply via reward.
  return next;
}

/** Clear timed prep income when leaving a reward segment into the next decade after a wave. */
export function clearPrepIncomeBonus(effects: ActiveEffects): ActiveEffects {
  return { ...effects, prepIncomeBonus: 0 };
}

export function clearEndOfCampaignEffects(): ActiveEffects {
  return emptyEffects();
}
