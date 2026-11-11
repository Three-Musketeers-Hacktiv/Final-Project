import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import type { NarrativeResult } from "@/server/ai/event-narrative";
import { selectSharedNarrative } from "@/server/game/narrative-catalog";
import type { EventDataDocument } from "@/server/game/types";
import { eventPackageById } from "../../../src/game";

function eventFor(packageId: string) {
  const pkg = eventPackageById(packageId);
  if (!pkg) throw new Error(packageId);
  return {
    eventId: pkg.eventId,
    packageId: pkg.packageId,
    day: 3,
    title: pkg.title,
    description: pkg.description,
    choices: pkg.choices,
    source: "local" as const,
  };
}

function doc(
  source: "ai" | "fallback",
  narrative: EventDataDocument["narrative"],
  promptVersion: string,
): EventDataDocument {
  return {
    _id: new ObjectId(),
    gameRulesetId: new ObjectId(),
    packageId: "d1-scouts-a",
    day: 3,
    narrative,
    source,
    promptVersion,
    schemaVersion: 1,
    validationStatus: "valid",
    createdAt: new Date(),
  };
}

const local: NarrativeResult = {
  narrative: {
    title: "Local",
    description: "Local copy",
    choices: eventFor("d1-scouts-a").choices.map((choice) => ({ id: choice.id, label: choice.label })),
  },
  source: "fallback",
  provider: null,
  model: null,
  promptVersion: "local",
};

describe("selectSharedNarrative", () => {
  const event = eventFor("d1-scouts-a");
  const trusted = {
    title: "Shared counsel",
    description: "My lord, the gate still waits.",
    choices: event.choices.map((choice) => ({ id: choice.id, label: `Counsel ${choice.id}` })),
  };

  it("ignores a shared AI row and uses the seeded fallback", () => {
    const ai = doc("ai", trusted, "ai-row");
    const fallback = doc("fallback", { ...trusted, title: "Seeded" }, "fallback-catalog-v2:d1-scouts-a:d3:v01");
    const selected = selectSharedNarrative({
      local,
      event,
      aiCandidates: [ai],
      fallbackCandidates: [fallback],
    });
    expect(selected.reused?._id).toEqual(fallback._id);
    expect(selected.result.source).toBe("fallback");
    expect(selected.result.narrative.title).toBe("Seeded");
  });

  it("prefers a v3 seeded row over v2 and older rows", () => {
    const older = doc("fallback", { ...trusted, title: "Old seed" }, "fallback-catalog-v1:d1-scouts-a:d3:v01");
    const previous = doc("fallback", { ...trusted, title: "Scene seed" }, "fallback-catalog-v2:d1-scouts-a:d3:v01");
    const current = doc("fallback", { ...trusted, title: "Current scene" }, "fallback-catalog-v3:d1-scouts-a:d3:v01");
    const selected = selectSharedNarrative({
      local,
      event,
      fallbackCandidates: [older, previous, current],
    });
    expect(selected.result.narrative.title).toBe("Current scene");
    expect(selected.result.promptVersion.startsWith("fallback-catalog-v3")).toBe(true);
  });

  it("uses seeded fallback when AI catalog is missing", () => {
    const fallback = doc("fallback", { ...trusted, title: "Seeded counsel" }, "fallback-catalog-v1:d1-scouts-a:d3:v01");
    const selected = selectSharedNarrative({
      local,
      event,
      aiCandidates: [],
      fallbackCandidates: [fallback],
    });
    expect(selected.result.source).toBe("fallback");
    expect(selected.result.narrative.title).toBe("Seeded counsel");
    expect(selected.result.promptVersion).toBe(fallback.promptVersion);
  });

  it("skips an invalid AI row and continues to seeded fallback", () => {
    const broken = doc("ai", {
      title: "Broken",
      description: "Broken",
      choices: event.choices.map(() => ({ id: "forged", label: "Nope" })),
    }, "bad-ai");
    const fallback = doc("fallback", { ...trusted, title: "Recovered" }, "good-fallback");
    const selected = selectSharedNarrative({
      local,
      event,
      aiCandidates: [broken],
      fallbackCandidates: [fallback],
    });
    expect(selected.result.narrative.title).toBe("Recovered");
    expect(selected.result.source).toBe("fallback");
  });

  it("keeps the local engine narrative when every catalog row is unusable", () => {
    const broken = doc("fallback", {
      title: "Broken",
      description: "Broken",
      choices: [{ id: "nope", label: "Nope" }, { id: "also", label: "Also" }],
    }, "bad-fallback");
    const selected = selectSharedNarrative({
      local,
      event,
      aiCandidates: [],
      fallbackCandidates: [broken],
    });
    expect(selected.reused).toBeNull();
    expect(selected.result.narrative.title).toBe("Local");
  });
});
