import { describe, expect, it } from "vitest";

import {
  toBattleDay,
  toEventDay,
  toPersistedNarrativeSource,
} from "./persisted-values";

describe("persisted game value guards", () => {
  it("accepts only scheduled event and battle days", () => {
    expect(toEventDay(3)).toBe(3);
    expect(toEventDay(17)).toBe(17);
    expect(toBattleDay(10)).toBe(10);
    expect(toBattleDay(20)).toBe(20);
    expect(() => toEventDay(4)).toThrow("event day");
    expect(() => toBattleDay(19)).toThrow("battle day");
  });

  it("rejects transient local narrative sources", () => {
    expect(toPersistedNarrativeSource("ai")).toBe("ai");
    expect(toPersistedNarrativeSource("fallback")).toBe("fallback");
    expect(toPersistedNarrativeSource("mock")).toBe("mock");
    expect(() => toPersistedNarrativeSource("local")).toThrow("narrative source");
  });
});
