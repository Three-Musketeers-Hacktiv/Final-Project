import { describe, expect, it } from "vitest";

import { applyGameAction, createGameState, getEngineCompatibility, getEngineRulesetMetadata } from "./adapter";

describe("game engine adapter", () => {
  it("reports the committed engine compatibility", () => {
    expect(getEngineCompatibility()).toEqual({
      stateVersion: 3,
      lastDay: 20,
      battleDays: [10, 20],
    });
  });

  it("fingerprints the engine-owned ruleset", () => {
    const metadata = getEngineRulesetMetadata();
    expect(metadata.rulesetId).toBe("prototype-v3");
    expect(metadata.stateVersion).toBe(3);
    expect(metadata.configFingerprint).toMatch(/^[a-f\d]{64}$/);
  });

  it("delegates an upgrade without recalculating its result", () => {
    const state = createGameState("run-test");
    const result = applyGameAction(state, { type: "upgradeTroops", payload: {} });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.revision).toBe(1);
    expect(result.state.troopLevel).toBe(1);
    expect(result.state.gold).toBeLessThan(state.gold);
  });

  it("passes engine domain errors through unchanged", () => {
    const state = createGameState("run-test");
    const first = applyGameAction(state, { type: "upgradeWall", payload: {} });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = applyGameAction(first.state, { type: "upgradeWall", payload: {} });

    expect(second).toEqual({
      ok: false,
      error: { code: "NO_ACTION_LEFT", message: "Daily economic action already used" },
    });
  });
});
