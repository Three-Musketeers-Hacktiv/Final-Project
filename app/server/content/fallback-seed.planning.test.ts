import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import { getEngineRulesetMetadata } from "@/server/game-engine/adapter";
import { loadFallbackCatalog } from "../../scripts/lib/fallback-catalog";
import {
  assertSeedRuleset,
  deterministicEventId,
  planFallbackInserts,
  toFallbackEventData,
} from "../../scripts/lib/fallback-seed";

describe("fallback seed planning", () => {
  const { events } = loadFallbackCatalog();

  it("rejects a ruleset that does not match the engine", () => {
    const metadata = getEngineRulesetMetadata();
    expect(() => assertSeedRuleset({
      rulesetId: metadata.rulesetId,
      engineVersion: metadata.engineVersion,
      stateVersion: metadata.stateVersion,
      configFingerprint: "different",
    }, metadata.rulesetId)).toThrow(/not compatible/);
    expect(() => assertSeedRuleset({
      rulesetId: metadata.rulesetId,
      engineVersion: metadata.engineVersion,
      stateVersion: metadata.stateVersion,
      configFingerprint: metadata.configFingerprint,
    }, "other-ruleset")).toThrow(/unexpected ruleset/);
  });

  it("does not plan a second insert for an existing prompt version", () => {
    const first = planFallbackInserts(events, new Set());
    expect(first.insert).toHaveLength(50);
    expect(first.skip).toHaveLength(0);
    const second = planFallbackInserts(events, new Set(events.map((event) => event.seedKey)));
    expect(second.insert).toHaveLength(0);
    expect(second.skip).toHaveLength(50);
  });

  it("builds event_data documents without gameplay fields", () => {
    const rulesetId = new ObjectId();
    const document = toFallbackEventData(events[0]!, rulesetId, new Date("2026-11-10T00:00:00.000Z"));
    expect(document._id).toEqual(deterministicEventId(events[0]!.seedKey));
    expect(document.source).toBe("fallback");
    expect(document.packageId).toBe(events[0]!.packageId);
    expect(document.narrative.choices.map((choice) => choice.id)).toEqual(
      events[0]!.narrative.choices.map((choice) => choice.id),
    );
    expect(document).not.toHaveProperty("provider");
    expect(JSON.stringify(document.narrative)).not.toMatch(/goldCost|effects|consequence/);
  });
});
