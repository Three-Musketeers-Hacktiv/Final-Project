import { describe, expect, it } from "vitest";
import { playCampaignStrategy, simulateSet, type CampaignRun } from "./balanceSim";

const SET_A = ["sim-a-1", "sim-a-2", "sim-a-3", "sim-a-4", "sim-a-5", "sim-a-6"];
const SET_B = ["sim-b-1", "sim-b-2", "sim-b-3", "sim-b-4", "holdout-normal", "holdout-hard"];

function victories(runs: CampaignRun[], difficulty: CampaignRun["difficulty"], strategy: CampaignRun["strategy"]): number {
  return runs.filter((run) => run.difficulty === difficulty && run.strategy === strategy && run.phase === "victory").length;
}

describe("campaign balance", () => {
  const setA = simulateSet(SET_A);
  const setB = simulateSet(SET_B);

  it("clears easy on the search seeds", () => {
    expect(setA.filter((run) => run.difficulty === "easy" && run.phase === "victory")).toHaveLength(24);
  });

  it("wins normal with more than one public-action strategy", () => {
    expect(victories(setA, "normal", "troopsFirst")).toBeGreaterThanOrEqual(3);
    expect(victories(setA, "normal", "repairBias")).toBeGreaterThanOrEqual(3);
    expect(setA.filter((run) => run.difficulty === "normal" && run.phase === "victory").length).toBeGreaterThan(
      setA.filter((run) => run.difficulty === "hard" && run.phase === "victory").length,
    );
  });

  it("keeps a hard victory path that repairs more than normal", () => {
    expect(victories(setA, "hard", "repairBias")).toBeGreaterThanOrEqual(3);
    const repairs = (difficulty: "normal" | "hard") => {
      const group = setA.filter((run) => run.difficulty === difficulty && run.strategy === "repairBias");
      return group.reduce((sum, run) => sum + run.repairs, 0) / group.length;
    };
    expect(repairs("hard")).toBeGreaterThan(repairs("normal"));
  });

  it("reaches victory on holdout seeds without injected state", () => {
    expect(victories(setB, "normal", "troopsFirst")).toBe(SET_B.length);
    expect(victories(setB, "hard", "repairBias")).toBeGreaterThanOrEqual(1);
    expect(playCampaignStrategy("holdout-normal", "normal", "balanced").phase).toBe("victory");
    expect(playCampaignStrategy("holdout-hard", "hard", "repairBias").phase).toBe("victory");
    expect(playCampaignStrategy("easy-campaign", "easy", "troopsFirst").phase).toBe("victory");
  });
});
