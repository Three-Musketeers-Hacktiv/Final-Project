import { describe, expect, it } from "vitest";
import { createInitialState } from "../../../src/game/index";
import { play } from "../helpers/campaignPlayer";
import { scoredEventChoice } from "../helpers/policies";
import { RUN } from "../fixtures/runIds";

describe("difficulty pada campaign yang dimainkan", () => {
  it("INT-02 normal dan hard berhenti di fase akhir, tanpa syarat harus menang", () => {
    for (const difficulty of ["normal", "hard"] as const) {
      const done = play(createInitialState({ runId: RUN.victory, difficulty }), {
        spend: "knownWin",
        eventChoice: scoredEventChoice,
      });
      expect(done.steps).toBeLessThan(800);
      expect(["victory", "gameOver"]).toContain(done.state.phase);
      expect(done.state.day).toBeGreaterThan(1);
      expect(done.state.wavesCleared).toBeGreaterThanOrEqual(0);
      expect(done.state.wavesCleared).toBeLessThanOrEqual(10);
    }
  });
});