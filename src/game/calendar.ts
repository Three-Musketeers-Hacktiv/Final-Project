import { eventPackageForDay, gameConfig } from "./config";
import type { GameState } from "./types";

export function isPreparationDay(day: number): boolean {
  return (day >= 1 && day <= 9) || (day >= 11 && day <= 19);
}

export function isBattleDay(day: number): boolean {
  return (gameConfig.battleDays as readonly number[]).includes(day);
}

export function incomeAmountForDay(state: GameState, day: number): number {
  const rewardBonus = day >= 11 && day <= 19 ? state.effects.prepIncomeBonus : 0;
  return gameConfig.dailyIncome + state.cityLevel * gameConfig.cityIncomeBonus + rewardBonus;
}

/** Scheduled event for today is not finished, or an active event is still open. */
export function hasUnresolvedEvent(state: GameState): boolean {
  const scheduled = eventPackageForDay(state.day);
  if (scheduled && !state.completedEventIds.includes(scheduled.eventId)) return true;
  if (state.activeEvent && !state.completedEventIds.includes(state.activeEvent.eventId)) return true;
  return false;
}
