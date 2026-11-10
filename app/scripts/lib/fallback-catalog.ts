import { readFileSync } from "node:fs";
import path from "node:path";

import { generatedEventNarrativeSchema } from "@/server/ai/event-narrative";
import { labelStatesCurrencyAmount } from "../../../src/game/narrative";
import {
  CONSEQUENCE_PACKAGES,
  CONSEQUENCE_SUCCESSOR,
  CONSEQUENCE_TARGET_WAVE,
  SCHEDULED_EVENT_PACKAGES,
} from "../../../src/game/eventPackages";
import { gameConfig, isPreparationDay, nextBattleDay } from "../../../src/game";
import type { EventPackage } from "../../../src/game/types";

export const FALLBACK_CATALOG_VERSION = "fallback-catalog-v3";
export const FALLBACK_RULESET_ID = "campaign-v4-100-day-v3";

export const CATALOG_DIR = path.resolve(
  import.meta.dirname,
  "../../server/content/fallback-events/v1",
);

export type FallbackKind = "scheduled" | "consequence";

export type FallbackEventSource = {
  seedKey: string;
  packageId: string;
  day: number;
  kind: FallbackKind;
  narrative: {
    title: string;
    description: string;
    choices: Array<{ id: string; label: string }>;
  };
};

export type FallbackManifest = {
  catalogVersion: string;
  targetRulesetId: string;
  expected: { scheduled: number; consequence: number; total: number };
  uncoveredScheduledPackages: string[];
  entries: Array<{ seedKey: string; packageId: string; day: number; kind: FallbackKind }>;
  consequenceEdges: Array<{
    scheduledPackageId: string;
    choiceId: string;
    consequencePackageId: string;
  }>;
  successors: Record<string, string>;
};

export const SCHEDULED_SLOTS: Array<{ packageId: string; days: number[] }> = [
  { packageId: "d1-scouts-a", days: [3, 7] },
  { packageId: "d1-envoy-b", days: [4, 8] },
  { packageId: "d1-supplies-a", days: [3, 6] },
  { packageId: "d1-labor-b", days: [5, 9] },
  { packageId: "d2-caravan-a", days: [12, 16] },
  { packageId: "d2-guild-b", days: [13, 17] },
  { packageId: "d2-patrol-a", days: [14, 18] },
  { packageId: "d2-omen-b", days: [12, 15] },
  { packageId: "d3-threat-a", days: [23] },
  { packageId: "d3-market-b", days: [26] },
  { packageId: "d4-threat-a", days: [33] },
  { packageId: "d4-market-b", days: [36] },
  { packageId: "d5-threat-a", days: [43] },
  { packageId: "d5-market-b", days: [46] },
  { packageId: "d6-threat-a", days: [53] },
  { packageId: "d6-market-b", days: [56] },
  { packageId: "d7-threat-a", days: [63] },
  { packageId: "d7-market-b", days: [66] },
  { packageId: "d8-threat-a", days: [73] },
  { packageId: "d9-threat-a", days: [83] },
  { packageId: "d9-market-b", days: [86] },
  { packageId: "d10-threat-a", days: [93] },
];

export const CONSEQUENCE_SLOTS: Array<{ packageId: string; days: number[] }> = [
  { packageId: "c-raid-wave1", days: [5, 8] },
  { packageId: "c-unrest-wave1", days: [4, 7] },
  { packageId: "c-shortage-wave2", days: [14, 17] },
  { packageId: "c-raid-wave2", days: [13, 16] },
  { packageId: "c-raid-mid", days: [35, 45] },
  { packageId: "c-unrest-mid", days: [34, 44] },
  { packageId: "c-raid-late", days: [65, 75] },
  { packageId: "c-unrest-late", days: [64, 74] },
  { packageId: "c-raid-finale", days: [85, 95] },
  { packageId: "c-unrest-finale", days: [84, 94] },
];

const PACKAGES = new Map<string, EventPackage>(
  [...SCHEDULED_EVENT_PACKAGES, ...CONSEQUENCE_PACKAGES].map((pkg) => [pkg.packageId, pkg]),
);

export function seedKeyFor(packageId: string, day: number): string {
  return `${FALLBACK_CATALOG_VERSION}:${packageId}:d${day}:v01`;
}

export function packageById(packageId: string): EventPackage | undefined {
  return PACKAGES.get(packageId);
}

function decadeForPrepDay(day: number): number {
  return Math.floor((day - 1) / 10) + 1;
}

function battleDayForWave(wave: number): number | undefined {
  return gameConfig.waves.find((entry) => entry.wave === wave)?.day;
}

function sameIdSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const ids = new Set(left);
  return right.every((id) => ids.has(id)) && new Set(right).size === right.length;
}

export function validateFallbackCatalog(
  events: FallbackEventSource[],
  manifest: FallbackManifest,
): string[] {
  const errors: string[] = [];
  const expected = [
    ...SCHEDULED_SLOTS.flatMap((slot) =>
      slot.days.map((day) => ({ packageId: slot.packageId, day, kind: "scheduled" as const })),
    ),
    ...CONSEQUENCE_SLOTS.flatMap((slot) =>
      slot.days.map((day) => ({ packageId: slot.packageId, day, kind: "consequence" as const })),
    ),
  ];

  if (events.length !== 50) errors.push(`expected 50 events, got ${events.length}`);
  if (manifest.catalogVersion !== FALLBACK_CATALOG_VERSION) {
    errors.push("manifest catalogVersion mismatch");
  }
  if (manifest.targetRulesetId !== FALLBACK_RULESET_ID) {
    errors.push("manifest targetRulesetId mismatch");
  }
  if (manifest.expected.total !== 50 || manifest.expected.scheduled !== 30 || manifest.expected.consequence !== 20) {
    errors.push("manifest expected counts must be 30 scheduled + 20 consequence");
  }

  const scheduled = events.filter((event) => event.kind === "scheduled");
  const consequence = events.filter((event) => event.kind === "consequence");
  if (scheduled.length !== 30) errors.push(`expected 30 scheduled, got ${scheduled.length}`);
  if (consequence.length !== 20) errors.push(`expected 20 consequence, got ${consequence.length}`);

  const seen = new Set<string>();
  const narratives = new Set<string>();
  for (const event of events) {
    const key = `${event.packageId}:${event.day}`;
    if (seen.has(key)) errors.push(`duplicate package/day ${key}`);
    seen.add(key);
    if (event.seedKey !== seedKeyFor(event.packageId, event.day)) {
      errors.push(`seedKey mismatch for ${key}`);
    }
    const prose = `${event.narrative.title}\n${event.narrative.description}\n${event.narrative.choices.map((c) => c.label).join("\n")}`;
    if (narratives.has(prose)) errors.push(`duplicate narrative text for ${key}`);
    narratives.add(prose);

    const parsed = generatedEventNarrativeSchema.safeParse(event.narrative);
    if (!parsed.success) {
      errors.push(`${key} narrative schema: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    }
    if (!event.narrative.description.includes("my lord") && !event.narrative.description.includes("My lord")) {
      errors.push(`${key} description must address my lord`);
    }
    if (/\d/.test(prose)) errors.push(`${key} narrative must not include digits`);
    const misleading = [
      /no hp loss/i,
      /no further loss/i,
      /lose discount/i,
      /heal then lose/i,
      /heal, then lose/i,
      /save the for/i,
      /defense \+ for/i,
      /%\s*upgrade/i,
    ];
    for (const pattern of misleading) {
      if (pattern.test(prose)) errors.push(`${key} narrative contradicts trusted effects: ${pattern}`);
    }
    for (const choice of event.narrative.choices) {
      if (labelStatesCurrencyAmount(choice.label)) {
        errors.push(`${key} label mentions currency: ${choice.id}`);
      }
    }
    if ("goldCost" in event.narrative || "effects" in event.narrative || "consequence" in event) {
      errors.push(`${key} must not store cost, effects, or consequence`);
    }
    for (const choice of event.narrative.choices) {
      if ("goldCost" in choice || "effects" in choice) {
        errors.push(`${key} choice stores gameplay fields`);
      }
    }

    if (!isPreparationDay(event.day) || (gameConfig.battleDays as readonly number[]).includes(event.day)) {
      errors.push(`${key} is not a preparation day`);
    }

    const pkg = packageById(event.packageId);
    if (!pkg) {
      errors.push(`unknown package ${event.packageId}`);
      continue;
    }
    const engineIds = pkg.choices.map((choice) => choice.id);
    if (!sameIdSet(engineIds, event.narrative.choices.map((choice) => choice.id))) {
      errors.push(`${key} choice ids do not match the engine package`);
    }

    if (event.kind === "scheduled") {
      if (!SCHEDULED_EVENT_PACKAGES.some((entry) => entry.packageId === event.packageId)) {
        errors.push(`${event.packageId} is not a scheduled package`);
      }
      if (pkg.decade !== decadeForPrepDay(event.day)) {
        errors.push(`${key} day is outside package decade ${pkg.decade}`);
      }
    } else {
      if (!CONSEQUENCE_PACKAGES.some((entry) => entry.packageId === event.packageId)) {
        errors.push(`${event.packageId} is not a consequence package`);
      }
      const wave = CONSEQUENCE_TARGET_WAVE[event.packageId];
      const battle = wave == null ? undefined : battleDayForWave(wave);
      if (battle == null || event.day >= battle || nextBattleDay(event.day) == null) {
        errors.push(`${key} is outside the consequence target window`);
      }
    }
  }

  for (const slot of expected) {
    if (!events.some((event) => event.packageId === slot.packageId && event.day === slot.day && event.kind === slot.kind)) {
      errors.push(`missing planned slot ${slot.kind} ${slot.packageId} day ${slot.day}`);
    }
  }
  if (events.length === expected.length && seen.size === expected.length && errors.length === 0) {
    // distribution matches the planned table exactly when every expected slot exists
  }

  const uncovered = SCHEDULED_EVENT_PACKAGES
    .map((pkg) => pkg.packageId)
    .filter((id) => !SCHEDULED_SLOTS.some((slot) => slot.packageId === id));
  const listed = [...manifest.uncoveredScheduledPackages].sort();
  const actual = [...uncovered].sort();
  if (listed.join(",") !== actual.join(",")) {
    errors.push(`uncovered packages mismatch: ${listed.join(",")} vs ${actual.join(",")}`);
  }

  const engineEdges = SCHEDULED_EVENT_PACKAGES.flatMap((pkg) =>
    pkg.choices
      .filter((choice) => choice.consequence)
      .map((choice) => ({
        scheduledPackageId: pkg.packageId,
        choiceId: choice.id,
        consequencePackageId: choice.consequence!.packageId,
      })),
  );
  const edgeKey = (edge: { scheduledPackageId: string; choiceId: string; consequencePackageId: string }) =>
    `${edge.scheduledPackageId}|${edge.choiceId}|${edge.consequencePackageId}`;
  const manifestEdges = new Set(manifest.consequenceEdges.map(edgeKey));
  for (const edge of engineEdges) {
    if (!manifestEdges.has(edgeKey(edge))) errors.push(`manifest missing edge ${edgeKey(edge)}`);
  }
  if (manifest.consequenceEdges.length !== engineEdges.length) {
    errors.push("manifest consequence edge count differs from the engine");
  }

  const successorEntries = Object.entries(CONSEQUENCE_SUCCESSOR).sort(([a], [b]) => a.localeCompare(b));
  const manifestSuccessors = Object.entries(manifest.successors).sort(([a], [b]) => a.localeCompare(b));
  if (JSON.stringify(successorEntries) !== JSON.stringify(manifestSuccessors)) {
    errors.push("manifest successors do not match CONSEQUENCE_SUCCESSOR");
  }

  if (manifest.entries.length !== events.length) errors.push("manifest entry count differs from events");
  for (const entry of manifest.entries) {
    if (!events.some((event) => event.seedKey === entry.seedKey && event.packageId === entry.packageId && event.day === entry.day && event.kind === entry.kind)) {
      errors.push(`manifest entry not in events: ${entry.seedKey}`);
    }
  }

  return errors;
}

export function loadFallbackCatalog(dir = CATALOG_DIR): {
  events: FallbackEventSource[];
  manifest: FallbackManifest;
} {
  const events = JSON.parse(readFileSync(path.join(dir, "events.json"), "utf8")) as FallbackEventSource[];
  const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as FallbackManifest;
  return { events, manifest };
}
