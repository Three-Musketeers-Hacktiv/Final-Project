import { describe, expect, it } from "vitest";

import {
  applyGameAction,
  assertPatchedGameState,
  createGameState,
  getEngineCompatibility,
  getEngineRulesetMetadata,
} from "./adapter";

describe("game engine adapter", () => {
  it("reports the committed engine compatibility", () => {
    expect(getEngineCompatibility()).toEqual({
      stateVersion: 4,
      lastDay: 100,
      battleDays: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    });
  });

  it("fingerprints the engine-owned ruleset", () => {
    const metadata = getEngineRulesetMetadata();
    expect(metadata.rulesetId).toBe("campaign-v4-100-day-v2");
    expect(metadata.stateVersion).toBe(4);
    expect(metadata.configFingerprint).toMatch(/^[a-f\d]{64}$/);
  });

  it("rejects a version 4 save without the deterministic event plan", () => {
    const state = createGameState("run-legacy");
    const legacy = { ...state, eventPlan: undefined };

    expect(() => assertPatchedGameState(legacy as unknown as typeof state, state.runId)).toThrow(
      "eventPlan",
    );
  });

  it("preserves the selected difficulty", () => {
    expect(createGameState("run-easy", "easy").difficulty).toBe("easy");
    expect(createGameState("run-hard", "hard").difficulty).toBe("hard");
  });

  it("accepts trusted pending and active consequence events", () => {
    let state = createGameState("run-consequence-validation");
    let scheduled = false;

    while (state.day < 10) {
      if (state.phase === "event" && state.activeEvent) {
        if (state.activeEvent.isConsequence) {
          expect(scheduled).toBe(true);
          expect(() => assertPatchedGameState(state, state.runId)).not.toThrow();
          return;
        }
        const consequenceChoice: NonNullable<typeof state.activeEvent>["choices"][number] | undefined = !scheduled
          ? state.activeEvent.choices.find((candidate) => candidate.consequence)
          : undefined;
        const selected = consequenceChoice ?? state.activeEvent.choices.find(
          (candidate) => candidate.goldCost === 0 && !candidate.consequence,
        ) ?? state.activeEvent.choices.find((candidate) => candidate.goldCost === 0)!;
        const chosen = applyGameAction(state, {
          type: "chooseEventOption",
          payload: { choiceId: selected.id },
        });
        expect(chosen.ok).toBe(true);
        if (!chosen.ok) return;
        state = chosen.state;
        scheduled ||= Boolean(consequenceChoice?.consequence);
      } else {
        const advanced = applyGameAction(state, { type: "endPreparationDay", payload: {} });
        expect(advanced.ok).toBe(true);
        if (!advanced.ok) return;
        state = advanced.state;
      }
      expect(() => assertPatchedGameState(state, state.runId)).not.toThrow();
    }

    throw new Error("Fixture did not produce a consequence event before wave one");
  });

  it("accepts a consequence moved to a trusted successor package", () => {
    let state = createGameState("late-3");
    const advanceTo = (targetDay: number) => {
      while (state.day < targetDay) {
        if (state.phase === "event" && state.activeEvent) {
          const free = state.activeEvent.choices.find(
            (choice) => choice.goldCost === 0 && !choice.consequence,
          ) ?? state.activeEvent.choices.find((choice) => choice.goldCost === 0);
          expect(free).toBeTruthy();
          const result = applyGameAction(state, {
            type: "chooseEventOption",
            payload: { choiceId: free!.id },
          });
          expect(result.ok).toBe(true);
          if (!result.ok) throw new Error(result.error.message);
          state = result.state;
          continue;
        }
        const result = applyGameAction(state, { type: "endPreparationDay", payload: {} });
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error(result.error.message);
        state = result.state;
      }
    };

    for (const eventDay of [6, 8]) {
      advanceTo(eventDay);
      const consequence = state.activeEvent?.choices.find(
        (choice) => choice.goldCost === 0 && choice.consequence,
      );
      expect(consequence).toBeTruthy();
      const result = applyGameAction(state, {
        type: "chooseEventOption",
        payload: { choiceId: consequence!.id },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error.message);
      state = result.state;
    }

    const deferred = state.pendingConsequences.find((entry) => entry.triggerDay > 10);
    expect(deferred).toBeTruthy();
    expect(deferred?.packageId).not.toBe("c-raid-wave1");
    expect(() => assertPatchedGameState(state, state.runId)).not.toThrow();

    const foreignPackageId = "c-unrest-mid";
    const forged = {
      ...deferred!,
      packageId: foreignPackageId,
      id: `${foreignPackageId}::${deferred!.originEventId}::${deferred!.originChoiceId}::${deferred!.triggerDay}`,
    };
    expect(() => assertPatchedGameState({
      ...state,
      pendingConsequences: state.pendingConsequences.map((entry) =>
        entry.id === deferred!.id ? forged : entry),
    }, state.runId)).toThrow("invalid pending consequence");
  });

  it("rejects an event plan copied from another run", () => {
    const state = createGameState("run-one");
    let other = createGameState("run-two");
    for (let index = 3; JSON.stringify(other.eventPlan) === JSON.stringify(state.eventPlan); index += 1) {
      other = createGameState(`run-${index}`);
    }

    expect(() => assertPatchedGameState({ ...state, eventPlan: other.eventPlan }, state.runId)).toThrow(
      "eventPlan",
    );
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

  it("delegates surrender and preserves the engine result", () => {
    const state = createGameState("run-surrender");
    const result = applyGameAction(state, { type: "surrender", payload: {} });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state).toEqual({
      ...state,
      phase: "gameOver",
      revision: state.revision + 1,
    });
  });

  it("passes GAME_ENDED through when surrender is repeated", () => {
    const state = createGameState("run-surrender-ended");
    const first = applyGameAction(state, { type: "surrender", payload: {} });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(applyGameAction(first.state, { type: "surrender", payload: {} })).toEqual({
      ok: false,
      error: { code: "GAME_ENDED", message: "Game has ended" },
    });
  });
});
