import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInitialState } from "../../../src/game/index";
import { play } from "../helpers/campaignPlayer";
import { scoredEventChoice } from "../helpers/policies";
import { RUN } from "../fixtures/runIds";

describe("difficulty pada campaign yang dimainkan", () => {
  it("INT-02 normal dan hard berhenti di fase akhir, tanpa syarat harus menang", () => {
    const outcomes = [];
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
      outcomes.push({
        runId: RUN.victory,
        difficulty,
        strategy: "knownWin",
        phase: done.state.phase,
        day: done.state.day,
        wavesCleared: done.state.wavesCleared,
        cityHp: done.state.cityHp,
        gold: done.state.gold,
      });
    }
    const reportDir = join(dirname(fileURLToPath(import.meta.url)), "..", "reports");
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(join(reportDir, "difficulty-known-win-2026-11-10.json"), `${JSON.stringify(outcomes, null, 2)}\n`);
  });
});
