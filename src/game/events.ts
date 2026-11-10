import { eventPackageById, gameConfig } from "./config";
import { CONSEQUENCE_SUCCESSOR, CONSEQUENCE_TARGET_WAVE } from "./eventPackages";
import {
  isBattleDay,
  isPreparationDay,
  nextBattleDay,
  pendingConsequenceForDay,
  prepSegmentForDay,
} from "./calendar";
import { scaleEventGoldCost } from "./difficulty";
import { applyEffects } from "./effects";
import { hashString, planEntryForDay, shiftPlanEntryDay } from "./eventPlan";
import {
  scaleChoicesForDifficulty,
  materializeChoiceLabel,
  toActiveEvent,
  toConsequenceActiveEvent,
  validateChoiceList,
} from "./activeEvent";
import { trustedChoiceLabel } from "./narrative";
import { cloneEventPackage, resolvePackageById, resolveScheduledPackage } from "./packageStore";
import { validateEventPackage } from "./packageValidation";
import { fail, isEnded, ok } from "./result";
import type {
  ActiveEvent,
  ActionResult,
  ChoiceConsequence,
  EventPackage,
  GameState,
  PendingConsequence,
} from "./types";

export { toActiveEvent } from "./activeEvent";

function occupiedEventDays(state: GameState): Set<number> {
  return new Set([
    ...state.eventPlan.map((entry) => entry.day),
    ...state.pendingConsequences.map((entry) => entry.triggerDay),
  ]);
}

function freePrepDaysBetween(
  start: number,
  end: number,
  occupied: Set<number>,
): number[] {
  const days: number[] = [];
  for (let day = start; day <= end; day += 1) {
    if (!isPreparationDay(day) || isBattleDay(day)) continue;
    if (occupied.has(day)) continue;
    days.push(day);
  }
  return days;
}

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
  const pkg = resolveScheduledPackage(state, event.day);
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
  const pkg = resolvePackageById(state, pending.packageId);
  if (!pkg || pkg.packageId !== pending.packageId || !validateChoiceList(pkg)) {
    return { ok: false, reason: "identity" };
  }
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
      choices: scaleChoicesForDifficulty(trusted.pkg.choices, state.difficulty),
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
    const pkg = resolvePackageById(state, pending.packageId);
    if (!pkg) return ok(state);
    return attachActiveEvent(
      state,
      toConsequenceActiveEvent(pkg, pending, state.day, "local", state.difficulty),
    );
  }

  const pkg = resolveScheduledPackage(state, state.day);
  if (!pkg || state.completedEventIds.includes(pkg.eventId)) return ok(state);
  if (state.activeEvent?.eventId === pkg.eventId) return ok(state);
  return attachActiveEvent(state, toActiveEvent(pkg, "local", state.day, state.difficulty));
}

/**
 * Free (unoccupied) prep days for a consequence trigger.
 * Prefer the delay window, then the rest of the current segment, then later segments.
 * Never returns an occupied day (no silent same-day collision fallback).
 */
function candidateConsequenceDays(
  state: GameState,
  fromDay: number,
  minDelay: number,
  maxDelay: number,
): number[] {
  const segment = prepSegmentForDay(fromDay);
  const battle = nextBattleDay(fromDay);
  if (!segment || battle == null) return [];
  const occupied = occupiedEventDays(state);

  const delayFree = freePrepDaysBetween(
    fromDay + minDelay,
    Math.min(fromDay + maxDelay, battle - 1),
    occupied,
  );
  if (delayFree.length > 0) return delayFree;

  const preferredStart = Math.max(segment.start, fromDay + 1, battle - 3);
  const preferredFree = freePrepDaysBetween(preferredStart, battle - 1, occupied);
  if (preferredFree.length > 0) return preferredFree;

  const segmentFree = freePrepDaysBetween(fromDay + 1, battle - 1, occupied);
  if (segmentFree.length > 0) return segmentFree;

  // Defer into later prep segments (after the next battle), still collision-free.
  for (const laterBattle of gameConfig.battleDays) {
    if (laterBattle <= battle) continue;
    const laterSegment = prepSegmentForDay(laterBattle - 1);
    if (!laterSegment) continue;
    const deferred = freePrepDaysBetween(laterSegment.start, laterSegment.end, occupied);
    if (deferred.length > 0) return deferred;
  }

  // Soft fallback: any future prep day without a pending (scheduled collision → shift).
  const pendingDays = new Set(state.pendingConsequences.map((entry) => entry.triggerDay));
  const soft: number[] = [];
  for (let day = fromDay + 1; day <= gameConfig.lastDay; day += 1) {
    if (!isPreparationDay(day) || isBattleDay(day)) continue;
    if (pendingDays.has(day)) continue;
    soft.push(day);
  }
  return soft;
}

function battleDayForWave(wave: number): number | null {
  return gameConfig.waves.find((entry) => entry.wave === wave)?.day ?? null;
}

/**
 * Keep a wave-locked package only when a prep day still exists before its battle.
 * Otherwise walk the trusted successor map (still a config package, never a new effect).
 */
function resolveConsequencePackage(
  state: GameState,
  packageId: string,
  minDelayDays: number,
  maxDelayDays: number,
): { packageId: string; candidates: number[] } | null {
  const seen = new Set<string>();
  let current = packageId;
  while (!seen.has(current)) {
    seen.add(current);
    const candidates = candidateConsequenceDays(state, state.day, minDelayDays, maxDelayDays);
    if (candidates.length === 0) return null;
    const targetWave = CONSEQUENCE_TARGET_WAVE[current];
    const deadline = targetWave == null ? null : battleDayForWave(targetWave);
    const beforeTarget =
      deadline == null ? candidates : candidates.filter((day) => day < deadline);
    if (beforeTarget.length > 0) return { packageId: current, candidates: beforeTarget };
    const successor = CONSEQUENCE_SUCCESSOR[current];
    if (!successor || !eventPackageById(successor)) {
      return { packageId: current, candidates };
    }
    current = successor;
  }
  return null;
}

function shiftPlanIfOccupied(
  eventPlan: GameState["eventPlan"],
  pendingConsequences: PendingConsequence[],
  triggerDay: number,
): GameState["eventPlan"] {
  if (!planEntryForDay(eventPlan, triggerDay)) return eventPlan;
  const occupied = new Set<number>([
    ...eventPlan.map((entry) => entry.day),
    ...pendingConsequences.map((entry) => entry.triggerDay),
    triggerDay,
  ]);
  return shiftPlanEntryDay(eventPlan, triggerDay, occupied);
}

function dynamicConsequenceDays(
  state: GameState,
  consequence: ChoiceConsequence,
): number[] | null {
  const candidates = candidateConsequenceDays(
    state,
    state.day,
    consequence.minDelayDays,
    consequence.maxDelayDays,
  );
  if (candidates.length === 0) return null;
  if (consequence.targetWave == null) return candidates;
  const deadline = battleDayForWave(consequence.targetWave);
  if (deadline == null || state.day >= deadline) return null;
  const beforeTarget = candidates.filter((day) => day < deadline);
  return beforeTarget.length > 0 ? beforeTarget : null;
}

function scheduleConsequence(
  state: GameState,
  originEventId: string,
  originChoiceId: string,
  consequence: ChoiceConsequence,
): {
  pending: PendingConsequence;
  eventPlan: GameState["eventPlan"];
  eventPackageStore: GameState["eventPackageStore"];
} | null {
  const inline = consequence.fallbackPackage;
  let resolvedPackageId = consequence.packageId;
  let candidates: number[] | null;
  let eventPackageStore = state.eventPackageStore;
  if (inline) {
    if (inline.packageId !== consequence.packageId) return null;
    candidates = dynamicConsequenceDays(state, consequence);
    if (!candidates) return null;
    eventPackageStore = {
      ...eventPackageStore,
      [inline.packageId]: cloneEventPackage(inline),
    };
  } else {
    const resolved = resolveConsequencePackage(
      state,
      consequence.packageId,
      consequence.minDelayDays,
      consequence.maxDelayDays,
    );
    if (!resolved) return null;
    resolvedPackageId = resolved.packageId;
    candidates = resolved.candidates;
  }
  const index =
    hashString(`${state.runId}:${originChoiceId}:${resolvedPackageId}:trigger`) % candidates.length;
  const triggerDay = candidates[index]!;
  const pending: PendingConsequence = {
    id: `${resolvedPackageId}::${originEventId}::${originChoiceId}::${triggerDay}`,
    originEventId,
    originChoiceId,
    packageId: resolvedPackageId,
    triggerDay,
  };
  return {
    pending,
    eventPlan: shiftPlanIfOccupied(state.eventPlan, state.pendingConsequences, triggerDay),
    eventPackageStore,
  };
}

/**
 * After resolving an event, activate the next mandatory consequence/scheduled event
 * for the current day so callers never need a recovery helper mid-day.
 */
function activateNextMandatoryEvent(state: GameState): {
  phase: GameState["phase"];
  activeEvent: GameState["activeEvent"];
  eventPlan: GameState["eventPlan"];
} {
  const pending = pendingConsequenceForDay(state, state.day);
  if (pending) {
    const pkg = resolvePackageById(state, pending.packageId);
    if (pkg) {
      let eventPlan = state.eventPlan;
      if (planEntryForDay(eventPlan, state.day)) {
        const occupied = new Set<number>([
          ...eventPlan.map((entry) => entry.day),
          ...state.pendingConsequences.map((entry) => entry.triggerDay),
          state.day,
        ]);
        eventPlan = shiftPlanEntryDay(eventPlan, state.day, occupied);
      }
      return {
        phase: "event",
        activeEvent: toConsequenceActiveEvent(
          pkg,
          pending,
          state.day,
          "local",
          state.difficulty,
        ),
        eventPlan,
      };
    }
  }

  const scheduled = resolveScheduledPackage(state, state.day);
  if (scheduled && !state.completedEventIds.includes(scheduled.eventId)) {
    return {
      phase: "event",
      activeEvent: toActiveEvent(scheduled, "local", state.day, state.difficulty),
      eventPlan: state.eventPlan,
    };
  }

  return { phase: "preparation", activeEvent: null, eventPlan: state.eventPlan };
}

function storePackage(
  store: GameState["eventPackageStore"],
  pkg: EventPackage,
): NonNullable<GameState["eventPackageStore"]> {
  const next: NonNullable<GameState["eventPackageStore"]> = { ...store, [pkg.packageId]: cloneEventPackage(pkg) };
  for (const choice of pkg.choices) {
    const fallback = choice.consequence?.fallbackPackage;
    if (fallback) next[fallback.packageId] = cloneEventPackage(fallback);
  }
  return next;
}

/**
 * Bind a validated package to the active slot without applying effects or advancing revision.
 * AI packages may replace the plan packageId. Catalog fallback keeps the local mechanics.
 */
export function installCommittedPackage(
  state: GameState,
  rawPackage: EventPackage,
  source: ActiveEvent["source"],
  options?: { restore?: boolean },
): ActionResult {
  const event = state.activeEvent;
  if (!event || state.phase !== "event" || event.day !== state.day) {
    return fail("INVALID_PHASE", "A committed package requires the active event");
  }

  if (source !== "ai") {
    const entry = planEntryForDay(state.eventPlan, state.day);
    const catalogId = event.isConsequence ? event.packageId : entry?.packageId;
    const catalog = catalogId ? eventPackageById(catalogId) : undefined;
    const base = catalog ?? resolvePackageById(state, event.packageId);
    if (!base || !validateChoiceList(base)) {
      return fail("INVALID_CHOICE", "Event package is not trusted");
    }
    const choices = scaleChoicesForDifficulty(base.choices, state.difficulty).map((choice) => {
      const overlay = rawPackage.choices.find((candidate) => candidate.id === choice.id);
      const baseChoice = base.choices.find((candidate) => candidate.id === choice.id);
      const label = materializeChoiceLabel(
        trustedChoiceLabel(baseChoice?.label ?? choice.label, overlay?.label, baseChoice?.goldCost ?? choice.goldCost),
        choice.goldCost,
      );
      return { ...choice, label };
    });
    const activeEvent: ActiveEvent = event.isConsequence
      ? { ...event, title: rawPackage.title || base.title, description: rawPackage.description || base.description, source, choices }
      : { ...toActiveEvent(base, source, state.day, state.difficulty), title: rawPackage.title || base.title, description: rawPackage.description || base.description, choices };
    return ok({
      ...state,
      eventPackageStore: storePackage(state.eventPackageStore, base),
      activeEvent,
    });
  }

  const validated = validateEventPackage(rawPackage, {
    day: state.day,
    wavesCleared: state.wavesCleared,
    allowConsequence: !event.isConsequence,
    checkDominance: options?.restore ? false : true,
    enforceWaveTiming: options?.restore ? false : true,
    enforceDecade: options?.restore ? false : true,
  });
  if (!validated.ok) return fail("INVALID_CHOICE", validated.message);

  if (!event.isConsequence) {
    const entry = planEntryForDay(state.eventPlan, state.day);
    if (!entry || entry.eventId !== event.eventId) {
      return fail("INVALID_CHOICE", "Event package is not trusted");
    }
    const bound = cloneEventPackage({ ...validated.pkg, eventId: entry.eventId });
    const eventPlan = state.eventPlan.map((row) =>
      row.eventId === entry.eventId ? { ...row, packageId: bound.packageId } : row,
    );
    return ok({
      ...state,
      eventPlan,
      eventPackageStore: storePackage(state.eventPackageStore, bound),
      activeEvent: toActiveEvent(bound, source, state.day, state.difficulty),
    });
  }

  const pending = state.pendingConsequences.find((row) => row.id === event.eventId);
  if (!pending || pending.triggerDay !== state.day) {
    return fail("INVALID_CHOICE", "Event package is not trusted");
  }
  const rebound: PendingConsequence = {
    ...pending,
    packageId: validated.pkg.packageId,
    id: `${validated.pkg.packageId}::${pending.originEventId}::${pending.originChoiceId}::${pending.triggerDay}`,
  };
  const stored = cloneEventPackage({ ...validated.pkg, eventId: rebound.id, packageId: rebound.packageId });
  return ok({
    ...state,
    pendingConsequences: state.pendingConsequences.map((row) => (row.id === pending.id ? rebound : row)),
    eventPackageStore: storePackage(state.eventPackageStore, stored),
    activeEvent: toConsequenceActiveEvent(stored, rebound, state.day, source, state.difficulty),
  });
}

export function chooseEventOption(state: GameState, choiceId: string): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  const event = state.activeEvent;
  if (!event) {
    const scheduled = resolveScheduledPackage(state, state.day);
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

  const applied = applyEffects(
    state.effects,
    choice.effects,
    {
      gold: state.gold - goldCost,
      cityHp: state.cityHp,
      cityMaxHp: state.cityMaxHp,
    },
    { wavesCleared: state.wavesCleared },
  );

  let eventPlan = state.eventPlan;
  let pendingConsequences = state.pendingConsequences;
  let eventPackageStore = state.eventPackageStore;
  if (choice.consequence && trusted.kind === "scheduled") {
    const scheduled = scheduleConsequence(state, event.eventId, choice.id, choice.consequence);
    if (!scheduled) {
      return fail("INVALID_TRANSITION", "No free day available to schedule consequence");
    }
    eventPlan = scheduled.eventPlan;
    eventPackageStore = scheduled.eventPackageStore;
    pendingConsequences = [...pendingConsequences, scheduled.pending];
  }

  if (trusted.kind === "consequence") {
    pendingConsequences = pendingConsequences.filter((entry) => entry.id !== trusted.pending.id);
  }

  const dead = applied.cityHp <= 0;
  const completedEventIds = [...state.completedEventIds, completionId];
  if (dead) {
    return ok({
      ...state,
      gold: applied.gold,
      cityHp: applied.cityHp,
      cityMaxHp: applied.cityMaxHp,
      effects: applied.effects,
      activeEvent: null,
      completedEventIds,
      pendingConsequences,
      eventPlan,
      eventPackageStore,
      phase: "gameOver",
      actionUsedToday: state.actionUsedToday,
      revision: state.revision + 1,
    });
  }

  const draft: GameState = {
    ...state,
    gold: applied.gold,
    cityHp: applied.cityHp,
    cityMaxHp: applied.cityMaxHp,
    effects: applied.effects,
    activeEvent: null,
    completedEventIds,
    pendingConsequences,
    eventPlan,
    eventPackageStore,
    phase: "preparation",
    actionUsedToday: state.actionUsedToday,
  };
  const next = activateNextMandatoryEvent(draft);
  return ok({
    ...draft,
    ...next,
    revision: state.revision + 1,
  });
}
