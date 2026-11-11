import { describe, expect, it } from "vitest";

import { eventPackageById } from "../../../src/game";

import {
  applyGameAction,
  assertPatchedGameState,
  createGameState,
  ensureRequiredEvent,
  getEngineCompatibility,
  getEngineRulesetMetadata,
  readEffectiveStats,
  readWavePreview,
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
    expect(metadata.rulesetId).toBe("campaign-v4-100-day-v3");
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

  it("delegates the latest repair, wave, and hard difficulty balance", () => {
    const normal = createGameState("run-latest-normal", "normal");
    const hard = createGameState("run-latest-hard", "hard");
    expect(readEffectiveStats(normal).repairCost).toBe(25);
    expect(readEffectiveStats(hard).repairCost).toBe(27);
    expect(readWavePreview(normal)).toMatchObject({ wave: 1, hp: 150, attack: 22 });
    expect(readWavePreview(hard)).toMatchObject({ wave: 1, hp: 158, attack: 23 });
    expect(readWavePreview({ ...normal, wavesCleared: 9 })).toMatchObject({
      wave: 10,
      hp: 600,
      attack: 64,
    });

    const damaged = { ...normal, cityHp: 50, actionUsedToday: false };
    const repaired = applyGameAction(damaged, { type: "repairCity", payload: {} });
    expect(repaired.ok).toBe(true);
    if (!repaired.ok) return;
    expect(repaired.state.cityHp).toBe(110);
    expect(repaired.state.gold).toBe(damaged.gold - 25);
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
    expect(deferred?.packageId).toBe("c-raid-wave2");
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

    expect(() => assertPatchedGameState({
      ...state,
      pendingConsequences: [...state.pendingConsequences, deferred!],
    }, state.runId)).toThrow("invalid pending consequence");

    const reverseOrigin = state.eventPlan
      .map((entry) => eventPackageById(entry.packageId))
      .flatMap((pkg) => pkg ? pkg.choices.map((choice) => ({ pkg, choice })) : [])
      .find(({ choice }) => choice.consequence?.packageId === "c-raid-wave2");
    expect(reverseOrigin).toBeTruthy();
    const reverseDay = 19;
    const reverse = {
      packageId: "c-raid-wave1",
      originEventId: reverseOrigin!.pkg.eventId,
      originChoiceId: reverseOrigin!.choice.id,
      triggerDay: reverseDay,
      id: `c-raid-wave1::${reverseOrigin!.pkg.eventId}::${reverseOrigin!.choice.id}::${reverseDay}`,
    };
    expect(() => assertPatchedGameState({
      ...state,
      pendingConsequences: [reverse],
    }, state.runId)).toThrow("invalid pending consequence");
  });

  it("recovers a required event missing from a loaded state", () => {
    let state = createGameState("run-event-recovery");
    while (!state.activeEvent) {
      const result = applyGameAction(state, { type: "endPreparationDay", payload: {} });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error.message);
      state = result.state;
    }
    const eventId = state.activeEvent.eventId;
    const loaded = { ...state, phase: "preparation" as const, activeEvent: null };
    const recovered = ensureRequiredEvent(loaded);

    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;
    expect(recovered.state.activeEvent?.eventId).toBe(eventId);
    expect(recovered.state.phase).toBe("event");
    expect(recovered.state.revision).toBe(loaded.revision + 1);
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
