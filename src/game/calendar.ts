import { gameConfig } from "./config";
import { getDifficultyModifiers, scaleIncome } from "./difficulty";
import type { GameState } from "./types";

export function isBattleDay(day: number): boolean {
  return (gameConfig.battleDays as readonly number[]).includes(day);
}

export function isPreparationDay(day: number): boolean {
  return (
    Number.isInteger(day) &&
    day >= gameConfig.startingDay &&
    day <= gameConfig.lastDay &&
    !isBattleDay(day)
  );
}

export function nextBattleDay(day: number): number | null {
  for (const battle of gameConfig.battleDays) {
    if (battle > day) return battle;
  }
  if ((gameConfig.battleDays as readonly number[]).includes(day)) return day;
  return null;
}

export function previousBattleDay(day: number): number | null {
  let prev: number | null = null;
  for (const battle of gameConfig.battleDays) {
    if (battle >= day) break;
    prev = battle;
  }
  return prev;
}

/** Prep days belonging to the segment that ends at the next battle (or current battle's segment). */
export function prepSegmentForDay(
  day: number,
): { start: number; end: number; battleDay: number } | null {
  const battle = isBattleDay(day) ? day : nextBattleDay(day);
  if (battle == null) return null;
  const prev = previousBattleDay(battle);
  const start = prev == null ? gameConfig.startingDay : prev + 1;
  return { start, end: battle - 1, battleDay: battle };
}

export function incomeAmountForDay(state: GameState, day: number): number {
  if (!isPreparationDay(day)) return 0;
  const mods = getDifficultyModifiers(state.difficulty);
  const base =
    gameConfig.dailyIncome +
    state.cityLevel * gameConfig.cityIncomeBonus +
    state.effects.prepIncomeBonus;
  return scaleIncome(base, mods.dailyIncome);
}

export function pendingConsequenceForDay(state: GameState, day: number) {
  return state.pendingConsequences.find((entry) => entry.triggerDay === day);
}
