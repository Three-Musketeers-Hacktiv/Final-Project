import { eventPackageForDay } from "./config";
import { applyEffects } from "./effects";
import { fail, isEnded, ok } from "./result";
import type { ActiveEvent, ActionResult, EventPackage, GameState } from "./types";

export function toActiveEvent(pkg: EventPackage, source: ActiveEvent["source"] = "local"): ActiveEvent {
  return {
    eventId: pkg.eventId,
    packageId: pkg.packageId,
    day: pkg.day,
    title: pkg.title,
    description: pkg.description,
    choices: pkg.choices,
    source,
  };
}

export function attachActiveEvent(state: GameState, event: ActiveEvent): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  if (state.completedEventIds.includes(event.eventId)) {
    return fail("EVENT_ALREADY_RESOLVED", "Event already completed");
  }
  if (event.day !== state.day) return fail("INVALID_TRANSITION", "Event day does not match the current day");
  if (state.activeEvent?.eventId === event.eventId) return ok(state);
  if (state.activeEvent) return fail("INVALID_PHASE", "Another event is already active");
  return ok({
    ...state,
    phase: "event",
    activeEvent: event,
    revision: state.revision + 1,
  });
}

/** Attach the trusted local package when today has an unfinished scheduled event. */
export function ensureLocalEvent(state: GameState): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  const pkg = eventPackageForDay(state.day);
  if (!pkg || state.completedEventIds.includes(pkg.eventId)) return ok(state);
  if (state.activeEvent?.eventId === pkg.eventId) return ok(state);
  return attachActiveEvent(state, toActiveEvent(pkg, "local"));
}

export function chooseEventOption(state: GameState, choiceId: string): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  const event = state.activeEvent;
  if (!event) {
    if (state.completedEventIds.some((id) => eventPackageForDay(state.day)?.eventId === id)) {
      return fail("EVENT_ALREADY_RESOLVED", "Event already completed");
    }
    return fail("INVALID_PHASE", "No active event");
  }
  if (state.completedEventIds.includes(event.eventId)) {
    return fail("EVENT_ALREADY_RESOLVED", "Event already completed");
  }
  const trusted = eventPackageForDay(event.day);
  if (!trusted || trusted.packageId !== event.packageId) {
    return fail("INVALID_CHOICE", "Event package is not trusted");
  }
  const choice = trusted.choices.find((entry) => entry.id === choiceId);
  if (!choice) return fail("INVALID_CHOICE", "Choice is not part of the active event");
  if (state.gold < choice.goldCost) return fail("INSUFFICIENT_GOLD", "Not enough gold for this choice");

  const applied = applyEffects(state.effects, choice.effects, {
    gold: state.gold - choice.goldCost,
    cityHp: state.cityHp,
  });
  const dead = applied.cityHp <= 0;
  return ok({
    ...state,
    gold: applied.gold,
    cityHp: applied.cityHp,
    effects: applied.effects,
    activeEvent: null,
    completedEventIds: [...state.completedEventIds, event.eventId],
    phase: dead ? "gameOver" : "preparation",
    actionUsedToday: state.actionUsedToday,
    revision: state.revision + 1,
  });
}
