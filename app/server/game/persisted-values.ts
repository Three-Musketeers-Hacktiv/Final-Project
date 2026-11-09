export const EVENT_DAYS = [3, 7, 13, 17] as const;
export const BATTLE_DAYS = [10, 20] as const;

export type EventDay = (typeof EVENT_DAYS)[number];
export type BattleDay = (typeof BATTLE_DAYS)[number];
export type PersistedNarrativeSource = "ai" | "fallback" | "mock";

export function toEventDay(day: number): EventDay {
  if (!(EVENT_DAYS as readonly number[]).includes(day)) {
    throw new Error(`Cannot persist unsupported event day: ${day}`);
  }
  return day as EventDay;
}

export function toBattleDay(day: number): BattleDay {
  if (!(BATTLE_DAYS as readonly number[]).includes(day)) {
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
