import { describe, expect, it } from "vitest";
import { chooseReward, createInitialState, getEffectiveDefense, rewardsForWave, type GameState } from "../../../src/game/index";
import { asBoundary } from "../fixtures/boundaryStates";
import { RUN } from "../fixtures/runIds";
import { callWithoutMutating, expectError } from "../helpers/assertions";
import { play } from "../helpers/campaignPlayer";
import { expectedPrepIncome } from "../helpers/expectedEconomy";
import { mustOk } from "../helpers/mustOk";
import { roundTrip } from "../helpers/roundTrip";

function reachReward(wave: number, earlier: (state: GameState) => string) {
  return play(createInitialState({ runId: RUN.reward, difficulty: "normal" }), {
    spend: "knownWin",
    rewardChoice: (state) => (state.wavesCleared === wave ? "pending" : earlier(state)),
    stop: (state) => state.phase === "reward" && state.wavesCleared === wave,
  }).state;
}

describe("nilai reward", () => {
  it("RWD-01 heal di-clamp ke MaxHP dan tidak melewatinya", () => {
    const reward = reachReward(2, () => "w1-gold");
    const full = asBoundary(reward, "HP penuh sebelum heal 35", { cityHp: reward.cityMaxHp });
    const topped = mustOk(chooseReward(full, "w2-heal"));
    expect(topped.cityHp).toBe(full.cityMaxHp);

    const low = asBoundary(reward, "HP 10 di bawah max sebelum heal 35", {
      cityHp: reward.cityMaxHp - 10,
    });
    const healed = mustOk(chooseReward(low, "w2-heal"));
    expect(healed.cityHp).toBe(Math.min(low.cityMaxHp, low.cityHp + 35));
    expect(healed.cityHp).toBe(low.cityMaxHp);
  });

  it("RWD-02 maxHp menambah maksimum dan HP sebesar bonus, bukan full heal", () => {
    const reward = reachReward(3, (state) => (state.wavesCleared === 1 ? "w1-gold" : "w2-gold"));
    const hurt = asBoundary(reward, "HP 40 sebelum bonus MaxHP 20", { cityHp: 40 });
    const beforeHp = hurt.cityHp;
    const beforeMax = hurt.cityMaxHp;
    const applied = mustOk(chooseReward(hurt, "w3-maxhp"));
    expect(applied.cityMaxHp).toBe(beforeMax + 20);
    expect(applied.cityHp).toBe(Math.min(beforeMax + 20, beforeHp + 20));
    expect(applied.cityHp).toBe(60);
    expect(callWithoutMutating(hurt, (state) => chooseReward(state, "w3-maxhp")).ok).toBe(true);
  });

  it("RWD-03 income pertama setelah bonus dihitung dari rumus 28 + level kota * 5 + 6", () => {
    const picked = play(createInitialState({ runId: RUN.reward, difficulty: "normal" }), {
      spend: "knownWin",
      rewardChoice: () => "w1-income",
      stop: (state) => state.day === 11 && state.rewardsChosenByWave["1"] === "w1-income",
    }).state;
    const manual = expectedPrepIncome(picked.cityLevel, 6);
    expect(picked.effects.prepIncomeBonus).toBe(6);
    expect(manual).toBe(28 + picked.cityLevel * 5 + 6);
    expect(picked.gold).toBeGreaterThan(0);
    const battle = play(picked, {
      spend: "knownWin",
      rewardChoice: () => "w2-gold",
      stop: (state) => state.phase === "battleReport" && state.day === 20,
    }).state;
    expect(battle.effects.prepIncomeBonus).toBe(0);
  });

  it("RWD-04 defense wave target bertambah 5 lalu hilang setelah battle wave itu", () => {
    const armed = play(createInitialState({ runId: RUN.reward, difficulty: "normal" }), {
      spend: "knownWin",
      rewardChoice: (state) => (state.wavesCleared === 2 ? "w2-def" : "w1-gold"),
      stop: (state) => state.rewardsChosenByWave["2"] === "w2-def" && state.phase !== "reward",
    }).state;
    const defenseBefore = getEffectiveDefense(armed, 3) - (armed.effects.defenseByWave[3] ?? 0);
    expect(armed.effects.defenseByWave[3]).toBe(5);
    expect(getEffectiveDefense(armed, 3)).toBe(defenseBefore + 5);

    const resolved = play(armed, {
      spend: "knownWin",
      rewardChoice: () => "w3-heal",
      stop: (state) => state.phase === "battleReport" && state.day === 30,
    }).state;
    expect(resolved.effects.defenseByWave[3]).toBeUndefined();
  });

  it("RWD-05 combo wave 9 menerapkan heal 40 dan defense 6 sekali", () => {
    const reward = play(createInitialState({ runId: RUN.reward, difficulty: "easy" }), {
      spend: "knownWin",
      rewardChoice: (state) =>
        state.wavesCleared === 9 ? "w9-combo" : rewardsForWave(state.wavesCleared)!.options[0]!.id,
      stop: (state) => state.phase === "reward" && state.wavesCleared === 9,
    }).state;
    const loaded = roundTrip(reward);
    const beforeDefense = loaded.effects.defenseByWave[10] ?? 0;
    const applied = mustOk(chooseReward(loaded, "w9-combo"));
    expect(applied.cityHp).toBe(Math.min(loaded.cityMaxHp, loaded.cityHp + 40));
    expect(applied.effects.defenseByWave[10]).toBe(beforeDefense + 6);
    expect(applied.rewardsChosenByWave["9"]).toBe("w9-combo");
    const again = roundTrip(applied);
    const replay = callWithoutMutating(again, (state) => chooseReward(state, "w9-combo"));
    expectError(replay, "INVALID_PHASE");
    expect(again.cityHp).toBe(applied.cityHp);
    expect(again.effects.defenseByWave[10]).toBe(beforeDefense + 6);
  });
});
