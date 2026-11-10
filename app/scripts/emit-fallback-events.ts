import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { CONSEQUENCE_SUCCESSOR, SCHEDULED_EVENT_PACKAGES } from "../../src/game/eventPackages";
import { composeFallbackEvents } from "./lib/compose-fallback-events";
import {
  CATALOG_DIR,
  FALLBACK_CATALOG_VERSION,
  FALLBACK_RULESET_ID,
  SCHEDULED_SLOTS,
  validateFallbackCatalog,
  type FallbackManifest,
} from "./lib/fallback-catalog";

const events = composeFallbackEvents();
const uncovered = SCHEDULED_EVENT_PACKAGES
  .map((pkg) => pkg.packageId)
  .filter((id) => !SCHEDULED_SLOTS.some((slot) => slot.packageId === id))
  .sort();

const manifest: FallbackManifest = {
  catalogVersion: FALLBACK_CATALOG_VERSION,
  targetRulesetId: FALLBACK_RULESET_ID,
  expected: { scheduled: 30, consequence: 20, total: 50 },
  uncoveredScheduledPackages: uncovered,
  entries: events.map((event) => ({
    seedKey: event.seedKey,
    packageId: event.packageId,
    day: event.day,
    kind: event.kind,
  })),
  consequenceEdges: SCHEDULED_EVENT_PACKAGES.flatMap((pkg) =>
    pkg.choices
      .filter((choice) => choice.consequence)
      .map((choice) => ({
        scheduledPackageId: pkg.packageId,
        choiceId: choice.id,
        consequencePackageId: choice.consequence!.packageId,
      })),
  ),
  successors: { ...CONSEQUENCE_SUCCESSOR },
};

const errors = validateFallbackCatalog(events, manifest);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

mkdirSync(CATALOG_DIR, { recursive: true });
writeFileSync(path.join(CATALOG_DIR, "events.json"), `${JSON.stringify(events, null, 2)}\n`);
writeFileSync(path.join(CATALOG_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.info(`Wrote ${events.length} fallback events to ${CATALOG_DIR}`);
