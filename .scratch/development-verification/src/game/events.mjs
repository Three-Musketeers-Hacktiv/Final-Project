import { eventPackageById, gameConfig } from "./config.mjs";
import { CONSEQUENCE_SUCCESSOR, CONSEQUENCE_TARGET_WAVE } from "./eventPackages.mjs";
import { isBattleDay, isPreparationDay, nextBattleDay, pendingConsequenceForDay, prepSegmentForDay, } from "./calendar.mjs";
import { scaleEventGoldCost } from "./difficulty.mjs";
import { applyEffects } from "./effects.mjs";
import { hashString, planEntryForDay, resolveEventPackage, shiftPlanEntryDay } from "./eventPlan.mjs";
import { scaleChoicesForDifficulty, toActiveEvent, toConsequenceActiveEvent, validateChoiceList, } from "./activeEvent.mjs";
import { fail, isEnded, ok } from "./result.mjs";
export { toActiveEvent } from "./activeEvent.mjs";
function occupiedEventDays(state) {
    return new Set([
        ...state.eventPlan.map((entry) => entry.day),
        ...state.pendingConsequences.map((entry) => entry.triggerDay),
    ]);
}
function freePrepDaysBetween(start, end, occupied) {
    const days = [];
    for (let day = start; day <= end; day += 1) {
        if (!isPreparationDay(day) || isBattleDay(day))
            continue;
        if (occupied.has(day))
            continue;
        days.push(day);
    }
    return days;
}
function sameEventIdentity(a, b) {
    return a.eventId === b.eventId && a.packageId === b.packageId && a.day === b.day;
}
function trustedScheduledPackage(state, event) {
    if (event.day !== state.day)
        return { ok: false, reason: "day" };
    const entry = planEntryForDay(state.eventPlan, event.day);
    if (!entry)
        return { ok: false, reason: "day" };
    if (entry.packageId !== event.packageId || entry.eventId !== event.eventId) {
        return { ok: false, reason: "identity" };
    }
    const pkg = eventPackageById(entry.packageId);
    if (!pkg || pkg.packageId !== entry.packageId || pkg.eventId !== entry.eventId) {
        return { ok: false, reason: "identity" };
    }
    if (!validateChoiceList(pkg))
        return { ok: false, reason: "identity" };
    return { ok: true, pkg, entryEventId: entry.eventId };
}
function trustedConsequencePackage(state, event) {
    if (event.day !== state.day)
        return { ok: false, reason: "day" };
    const pending = state.pendingConsequences.find((entry) => entry.triggerDay === state.day &&
        entry.packageId === event.packageId &&
        entry.id === event.eventId);
    if (!pending)
        return { ok: false, reason: "identity" };
    const pkg = eventPackageById(pending.packageId);
    if (!pkg || !validateChoiceList(pkg))
        return { ok: false, reason: "identity" };
    return { ok: true, pkg, pending };
}
function resolveTrusted(state, event) {
    if (event.isConsequence || state.activeEvent?.isConsequence) {
        const consequence = trustedConsequencePackage(state, event);
        if (consequence.ok) {
            return { ok: true, kind: "consequence", pkg: consequence.pkg, pending: consequence.pending };
        }
        if (event.isConsequence)
            return consequence;
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
export function attachActiveEvent(state, event) {
    if (isEnded(state))
        return fail("GAME_ENDED", "Game has ended");
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
    const completionId = trusted.kind === "scheduled" ? trusted.entryEventId : trusted.pending.id;
    if (state.completedEventIds.includes(completionId) ||
        state.completedEventIds.includes(event.eventId)) {
        return fail("EVENT_ALREADY_RESOLVED", "Event already completed");
    }
    if (state.activeEvent && sameEventIdentity(state.activeEvent, event)) {
        return ok(state);
    }
    if (state.activeEvent)
        return fail("INVALID_PHASE", "Another event is already active");
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
export function ensureLocalEvent(state) {
    if (isEnded(state))
        return fail("GAME_ENDED", "Game has ended");
    const pending = pendingConsequenceForDay(state, state.day);
    if (pending && !state.completedEventIds.includes(pending.id)) {
        if (state.activeEvent?.eventId === pending.id)
            return ok(state);
        const pkg = eventPackageById(pending.packageId);
        if (!pkg)
            return ok(state);
        return attachActiveEvent(state, toConsequenceActiveEvent(pkg, pending, state.day, "local", state.difficulty));
    }
    const pkg = resolveEventPackage(state.day, state.eventPlan);
    if (!pkg || state.completedEventIds.includes(pkg.eventId))
        return ok(state);
    if (state.activeEvent?.eventId === pkg.eventId)
        return ok(state);
    return attachActiveEvent(state, toActiveEvent(pkg, "local", state.day, state.difficulty));
}
/**
 * Free (unoccupied) prep days for a consequence trigger.
 * Prefer the delay window, then the rest of the current segment, then later segments.
 * Never returns an occupied day (no silent same-day collision fallback).
 */
function candidateConsequenceDays(state, fromDay, minDelay, maxDelay) {
    const segment = prepSegmentForDay(fromDay);
    const battle = nextBattleDay(fromDay);
    if (!segment || battle == null)
        return [];
    const occupied = occupiedEventDays(state);
    const delayFree = freePrepDaysBetween(fromDay + minDelay, Math.min(fromDay + maxDelay, battle - 1), occupied);
    if (delayFree.length > 0)
        return delayFree;
    const preferredStart = Math.max(segment.start, fromDay + 1, battle - 3);
    const preferredFree = freePrepDaysBetween(preferredStart, battle - 1, occupied);
    if (preferredFree.length > 0)
        return preferredFree;
    const segmentFree = freePrepDaysBetween(fromDay + 1, battle - 1, occupied);
    if (segmentFree.length > 0)
        return segmentFree;
    // Defer into later prep segments (after the next battle), still collision-free.
    for (const laterBattle of gameConfig.battleDays) {
        if (laterBattle <= battle)
            continue;
        const laterSegment = prepSegmentForDay(laterBattle - 1);
        if (!laterSegment)
            continue;
        const deferred = freePrepDaysBetween(laterSegment.start, laterSegment.end, occupied);
        if (deferred.length > 0)
            return deferred;
    }
    // Soft fallback: any future prep day without a pending (scheduled collision → shift).
    const pendingDays = new Set(state.pendingConsequences.map((entry) => entry.triggerDay));
    const soft = [];
    for (let day = fromDay + 1; day <= gameConfig.lastDay; day += 1) {
        if (!isPreparationDay(day) || isBattleDay(day))
            continue;
        if (pendingDays.has(day))
            continue;
        soft.push(day);
    }
    return soft;
}
function battleDayForWave(wave) {
    return gameConfig.waves.find((entry) => entry.wave === wave)?.day ?? null;
}
/**
 * Keep a wave-locked package only when a prep day still exists before its battle.
 * Otherwise walk the trusted successor map (still a config package, never a new effect).
 */
function resolveConsequencePackage(state, packageId, minDelayDays, maxDelayDays) {
    const seen = new Set();
    let current = packageId;
    while (!seen.has(current)) {
        seen.add(current);
        const candidates = candidateConsequenceDays(state, state.day, minDelayDays, maxDelayDays);
        if (candidates.length === 0)
            return null;
        const targetWave = CONSEQUENCE_TARGET_WAVE[current];
        const deadline = targetWave == null ? null : battleDayForWave(targetWave);
        const beforeTarget = deadline == null ? candidates : candidates.filter((day) => day < deadline);
        if (beforeTarget.length > 0)
            return { packageId: current, candidates: beforeTarget };
        const successor = CONSEQUENCE_SUCCESSOR[current];
        if (!successor || !eventPackageById(successor)) {
            return { packageId: current, candidates };
        }
        current = successor;
    }
    return null;
}
function scheduleConsequence(state, originEventId, originChoiceId, packageId, minDelayDays, maxDelayDays) {
    const resolved = resolveConsequencePackage(state, packageId, minDelayDays, maxDelayDays);
    if (!resolved)
        return null;
    const { candidates } = resolved;
    const resolvedPackageId = resolved.packageId;
    const index = hashString(`${state.runId}:${originChoiceId}:${resolvedPackageId}:trigger`) % candidates.length;
    const triggerDay = candidates[index];
    const pending = {
        id: `${resolvedPackageId}::${originEventId}::${originChoiceId}::${triggerDay}`,
        originEventId,
        originChoiceId,
        packageId: resolvedPackageId,
        triggerDay,
    };
    let eventPlan = state.eventPlan;
    if (resolveEventPackage(triggerDay, eventPlan)) {
        const occupied = new Set([
            ...eventPlan.map((entry) => entry.day),
            ...state.pendingConsequences.map((entry) => entry.triggerDay),
            triggerDay,
        ]);
        eventPlan = shiftPlanEntryDay(eventPlan, triggerDay, occupied);
    }
    return { pending, eventPlan };
}
/**
 * After resolving an event, activate the next mandatory consequence/scheduled event
 * for the current day so callers never need a recovery helper mid-day.
 */
function activateNextMandatoryEvent(state) {
    const pending = pendingConsequenceForDay(state, state.day);
    if (pending) {
        const pkg = eventPackageById(pending.packageId);
        if (pkg) {
            let eventPlan = state.eventPlan;
            if (resolveEventPackage(state.day, eventPlan)) {
                const occupied = new Set([
                    ...eventPlan.map((entry) => entry.day),
                    ...state.pendingConsequences.map((entry) => entry.triggerDay),
                    state.day,
                ]);
                eventPlan = shiftPlanEntryDay(eventPlan, state.day, occupied);
            }
            return {
                phase: "event",
                activeEvent: toConsequenceActiveEvent(pkg, pending, state.day, "local", state.difficulty),
                eventPlan,
            };
        }
    }
    const scheduled = resolveEventPackage(state.day, state.eventPlan);
    if (scheduled && !state.completedEventIds.includes(scheduled.eventId)) {
        return {
            phase: "event",
            activeEvent: toActiveEvent(scheduled, "local", state.day, state.difficulty),
            eventPlan: state.eventPlan,
        };
    }
    return { phase: "preparation", activeEvent: null, eventPlan: state.eventPlan };
}
export function chooseEventOption(state, choiceId) {
    if (isEnded(state))
        return fail("GAME_ENDED", "Game has ended");
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
    const completionId = trusted.kind === "scheduled" ? trusted.entryEventId : trusted.pending.id;
    if (state.completedEventIds.includes(completionId) ||
        state.completedEventIds.includes(event.eventId)) {
        return fail("EVENT_ALREADY_RESOLVED", "Event already completed");
    }
    const choice = trusted.pkg.choices.find((entry) => entry.id === choiceId);
    if (!choice)
        return fail("INVALID_CHOICE", "Choice is not part of the active event");
    const goldCost = scaleEventGoldCost(choice.goldCost, state.difficulty);
    if (state.gold < goldCost)
        return fail("INSUFFICIENT_GOLD", "Not enough gold for this choice");
    const applied = applyEffects(state.effects, choice.effects, {
        gold: state.gold - goldCost,
        cityHp: state.cityHp,
        cityMaxHp: state.cityMaxHp,
    }, { wavesCleared: state.wavesCleared });
    let eventPlan = state.eventPlan;
    let pendingConsequences = state.pendingConsequences;
    if (choice.consequence && trusted.kind === "scheduled") {
        const scheduled = scheduleConsequence(state, event.eventId, choice.id, choice.consequence.packageId, choice.consequence.minDelayDays, choice.consequence.maxDelayDays);
        if (!scheduled) {
            return fail("INVALID_TRANSITION", "No free day available to schedule consequence");
        }
        eventPlan = scheduled.eventPlan;
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
            phase: "gameOver",
            actionUsedToday: state.actionUsedToday,
            revision: state.revision + 1,
        });
    }
    const draft = {
        ...state,
        gold: applied.gold,
        cityHp: applied.cityHp,
        cityMaxHp: applied.cityMaxHp,
        effects: applied.effects,
        activeEvent: null,
        completedEventIds,
        pendingConsequences,
        eventPlan,
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
