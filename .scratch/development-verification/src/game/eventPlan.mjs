import { eventPackageById, eventPackagesForDecade, gameConfig } from "./config.mjs";
import { isPreparationDay, previousBattleDay } from "./calendar.mjs";
function firstFreePrepDayAfter(fromDay, occupiedDays, startDecade) {
    for (let decade = startDecade; decade <= gameConfig.waves.length; decade += 1) {
        const candidates = prepDaysForDecade(decade).filter((day) => day > fromDay && !occupiedDays.has(day));
        if (candidates.length > 0)
            return candidates[0];
    }
    for (let day = fromDay + 1; day <= gameConfig.lastDay; day += 1) {
        if (!isPreparationDay(day))
            continue;
        if (occupiedDays.has(day))
            continue;
        return day;
    }
    return null;
}
/** Stable non-crypto hash so the same runId always picks the same packages/days. */
export function hashString(input) {
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function prepDaysForDecade(decade) {
    const battle = gameConfig.battleDays[decade - 1];
    if (battle == null)
        return [];
    const prev = previousBattleDay(battle);
    const start = prev == null ? gameConfig.startingDay : prev + 1;
    const end = battle - 1;
    const days = [];
    for (let day = start; day <= end; day += 1) {
        if (!isPreparationDay(day))
            continue;
        if (day === 1)
            continue;
        days.push(day);
    }
    return days;
}
function pickTwoDays(runId, decade, candidates) {
    if (candidates.length === 0)
        return [];
    const preferAvoidLast = candidates.length > 1 ? candidates.slice(0, -1) : candidates;
    const pool = preferAvoidLast.length >= 2 ? preferAvoidLast : candidates;
    const firstIndex = hashString(`${runId}:decade:${decade}:slot:0`) % pool.length;
    const first = pool[firstIndex];
    const remaining = pool.filter((day) => Math.abs(day - first) >= gameConfig.minEventGapDays && day !== first);
    const secondPool = remaining.length > 0 ? remaining : pool.filter((day) => day !== first);
    if (secondPool.length === 0)
        return [first];
    const secondIndex = hashString(`${runId}:decade:${decade}:slot:1`) % secondPool.length;
    const second = secondPool[secondIndex];
    return [first, second].sort((a, b) => a - b);
}
/** Pick event days and packages per decade, seeded by runId. */
export function pickEventPlan(runId) {
    const plan = [];
    for (let decade = 1; decade <= gameConfig.waves.length; decade += 1) {
        const candidates = prepDaysForDecade(decade);
        const days = pickTwoDays(runId, decade, candidates).slice(0, gameConfig.eventsPerDecade);
        const pool = eventPackagesForDecade(decade);
        if (pool.length === 0) {
            throw new Error(`No trusted event packages configured for decade ${decade}`);
        }
        const usedPackageIds = new Set();
        days.forEach((day, slot) => {
            let packageIndex = hashString(`${runId}:event-day:${day}:slot:${slot}`) % pool.length;
            let selected = pool[packageIndex];
            // Prefer unique packages within a decade when pool allows.
            if (usedPackageIds.has(selected.packageId) && pool.length > 1) {
                for (let offset = 1; offset < pool.length; offset += 1) {
                    const candidate = pool[(packageIndex + offset) % pool.length];
                    if (!usedPackageIds.has(candidate.packageId)) {
                        selected = candidate;
                        break;
                    }
                }
            }
            usedPackageIds.add(selected.packageId);
            plan.push({ day, packageId: selected.packageId, eventId: selected.eventId });
        });
    }
    return plan;
}
export function planEntryForDay(plan, day) {
    return plan?.find((entry) => entry.day === day);
}
/** Resolve the trusted scheduled package for a day using the run plan. */
export function resolveEventPackage(day, plan) {
    const entry = planEntryForDay(plan, day);
    if (!entry)
        return undefined;
    return eventPackageById(entry.packageId);
}
/**
 * Shift a plan entry's day forward when a consequence claims the day.
 * Prefers the current decade, then later decades / any free prep day.
 * Never silently deletes the entry; if no free day exists, leaves it unchanged.
 */
export function shiftPlanEntryDay(plan, fromDay, occupiedDays) {
    const entry = planEntryForDay(plan, fromDay);
    if (!entry)
        return plan;
    const decade = gameConfig.waves.find((wave) => wave.day > fromDay)?.wave ??
        gameConfig.waves[gameConfig.waves.length - 1].wave;
    const nextDay = firstFreePrepDayAfter(fromDay, occupiedDays, decade);
    if (nextDay == null)
        return plan;
    return plan.map((item) => (item.day === fromDay ? { ...item, day: nextDay } : item));
}
