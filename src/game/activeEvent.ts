import { scaleEventGoldCost } from "./difficulty";
import type { ActiveEvent, Difficulty, EventChoice, EventPackage, PendingConsequence } from "./types";

export function validateChoiceList(pkg: EventPackage): boolean {
  const count = pkg.choices.length;
  if (count < 2 || count > 4) return false;
  const ids = new Set(pkg.choices.map((choice) => choice.id));
  if (ids.size !== pkg.choices.length) return false;
  return pkg.choices.some((choice) => choice.goldCost === 0);
}

/** Map trusted package choices into active-event choices with difficulty-scaled goldCost. */
export function scaleChoicesForDifficulty(
  choices: EventChoice[],
  difficulty: Difficulty,
): EventChoice[] {
  return choices.map((choice) => ({
    ...choice,
    effects: [...choice.effects],
    goldCost: scaleEventGoldCost(choice.goldCost, difficulty),
  }));
}

export function toActiveEvent(
  pkg: EventPackage,
  source: ActiveEvent["source"] = "local",
  day?: number,
  difficulty: Difficulty = "normal",
): ActiveEvent {
  return {
    eventId: pkg.eventId,
    packageId: pkg.packageId,
    day: day ?? 0,
    title: pkg.title,
    description: pkg.description,
    choices: scaleChoicesForDifficulty(pkg.choices, difficulty),
    source,
  };
}

export function toConsequenceActiveEvent(
  pkg: EventPackage,
  pending: PendingConsequence,
  day: number,
  source: ActiveEvent["source"] = "local",
  difficulty: Difficulty = "normal",
): ActiveEvent {
  return {
    ...toActiveEvent(pkg, source, day, difficulty),
    eventId: pending.id,
    packageId: pending.packageId,
    isConsequence: true,
    originEventId: pending.originEventId,
    originChoiceId: pending.originChoiceId,
  };
}
