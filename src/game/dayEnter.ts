import {
  incomeAmountForDay,
  isBattleDay,
  isPreparationDay,
  pendingConsequenceForDay,
} from "./calendar";
import { planEntryForDay, shiftPlanEntryDay } from "./eventPlan";
import { toActiveEvent, toConsequenceActiveEvent } from "./activeEvent";
import { resolvePackageById, resolveScheduledPackage } from "./packageStore";
import type { GamePhase, GameState } from "./types";

/**
 * Enter `nextDay` from a preparation advance or post-reward jump.
 * Grants income once for prep days; opens consequence first, else scheduled event;
 * shifts scheduled event forward on collision; battle days become battleReady.
 */
export function enterCalendarDay(state: GameState, nextDay: number): GameState {
  let phase: GamePhase = "preparation";
  let gold = state.gold;
  let activeEvent = null as GameState["activeEvent"];
  let eventPlan = state.eventPlan;
  const incomeGrantedDays = [...state.incomeGrantedDays];

  if (isBattleDay(nextDay)) {
    return {
      ...state,
      day: nextDay,
      phase: "battleReady",
      gold,
      incomeGrantedDays,
      actionUsedToday: false,
      activeEvent: null,
      eventPlan,
    };
  }

  if (!isPreparationDay(nextDay)) {
    return {
      ...state,
      day: nextDay,
      phase: "preparation",
      gold,
      incomeGrantedDays,
      actionUsedToday: false,
      activeEvent: null,
      eventPlan,
    };
  }

  if (!incomeGrantedDays.includes(nextDay)) {
    gold += incomeAmountForDay(state, nextDay);
    incomeGrantedDays.push(nextDay);
  }

  const pending = pendingConsequenceForDay(
    { ...state, day: nextDay, pendingConsequences: state.pendingConsequences },
    nextDay,
  );
  if (pending && !state.completedEventIds.includes(pending.id)) {
    const pkg = resolvePackageById(state, pending.packageId);
    if (pkg) {
      phase = "event";
      activeEvent = toConsequenceActiveEvent(
        pkg,
        pending,
        nextDay,
        "local",
        state.difficulty,
      );
      // Consequence wins the day: shift any scheduled package forward.
      const occupied = new Set<number>([
        ...eventPlan.map((entry) => entry.day),
        ...state.pendingConsequences.map((entry) => entry.triggerDay),
        nextDay,
      ]);
      if (planEntryForDay(eventPlan, nextDay)) {
        eventPlan = shiftPlanEntryDay(eventPlan, nextDay, occupied);
      }
    }
  } else {
    const pkg = resolveScheduledPackage({ ...state, eventPlan }, nextDay);
    if (pkg && !state.completedEventIds.includes(pkg.eventId)) {
      phase = "event";
      activeEvent = toActiveEvent(pkg, "local", nextDay, state.difficulty);
    }
  }

  return {
    ...state,
    day: nextDay,
    phase,
    gold,
    incomeGrantedDays,
    actionUsedToday: false,
    activeEvent,
    eventPlan,
  };
}

export function hasUnresolvedEvent(state: GameState): boolean {
  if (state.activeEvent && !state.completedEventIds.includes(state.activeEvent.eventId)) {
    return true;
  }
  const pending = pendingConsequenceForDay(state, state.day);
  if (pending && !state.completedEventIds.includes(pending.id)) return true;
  const scheduled = resolveScheduledPackage(state, state.day);
  if (scheduled && !state.completedEventIds.includes(scheduled.eventId)) return true;
  return false;
}
