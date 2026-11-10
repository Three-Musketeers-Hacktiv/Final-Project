import { eventPackageById } from "./config";
import { validateChoiceList } from "./activeEvent";
import { planEntryForDay } from "./eventPlan";
import type { EventPackage, GameState } from "./types";

type PackageState = Pick<GameState, "eventPlan" | "eventPackageStore">;

export function cloneEventPackage(pkg: EventPackage): EventPackage {
  return JSON.parse(JSON.stringify(pkg)) as EventPackage;
}

/** Store overrides the local catalog for the same packageId. */
export function resolvePackageById(
  state: Pick<GameState, "eventPackageStore">,
  packageId: string,
): EventPackage | undefined {
  const stored = state.eventPackageStore?.[packageId];
  if (stored && stored.packageId === packageId && validateChoiceList(stored)) return stored;
  return eventPackageById(packageId);
}

/** Scheduled package for a plan day, preferring a committed store snapshot. */
export function resolveScheduledPackage(state: PackageState, day: number): EventPackage | undefined {
  const entry = planEntryForDay(state.eventPlan, day);
  if (!entry) return undefined;
  const stored = state.eventPackageStore?.[entry.packageId];
  if (
    stored &&
    stored.packageId === entry.packageId &&
    stored.eventId === entry.eventId &&
    validateChoiceList(stored)
  ) {
    return stored;
  }
  const catalog = eventPackageById(entry.packageId);
  if (!catalog || catalog.packageId !== entry.packageId || catalog.eventId !== entry.eventId) return undefined;
  if (!validateChoiceList(catalog)) return undefined;
  return catalog;
}
