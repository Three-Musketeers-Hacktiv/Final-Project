import { describe, expect, it } from "vitest";
import {
  chooseReward,
  createInitialState,
  getEffectiveDefense,
  getUpgradeCost,
  getWavePreview,
  incomeAmountForDay,
  rewardsForWave,
  startBattle,
} from "../../../src/game/index";
import { expectError, callWithoutMutating } from "../helpers/assertions";
import { play } from "../helpers/campaignPlayer";
import { scoredEventChoice } from "../helpers/policies";
import { mustOk } from "../helpers/mustOk";
import { roundTrip } from "../helpers/roundTrip";
import { findRunId, RUN } from "../fixtures/runIds";
import { expectedPrepIncome } from "../helpers/expectedEconomy";

const caravanRun = findRunId((plan) => plan.some((entry) => entry.packageId === "d2-caravan-a" && entry.day < 20));

const rewardByWave: Record<number, string> = {
  1: "w1-income",
  2: "w2-def",
  3: "w3-maxhp",
  4: "w4-discount",
  5: "w5-gold",
  6: "w6-heal",
  7: "w7-def",
  8: "w8-income",
  9: "w9-combo",
};

describe("reward dan masa berlaku", () => {
  it("REW-01 setiap wave 1 sampai 9 punya tiga pilihan, id wave lain ditolak", () => {
    for (let wave = 1; wave <= 9; wave += 1) {
      const set = rewardsForWave(wave);
      expect(set?.options).toHaveLength(3);
      expect(new Set(set!.options.map((option) => option.id)).size).toBe(3);
    }
    expect(rewardsForWave(10)).toBeUndefined();

    const report = play(createInitialState({ runId: RUN.reward, difficulty: "easy" }), {
      spend: "knownWin",
      eventChoice: scoredEventChoice,
      stop: (state) => state.phase === "reward" && state.wavesCleared === 1,
    }).state;
    expect(report.phase).toBe("reward");
    const wrong = callWithoutMutating(report, (state) => chooseReward(state, "w2-gold"));
    expectError(wrong, "INVALID_CHOICE");
  });

  it("REW-02 bonus income hanya hidup sampai battle berikutnya", () => {
    const picked = play(createInitialState({ runId: RUN.reward, difficulty: "normal" }), {
      spend: "knownWin",
      eventChoice: scoredEventChoice,
      rewardChoice: (state) => rewardByWave[state.wavesCleared] ?? "w1-income",
      stop: (state) => state.day === 11 && state.rewardsChosenByWave["1"] === "w1-income",
    }).state;

    expect(picked.effects.prepIncomeBonus).toBe(6);
    const withBonus = incomeAmountForDay(picked, 11);
    const without = incomeAmountForDay({ ...picked, effects: { ...picked.effects, prepIncomeBonus: 0 } }, 11);
    expect(withBonus - without).toBe(6);

    const battle = play(picked, {
      spend: "knownWin",
      eventChoice: scoredEventChoice,
      rewardChoice: () => "w2-def",
      stop: (state) => state.phase === "battleReport" && state.day === 20,
    }).state;
    expect(battle.effects.prepIncomeBonus).toBe(0);
    expect(battle.rewardsChosenByWave["1"]).toBe("w1-income");
  });

  it("REW-03 defense wave target hilang setelah battle itu diselesaikan", () => {
    const afterWave2 = play(createInitialState({ runId: RUN.reward, difficulty: "easy" }), {
      spend: "knownWin",
      eventChoice: scoredEventChoice,
      rewardChoice: (state) => (state.wavesCleared === 2 ? "w2-def" : "w1-gold"),
      stop: (state) => state.rewardsChosenByWave["2"] === "w2-def" && state.phase !== "reward",
    }).state;
    expect(afterWave2.effects.defenseByWave[3]).toBe(5);
    expect(getEffectiveDefense(afterWave2, 3)).toBe(getEffectiveDefense(afterWave2, 2) + 5);

    const wave3 = play(afterWave2, {
      spend: "knownWin",
      eventChoice: scoredEventChoice,
      rewardChoice: () => "w3-heal",
      stop: (state) => state.phase === "battleReport" && state.day === 30,
    }).state;
    expect(wave3.effects.defenseByWave[3]).toBeUndefined();
    expect(getWavePreview(wave3)?.wave).not.toBe(3);
  });

  it("REW-04 dua diskon 25% memakai rate terbesar, biaya menjadi 34", () => {
    let state = play(createInitialState({ runId: caravanRun, difficulty: "normal" }), {
      spend: "knownWin",
      eventChoice: (current) => {
        if (current.activeEvent?.packageId === "d2-caravan-a") return "d2-caravan-a-skip";
        return scoredEventChoice(current);
      },
      rewardChoice: () => "w1-discount",
      stop: (current) => current.rewardsChosenByWave["1"] === "w1-discount",
    }).state;
    expect(state.effects.upgradeDiscountRate).toBe(0.25);

    state = play(state, {
      spend: "skip",
      eventChoice: (current) =>
        current.activeEvent?.packageId === "d2-caravan-a" ? "d2-caravan-a-discount" : scoredEventChoice(current),
      stop: (current) => current.completedEventIds.includes("d2-caravan-a"),
    }).state;

    expect(state.effects.upgradeDiscountRate).toBe(0.25);
    const raw = 45 + state.wallLevel * 30;
    const atMaxRate = Math.max(1, Math.ceil(raw * 0.75));
    const ifRatesWereAdded = Math.max(1, Math.ceil(raw * 0.5));
    expect(getUpgradeCost(state, "wall")).toBe(atMaxRate);
    expect(atMaxRate).not.toBe(ifRatesWereAdded);
    const repeated = callWithoutMutating(state, (current) => chooseReward(current, "w1-discount"));
    expect(repeated.ok).toBe(false);
  });

  it("REW-05 gold reward sama dengan 35 ditambah income hari berikutnya, sekali", () => {
    const reward = play(createInitialState({ runId: RUN.reward, difficulty: "normal" }), {
      spend: "knownWin",
      stop: (state) => state.phase === "reward" && state.wavesCleared === 1,
    }).state;
    const loaded = roundTrip(reward);
    const grant = rewardsForWave(1)!.options.find((option) => option.id === "w1-gold")!;
    expect(grant.amount).toBe(35);
    const income = expectedPrepIncome(loaded.cityLevel, loaded.effects.prepIncomeBonus);
    const chosen = mustOk(chooseReward(loaded, "w1-gold"));
    expect(chosen.gold).toBe(loaded.gold + 35 + income);
    expect(chosen.day).toBe(11);
    expect(chosen.incomeGrantedDays.filter((day) => day === 11)).toHaveLength(1);
    expect(chosen.rewardsChosenByWave["1"]).toBe("w1-gold");

    const again = callWithoutMutating(chosen, (state) => chooseReward(state, "w1-income"));
    expectError(again, "INVALID_PHASE");

    const reloaded = roundTrip(chosen);
    const replay = callWithoutMutating(reloaded, (state) => chooseReward(state, "w1-gold"));
    expect(replay.ok).toBe(false);
    expect(reloaded.gold).toBe(chosen.gold);
    expect(reloaded.incomeGrantedDays.filter((day) => day === 11)).toHaveLength(1);
  });
});
