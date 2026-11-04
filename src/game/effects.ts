import type { ActiveEffects, Effect, GameState, WaveId } from "./types";

export function emptyEffects(): ActiveEffects {
  return {
    defenseBonuses: [],
    upgradeDiscounts: [],
    incomeBonus: 0,
    incomeBonusSourceId: null,
  };
}

export function applyEffects(
  state: GameState,
  effects: Effect[],
  sourceId: string,
): GameState {
  let next: GameState = {
    ...state,
    effects: {
      ...state.effects,
      defenseBonuses: [...state.effects.defenseBonuses],
      upgradeDiscounts: [...state.effects.upgradeDiscounts],
    },
  };

  for (const effect of effects) {
    switch (effect.type) {
      case "gold_gain":
        next = { ...next, gold: next.gold + effect.amount };
        break;
      case "city_hp_loss": {
        const hp = Math.max(0, next.cityHp - effect.amount);
        next = {
          ...next,
          cityHp: hp,
          phase: hp <= 0 ? "gameOver" : next.phase,
        };
        break;
      }
      case "defense_bonus":
        next.effects.defenseBonuses.push({
          amount: effect.amount,
          wave: effect.wave,
          sourceId,
        });
        break;
      case "upgrade_discount":
        next.effects.upgradeDiscounts.push({
          rate: effect.rate,
          untilWave: effect.untilWave,
          sourceId,
        });
        break;
    }
  }
  return next;
}

/** Drop wave-scoped bonuses after that wave resolves. */
export function clearEffectsAfterWave(
  effects: ActiveEffects,
  wave: WaveId,
): ActiveEffects {
  return {
    ...effects,
    defenseBonuses: effects.defenseBonuses.filter((b) => b.wave !== wave),
    upgradeDiscounts: effects.upgradeDiscounts.filter(
      (d) => d.untilWave > wave,
    ),
    // Income bonus expires after wave 2 starts resolving day 20 path;
    // keep until wave 2 cleared — cleared when wave === 2.
    incomeBonus: wave === 2 ? 0 : effects.incomeBonus,
    incomeBonusSourceId:
      wave === 2 ? null : effects.incomeBonusSourceId,
  };
}
