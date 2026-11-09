import { eventPackageById } from "./config";
import {
  isBattleDay,
  isPreparationDay,
  nextBattleDay,
  pendingConsequenceForDay,
  prepSegmentForDay,
} from "./calendar";
import { scaleEventGoldCost } from "./difficulty";
import { applyEffects } from "./effects";
import { hashString, planEntryForDay, resolveEventPackage, shiftPlanEntryDay } from "./eventPlan";
import { toActiveEvent, toConsequenceActiveEvent, validateChoiceList } from "./activeEvent";
import { fail, isEnded, ok } from "./result";
import type {
  ActiveEvent,
  ActionResult,
  EventPackage,
  GameState,
  PendingConsequence,
} from "./types";

export { toActiveEvent } from "./activeEvent";

type EventIdentity = Pick<ActiveEvent, "eventId" | "packageId" | "day"> & {
  isConsequence?: boolean;
};

function sameEventIdentity(a: EventIdentity, b: EventIdentity): boolean {
  return a.eventId === b.eventId && a.packageId === b.packageId && a.day === b.day;
}

function trustedScheduledPackage(
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
  if (!pkg || pkg.packageId !== entry.packageId || pkg.eventId !== entry.eventId) {
    return { ok: false, reason: "identity" };
  }
  if (!validateChoiceList(pkg)) return { ok: false, reason: "identity" };
  return { ok: true, pkg, entryEventId: entry.eventId };
}

function trustedConsequencePackage(
  state: GameState,
  event: EventIdentity,
):
  | { ok: true; pkg: EventPackage; pending: PendingConsequence }
  | { ok: false; reason: "day" | "identity" } {
  if (event.day !== state.day) return { ok: false, reason: "day" };
  const pending = state.pendingConsequences.find(
    (entry) =>
      entry.triggerDay === state.day &&
      entry.packageId === event.packageId &&
      entry.id === event.eventId,
  );
  if (!pending) return { ok: false, reason: "identity" };
  const pkg = eventPackageById(pending.packageId);
  if (!pkg || !validateChoiceList(pkg)) return { ok: false, reason: "identity" };
  return { ok: true, pkg, pending };
}

function resolveTrusted(
  state: GameState,
  event: EventIdentity,
):
  | { ok: true; kind: "scheduled"; pkg: EventPackage; entryEventId: string }
  | { ok: true; kind: "consequence"; pkg: EventPackage; pending: PendingConsequence }
  | { ok: false; reason: "day" | "identity" } {
  if (event.isConsequence || state.activeEvent?.isConsequence) {
    const consequence = trustedConsequencePackage(state, event);
    if (consequence.ok) {
      return { ok: true, kind: "consequence", pkg: consequence.pkg, pending: consequence.pending };
    }
    if (event.isConsequence) return consequence;
  }
  const scheduled = trustedScheduledPackage(state, event);
  if (scheduled.ok) {
    return { ok: true, kind: "scheduled", pkg: scheduled.pkg, entryEventId: scheduled.entryEventId };
  }
  const consequence = trustedConsequencePackage(state, event);
  if (consequence.ok) {
    return { ok: true, kind: "consequence", pkg: consequence.pkg, pending: consequence.pending };
  }
  return scheduled;
}

export function attachActiveEvent(state: GameState, event: ActiveEvent): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  if (state.phase !== "preparation" && state.phase !== "event") {
    return fail("INVALID_PHASE", "Events can only attach during preparation or event");
  }

  const trusted = resolveTrusted(state, event);
  if (!trusted.ok) {
    if (trusted.reason === "day") {
      return fail("INVALID_TRANSITION", "Event day does not match the current day");
    }
    return fail("INVALID_CHOICE", "Event package is not trusted");
  }

  const completionId =
    trusted.kind === "scheduled" ? trusted.entryEventId : trusted.pending.id;
  if (
    state.completedEventIds.includes(completionId) ||
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
    activeEvent: {
      ...event,
      choices: trusted.pkg.choices.map((choice) => ({
        ...choice,
        effects: [...choice.effects],
      })),
      title: event.title || trusted.pkg.title,
      description: event.description || trusted.pkg.description,
      isConsequence: trusted.kind === "consequence" ? true : event.isConsequence,
    },
    revision: state.revision + 1,
  });
}

/** Attach the trusted local package when today has an unfinished scheduled or consequence event. */
export function ensureLocalEvent(state: GameState): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");

  const pending = pendingConsequenceForDay(state, state.day);
  if (pending && !state.completedEventIds.includes(pending.id)) {
    if (state.activeEvent?.eventId === pending.id) return ok(state);
    const pkg = eventPackageById(pending.packageId);
    if (!pkg) return ok(state);
    return attachActiveEvent(state, toConsequenceActiveEvent(pkg, pending, state.day, "local"));
  }

  const pkg = resolveEventPackage(state.day, state.eventPlan);
  if (!pkg || state.completedEventIds.includes(pkg.eventId)) return ok(state);
  if (state.activeEvent?.eventId === pkg.eventId) return ok(state);
  return attachActiveEvent(state, toActiveEvent(pkg, "local", state.day));
}

function candidateConsequenceDays(
  state: GameState,
  fromDay: number,
  minDelay: number,
  maxDelay: number,
): number[] {
  const segment = prepSegmentForDay(fromDay);
  const battle = nextBattleDay(fromDay);
  if (!segment || battle == null) return [];

  const preferredStart = Math.max(segment.start, battle - 3);
  const preferredEnd = battle - 1;
  const preferred: number[] = [];
  for (let day = preferredStart; day <= preferredEnd; day += 1) {
    if (!isPreparationDay(day)) continue;
    if (day <= fromDay) continue;
    preferred.push(day);
  }

  const delayWindow: number[] = [];
  for (let day = fromDay + minDelay; day <= fromDay + maxDelay; day += 1) {
    if (!isPreparationDay(day) || isBattleDay(day)) continue;
    if (day >= battle) continue;
    delayWindow.push(day);
  }

  const pool = preferred.length > 0 ? preferred : delayWindow;
  const scheduledDays = new Set(state.eventPlan.map((entry) => entry.day));
  const pendingDays = new Set(state.pendingConsequences.map((entry) => entry.triggerDay));
  const free = pool.filter((day) => !scheduledDays.has(day) && !pendingDays.has(day));
  return free.length > 0 ? free : pool;
}

function scheduleConsequence(
  state: GameState,
  originEventId: string,
  originChoiceId: string,
  packageId: string,
  minDelayDays: number,
  maxDelayDays: number,
): { pending: PendingConsequence; eventPlan: GameState["eventPlan"] } | null {
  const candidates = candidateConsequenceDays(state, state.day, minDelayDays, maxDelayDays);
  if (candidates.length === 0) return null;
  const index =
    hashString(`${state.runId}:${originChoiceId}:${packageId}:trigger`) % candidates.length;
  const triggerDay = candidates[index]!;
  const pending: PendingConsequence = {
    id: `${packageId}::${originEventId}::${originChoiceId}::${triggerDay}`,
    originEventId,
    originChoiceId,
    packageId,
    triggerDay,
  };

  let eventPlan = state.eventPlan;
  if (resolveEventPackage(triggerDay, eventPlan)) {
    const occupied = new Set<number>([
      ...eventPlan.map((entry) => entry.day),
      ...state.pendingConsequences.map((entry) => entry.triggerDay),
      triggerDay,
    ]);
    eventPlan = shiftPlanEntryDay(eventPlan, triggerDay, occupied);
  }

  return { pending, eventPlan };
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

  const trusted = resolveTrusted(state, event);
  if (!trusted.ok) {
    if (trusted.reason === "day") {
      return fail("INVALID_TRANSITION", "Event day does not match the current day");
    }
    return fail("INVALID_CHOICE", "Event package is not trusted");
  }

  const completionId =
    trusted.kind === "scheduled" ? trusted.entryEventId : trusted.pending.id;
  if (
    state.completedEventIds.includes(completionId) ||
    state.completedEventIds.includes(event.eventId)
  ) {
    return fail("EVENT_ALREADY_RESOLVED", "Event already completed");
  }

  const choice = trusted.pkg.choices.find((entry) => entry.id === choiceId);
  if (!choice) return fail("INVALID_CHOICE", "Choice is not part of the active event");
  const goldCost = scaleEventGoldCost(choice.goldCost, state.difficulty);
  if (state.gold < goldCost) return fail("INSUFFICIENT_GOLD", "Not enough gold for this choice");

  const applied = applyEffects(state.effects, choice.effects, {
    gold: state.gold - goldCost,
    cityHp: state.cityHp,
    cityMaxHp: state.cityMaxHp,
  });

  let eventPlan = state.eventPlan;
  let pendingConsequences = state.pendingConsequences;
  if (choice.consequence && trusted.kind === "scheduled") {
    const scheduled = scheduleConsequence(
      state,
      event.eventId,
      choice.id,
      choice.consequence.packageId,
      choice.consequence.minDelayDays,
      choice.consequence.maxDelayDays,
    );
    if (scheduled) {
      eventPlan = scheduled.eventPlan;
      pendingConsequences = [...pendingConsequences, scheduled.pending];
    }
  }

  if (trusted.kind === "consequence") {
    pendingConsequences = pendingConsequences.filter((entry) => entry.id !== trusted.pending.id);
  }

  const dead = applied.cityHp <= 0;
  return ok({
    ...state,
    gold: applied.gold,
    cityHp: applied.cityHp,
    cityMaxHp: applied.cityMaxHp,
    effects: applied.effects,
    activeEvent: null,
    completedEventIds: [...state.completedEventIds, completionId],
    pendingConsequences,
    eventPlan,
    phase: dead ? "gameOver" : "preparation",
    actionUsedToday: state.actionUsedToday,
    revision: state.revision + 1,
  });
}
