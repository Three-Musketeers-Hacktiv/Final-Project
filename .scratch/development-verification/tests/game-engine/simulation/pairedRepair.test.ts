import { describe, expect, it } from "vitest";
import { PAIR_RUNS, PAIR_STRATEGIES, playPaired, runPairedSample, writePairedReport } from "./pairedRepair";

describe("simulasi repair berpasangan", () => {
  it("SIM-02 pasangan repair memakai seed, difficulty, dan prioritas upgrade yang sama", () => {
    const rows = runPairedSample();
    const perSeed = PAIR_STRATEGIES.length * 2 + 1;
    expect(rows).toHaveLength(PAIR_RUNS.length * 2 * perSeed);

    for (const row of rows) {
      expect(["victory", "gameOver"]).toContain(row.phase);
      expect(row.wallLevel).toBeLessThanOrEqual(18);
      expect(row.troopLevel).toBeLessThanOrEqual(18);
      expect(row.cityLevel).toBeLessThanOrEqual(18);
      if (row.repair === "off") expect(row.repairs).toBe(0);
    }

    for (const difficulty of ["normal", "hard"] as const) {
      for (const runId of PAIR_RUNS) {
        for (const strategy of PAIR_STRATEGIES) {
          const off = rows.find(
            (row) => row.runId === runId && row.difficulty === difficulty && row.strategy === strategy.id && row.repair === "off",
          );
          const on = rows.find(
            (row) =>
              row.runId === runId && row.difficulty === difficulty && row.strategy === strategy.id && row.repair === "below80",
          );
          expect(off).toBeTruthy();
          expect(on).toBeTruthy();
        }
      }
    }

    const again = playPaired(PAIR_RUNS[0], "normal", PAIR_STRATEGIES[0], "below80");
    const first = rows.find(
      (row) => row.runId === PAIR_RUNS[0] && row.difficulty === "normal" && row.strategy === "attack" && row.repair === "below80",
    );
    expect(again).toEqual(first);
    writePairedReport(rows);
  });
});