import { gameConfig, isPreparationDay } from "../../../src/game";

export type EventDay = number;
export type BattleDay = number;
export type PersistedNarrativeSource = "ai" | "fallback" | "mock";

export function toEventDay(day: number): EventDay {
  if (!Number.isInteger(day) || !isPreparationDay(day)) {
    throw new Error(`Cannot persist unsupported event day: ${day}`);
  }
  return day as EventDay;
}

export function toBattleDay(day: number): BattleDay {
  if (!Number.isInteger(day) || !(gameConfig.battleDays as readonly number[]).includes(day)) {
    throw new Error(`Cannot persist unsupported battle day: ${day}`);
  }
  return day as BattleDay;
}

export function toPersistedNarrativeSource(source: string): PersistedNarrativeSource {
  if (source !== "ai" && source !== "fallback" && source !== "mock") {
    throw new Error(`Cannot persist unsupported narrative source: ${source}`);
  }
  return source;
}
