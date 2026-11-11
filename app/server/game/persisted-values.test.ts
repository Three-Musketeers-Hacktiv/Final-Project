import { describe, expect, it } from "vitest";

import {
  toBattleDay,
  toEventDay,
  toPersistedNarrativeSource,
} from "./persisted-values";

describe("persisted game value guards", () => {
  it("accepts v4 preparation event days and configured battle days", () => {
    expect(toEventDay(3)).toBe(3);
    expect(toEventDay(99)).toBe(99);
    expect(toBattleDay(10)).toBe(10);
    expect(toBattleDay(100)).toBe(100);
    expect(() => toEventDay(10)).toThrow("event day");
    expect(() => toEventDay(101)).toThrow("event day");
    expect(() => toBattleDay(19)).toThrow("battle day");
  });

  it("rejects transient local narrative sources", () => {
    expect(toPersistedNarrativeSource("ai")).toBe("ai");
    expect(toPersistedNarrativeSource("fallback")).toBe("fallback");
    expect(toPersistedNarrativeSource("mock")).toBe("mock");
    expect(() => toPersistedNarrativeSource("local")).toThrow("narrative source");
  });
});
