import { describe, expect, it } from "vitest";
import {
  createInitialState,
  gameConfig,
  isBattleDay,
  rewardsForWave,
} from "../../../src/game/index";
import { play } from "../helpers/campaignPlayer";
import { scoredEventChoice } from "../helpers/policies";
import { RUN } from "../fixtures/runIds";

describe("campaign lewat aksi publik", () => {
  it("INT-01 easy-campaign menang di hari 100 dan income tidak masuk hari battle", () => {
    const done = play(createInitialState({ runId: RUN.victory, difficulty: "easy" }), {
      spend: "knownWin",
      eventChoice: scoredEventChoice,
    });
    expect(done.steps).toBeLessThan(800);
    expect(done.state.phase).toBe("victory");
    expect(done.state.day).toBe(100);
    expect(done.state.wavesCleared).toBe(10);
    expect(done.state.battleResult?.wave).toBe(10);
    expect(done.state.battleResult?.won).toBe(true);
    expect(rewardsForWave(10)).toBeUndefined();
    expect(done.rewards.map((entry) => entry.wave)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    expect(done.state.incomeGrantedDays).toHaveLength(90);
    expect(new Set(done.state.incomeGrantedDays).size).toBe(90);
    for (const day of done.state.incomeGrantedDays) {
      expect(isBattleDay(day)).toBe(false);
    }
    for (const day of gameConfig.battleDays) {
      expect(done.state.incomeGrantedDays).not.toContain(day);
    }
  });
});
