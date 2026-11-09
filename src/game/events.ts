import { eventPackageById } from "./config";
import { applyEffects } from "./effects";
import { planEntryForDay, resolveEventPackage } from "./eventPlan";
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

type EventIdentity = Pick<ActiveEvent, "eventId" | "packageId" | "day">;

function sameEventIdentity(a: EventIdentity, b: EventIdentity): boolean {
  return a.eventId === b.eventId && a.packageId === b.packageId && a.day === b.day;
}

/**
 * Resolve the trusted package only when the event identity matches this run's
 * eventPlan entry and the current calendar day. No pool fallback.
 */
function trustedPlanPackage(
  state: GameState,
  event: EventIdentity,
): { ok: true; pkg: EventPackage; entryEventId: string } | { ok: false; reason: "day" | "identity" } {
  if (event.day !== state.day) return { ok: false, reason: "day" };
  const entry = planEntryForDay(state.eventPlan, event.day);
  if (!entry) return { ok: false, reason: "day" };
  if (entry.packageId !== event.packageId || entry.eventId !== event.eventId) {
    return { ok: false, reason: "identity" };
  }
  const pkg = eventPackageById(entry.packageId);
  if (
    !pkg ||
    pkg.day !== event.day ||
    pkg.packageId !== entry.packageId ||
    pkg.eventId !== entry.eventId
  ) {
    return { ok: false, reason: "identity" };
  }
  return { ok: true, pkg, entryEventId: entry.eventId };
}

export function attachActiveEvent(state: GameState, event: ActiveEvent): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  if (state.phase !== "preparation" && state.phase !== "event") {
    return fail("INVALID_PHASE", "Events can only attach during preparation or event");
  }

  const trusted = trustedPlanPackage(state, event);
  if (!trusted.ok) {
    if (trusted.reason === "day") {
      return fail("INVALID_TRANSITION", "Event day does not match the current day");
    }
    return fail("INVALID_CHOICE", "Event package is not trusted");
  }

  if (
    state.completedEventIds.includes(trusted.entryEventId) ||
    state.completedEventIds.includes(event.eventId)
  ) {
    return fail("EVENT_ALREADY_RESOLVED", "Event already completed");
  }

  if (state.activeEvent && sameEventIdentity(state.activeEvent, event)) {
    return ok(state);
  }
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
  const pkg = resolveEventPackage(state.day, state.eventPlan);
  if (!pkg || state.completedEventIds.includes(pkg.eventId)) return ok(state);
  if (state.activeEvent?.eventId === pkg.eventId) return ok(state);
  return attachActiveEvent(state, toActiveEvent(pkg, "local"));
}

export function chooseEventOption(state: GameState, choiceId: string): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  const event = state.activeEvent;
  if (!event) {
    const scheduled = resolveEventPackage(state.day, state.eventPlan);
    if (scheduled && state.completedEventIds.includes(scheduled.eventId)) {
      return fail("EVENT_ALREADY_RESOLVED", "Event already completed");
    }
    return fail("INVALID_PHASE", "No active event");
  }
  if (state.phase !== "event") {
    return fail("INVALID_PHASE", "Event choice is only allowed in the event phase");
  }
  if (event.day !== state.day) {
    return fail("INVALID_TRANSITION", "Event day does not match the current day");
  }

  const trusted = trustedPlanPackage(state, event);
  if (!trusted.ok) {
    if (trusted.reason === "day") {
      return fail("INVALID_TRANSITION", "Event day does not match the current day");
    }
    return fail("INVALID_CHOICE", "Event package is not trusted");
  }

  if (
    state.completedEventIds.includes(trusted.entryEventId) ||
    state.completedEventIds.includes(event.eventId)
  ) {
    return fail("EVENT_ALREADY_RESOLVED", "Event already completed");
  }

  const choice = trusted.pkg.choices.find((entry) => entry.id === choiceId);
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
