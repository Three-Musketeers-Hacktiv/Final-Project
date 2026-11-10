import { describe, expect, it } from "vitest";

import { loadFallbackCatalog, validateFallbackCatalog } from "../../scripts/lib/fallback-catalog";

describe("fallback event catalog", () => {
  const { events, manifest } = loadFallbackCatalog();

  it("matches the engine packages and the planned 30 + 20 distribution", () => {
    expect(validateFallbackCatalog(events, manifest)).toEqual([]);
    expect(events).toHaveLength(50);
    expect(events.filter((event) => event.kind === "scheduled")).toHaveLength(30);
    expect(events.filter((event) => event.kind === "consequence")).toHaveLength(20);
  });

  it("keeps one narrative per package and day", () => {
    const keys = events.map((event) => `${event.packageId}:${event.day}`);
    expect(new Set(keys).size).toBe(50);
  });
});
