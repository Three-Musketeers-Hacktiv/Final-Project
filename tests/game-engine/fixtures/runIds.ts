import { pickEventPlan, type EventPlanEntry } from "../../../src/game/index";

/** runId stabil. Angka di laporan simulasi harus memakai id yang sama. */
export const RUN = {
  calendar: "qa-calendar",
  economy: "qa-economy",
  battle: "qa-battle",
  event: "qa-event",
  consequence: "qa-consequence",
  reward: "qa-reward",
  victory: "easy-campaign",
  defeat: "qa-defeat",
  shift: "qa-shift",
} as const;

export const SIM_RUNS = ["sim-qa-1", "sim-qa-2", "sim-qa-3"] as const;

/**
 * Cari runId pertama yang jadwal event-nya memenuhi syarat.
 * Pencarian ini hanya membaca `pickEventPlan`, tidak memainkan campaign.
 */
export function findRunId(predicate: (plan: EventPlanEntry[]) => boolean, limit = 400): string {
  for (let index = 0; index < limit; index += 1) {
    const runId = `qa-search-${index}`;
    if (predicate(pickEventPlan(runId))) return runId;
  }
  throw new Error("Tidak menemukan runId untuk syarat event yang diminta");
}
