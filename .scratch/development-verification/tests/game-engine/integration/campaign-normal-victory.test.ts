import { describe, expect, it } from "vitest";
import { createInitialState, gameConfig, rewardsForWave } from "../../../src/game/index";
import { play } from "../helpers/campaignPlayer";
import { scoredEventChoice } from "../helpers/policies";
import { RUN } from "../fixtures/runIds";

describe("regresi campaign normal", () => {
  it("INT-04 easy-campaign normal dengan knownWin menang di hari terakhir", () => {
    expect(gameConfig.maxTrackLevel).toBe(18);
    expect(gameConfig.lastDay).toBe(100);
    expect(gameConfig.waves).toHaveLength(10);

    const done = play(createInitialState({ runId: RUN.victory, difficulty: "normal" }), {
      spend: "knownWin",
      eventChoice: scoredEventChoice,
    });

    expect(done.steps).toBeLessThan(800);
    expect(done.state.phase).toBe("victory");
    expect(done.state.day).toBe(gameConfig.lastDay);
    expect(done.state.wavesCleared).toBe(gameConfig.waves.length);
    expect(done.state.cityHp).toBeGreaterThan(0);
    expect(done.state.wallLevel).toBeLessThanOrEqual(gameConfig.maxTrackLevel);
    expect(done.state.troopLevel).toBeLessThanOrEqual(gameConfig.maxTrackLevel);
    expect(done.state.cityLevel).toBeLessThanOrEqual(gameConfig.maxTrackLevel);
    expect(done.rewards.map((entry) => entry.wave)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const reward of done.rewards) {
      const allowed = rewardsForWave(reward.wave)?.options.map((option) => option.id) ?? [];
      expect(allowed).toContain(reward.rewardId);
    }
    expect(rewardsForWave(10)).toBeUndefined();
    expect(done.state.rewardsChosenByWave["10"]).toBeUndefined();
  });
});