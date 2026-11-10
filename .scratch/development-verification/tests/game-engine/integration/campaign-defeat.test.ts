import { describe, expect, it } from "vitest";
import { createInitialState, isBattleDay } from "../../../src/game/index";
import { play } from "../helpers/campaignPlayer";
import { avoidDamageChoice } from "../helpers/policies";
import { RUN } from "../fixtures/runIds";

describe("jalur kalah", () => {
  it("INT-03 tanpa upgrade, kota kalah pada battle dan tidak menerima reward", () => {
    const done = play(createInitialState({ runId: RUN.defeat, difficulty: "normal" }), {
      spend: "skip",
      eventChoice: avoidDamageChoice,
    });
    expect(done.state.phase).toBe("gameOver");
    expect(done.state.cityHp).toBe(0);
    expect(done.rewards).toEqual([]);
    expect(done.state.wavesCleared).toBe(0);
    expect(isBattleDay(done.state.day)).toBe(true);
    expect(done.state.battleResult?.won).toBe(false);
  });
});