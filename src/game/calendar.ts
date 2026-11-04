import { GAME_CONFIG, eventPackageForDay, waveForDay } from "./config";
import type { GamePhase } from "./types";

export function isPreparationDay(day: number): boolean {
  return (
    (day >= 1 && day <= 9) || (day >= 11 && day <= 19)
  );
}

export function isBattleDay(day: number): boolean {
  return waveForDay(day) !== null;
}

export function isEventDay(day: number): boolean {
  return (GAME_CONFIG.eventDays as readonly number[]).includes(day);
}

export function phaseForEnteringDay(
  day: number,
  eventAlreadyDone: boolean,
): GamePhase {
  if (isBattleDay(day)) return "battleReady";
  if (isEventDay(day) && !eventAlreadyDone) return "event";
  return "preparation";
}

export function expectedEventPackageId(day: number): string | null {
  return eventPackageForDay(day)?.id ?? null;
}
