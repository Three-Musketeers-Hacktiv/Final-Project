import { eventPackageById } from "./config.mjs";
import { incomeAmountForDay, isBattleDay, isPreparationDay, pendingConsequenceForDay, } from "./calendar.mjs";
import { resolveEventPackage, shiftPlanEntryDay } from "./eventPlan.mjs";
import { toActiveEvent, toConsequenceActiveEvent } from "./activeEvent.mjs";
/**
 * Enter `nextDay` from a preparation advance or post-reward jump.
 * Grants income once for prep days; opens consequence first, else scheduled event;
 * shifts scheduled event forward on collision; battle days become battleReady.
 */
export function enterCalendarDay(state, nextDay) {
    let phase = "preparation";
    let gold = state.gold;
    let activeEvent = null;
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
    const pending = pendingConsequenceForDay({ ...state, day: nextDay, pendingConsequences: state.pendingConsequences }, nextDay);
    if (pending && !state.completedEventIds.includes(pending.id)) {
        const pkg = eventPackageById(pending.packageId);
        if (pkg) {
            phase = "event";
            activeEvent = toConsequenceActiveEvent(pkg, pending, nextDay, "local", state.difficulty);
            // Consequence wins the day: shift any scheduled package forward.
            const occupied = new Set([
                ...eventPlan.map((entry) => entry.day),
                ...state.pendingConsequences.map((entry) => entry.triggerDay),
                nextDay,
            ]);
            if (resolveEventPackage(nextDay, eventPlan)) {
                eventPlan = shiftPlanEntryDay(eventPlan, nextDay, occupied);
            }
        }
    }
    else {
        const pkg = resolveEventPackage(nextDay, eventPlan);
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
export function hasUnresolvedEvent(state) {
    if (state.activeEvent && !state.completedEventIds.includes(state.activeEvent.eventId)) {
        return true;
    }
    const pending = pendingConsequenceForDay(state, state.day);
    if (pending && !state.completedEventIds.includes(pending.id))
        return true;
    const scheduled = resolveEventPackage(state.day, state.eventPlan);
    if (scheduled && !state.completedEventIds.includes(scheduled.eventId))
        return true;
    return false;
}
