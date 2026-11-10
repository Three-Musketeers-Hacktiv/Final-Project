import { describe, expect, it } from "vitest";
import { createInitialState } from "../../../src/game/index";
import { play } from "../helpers/campaignPlayer";
import { scoredEventChoice } from "../helpers/policies";
import { PAIR_RUNS } from "./pairedRepair";
import { runHardEval, writeHardReport } from "./hardEval";

describe("evaluasi difficulty hard", () => {
  it("SIM-03 strategi dengan repair berhenti di fase akhir tanpa mewajibkan menang", () => {
    const rows = runHardEval();
    expect(rows).toHaveLength(PAIR_RUNS.length * 5 * 3);
    for (const row of rows) {
      expect(["victory", "gameOver"]).toContain(row.phase);
      expect(row.day).toBeGreaterThan(1);
    }
    const first = rows.find(
      (row) => row.runId === "sim-pair-1" && row.strategy === "knownWin" && row.rewardPolicy === "survival",
    );
    const again = play(createInitialState({ runId: "sim-pair-1", difficulty: "hard" }), {
      spend: "knownWin",
      eventChoice: scoredEventChoice,
      rewardPolicy: "survival",
    });
    expect(again.state.phase).toBe(first?.phase);
    expect(again.state.day).toBe(first?.day);
    expect(again.state.wavesCleared).toBe(first?.wavesCleared);
    writeHardReport(rows);
  });
});
