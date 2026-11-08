import { eventPackageById, eventPackagesForDay, scheduledEventDays } from "./config";
import type { EventPackage, EventPlanEntry } from "./types";

/** Stable non-crypto hash so the same runId always picks the same packages. */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Pick one trusted package per event day from the pool, seeded by runId. */
export function pickEventPlan(runId: string): EventPlanEntry[] {
  return scheduledEventDays().map((day) => {
    const pool = eventPackagesForDay(day);
    if (pool.length === 0) {
      throw new Error(`No trusted event packages configured for day ${day}`);
    }
    const packageIndex = hashString(`${runId}:event-day:${day}`) % pool.length;
    const selected = pool[packageIndex]!;
    return { day, packageId: selected.packageId, eventId: selected.eventId };
  });
}

export function planEntryForDay(
  plan: EventPlanEntry[] | undefined,
  day: number,
): EventPlanEntry | undefined {
  return plan?.find((entry) => entry.day === day);
}

/** Resolve the trusted package for a day using the run plan when present. */
export function resolveEventPackage(
  day: number,
  plan?: EventPlanEntry[],
): EventPackage | undefined {
  const entry = planEntryForDay(plan, day);
  if (entry) {
    const fromPlan = eventPackageById(entry.packageId);
    if (fromPlan && fromPlan.day === day) return fromPlan;
  }
  return eventPackagesForDay(day)[0];
}
