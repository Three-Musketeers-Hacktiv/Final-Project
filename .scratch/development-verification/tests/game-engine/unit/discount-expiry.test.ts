import { describe, expect, it } from "vitest";
import {
  chooseReward,
  createInitialState,
  getRepairCost,
  getUpgradeCost,
  startBattle,
  type GameState,
} from "../../../src/game/index";
import { asBoundary } from "../fixtures/boundaryStates";
import { RUN } from "../fixtures/runIds";
import { callWithoutMutating } from "../helpers/assertions";
import { play } from "../helpers/campaignPlayer";
import {
  expectedDiscountedUpgradeCost,
  expectedRawUpgradeCost,
  expectedRepairCostNormal,
} from "../helpers/expectedEconomy";
import { scoredEventChoice } from "../helpers/policies";
import { mustOk } from "../helpers/mustOk";

function avoidDiscount(state: GameState): string {
  const choices = state.activeEvent?.choices ?? [];
  const safe = choices.filter(
    (choice) =>
      choice.goldCost <= state.gold &&
      !choice.effects.some((effect) => effect.type === "upgradeDiscount") &&
      state.cityHp - choice.effects.reduce((total, effect) => total + (effect.type === "damageCity" ? effect.amount : 0), 0) > 0,
  );
  if (safe.length === 0) return scoredEventChoice(state);
  const free = safe.find((choice) => choice.goldCost === 0 && !choice.consequence) ?? safe[0]!;
  return free.id;
}

describe("expiry diskon upgrade", () => {
  it("DSC-01 diskon aktif menurunkan tiga jalur dan tidak menurunkan repair", () => {
    const state = asBoundary(createInitialState({ runId: "dsc-boundary" }), "rate 25% sampai wave 2", {
      effects: {
        defenseByWave: {},
        upgradeDiscountRate: 0.25,
        upgradeDiscountUntilWave: 2,
        prepIncomeBonus: 0,
      },
    });
    for (const track of ["wall", "troops", "city"] as const) {
      expect(getUpgradeCost(state, track)).toBe(expectedDiscountedUpgradeCost(0, 0.25));
      expect(expectedDiscountedUpgradeCost(0, 0.25)).toBe(34);
    }
    expect(getRepairCost(state)).toBe(expectedRepairCostNormal());
    expect(expectedRepairCostNormal()).toBe(25);
  });

  it("DSC-02 dua rate memakai yang terbesar, dari kedua urutan", () => {
    const wave1 = play(createInitialState({ runId: RUN.reward, difficulty: "easy" }), {
      spend: "knownWin",
      stop: (state) => state.phase === "reward" && state.wavesCleared === 1,
    }).state;
    const largerFirst = asBoundary(wave1, "rate 30% sudah ada sebelum reward 25%", {
      effects: {
        ...wave1.effects,
        upgradeDiscountRate: 0.3,
        upgradeDiscountUntilWave: 2,
      },
    });
    const kept = mustOk(chooseReward(largerFirst, "w1-discount"));
    expect(kept.effects.upgradeDiscountRate).toBe(0.3);

    const wave4 = play(createInitialState({ runId: RUN.reward, difficulty: "normal" }), {
      spend: "knownWin",
      rewardChoice: (state) => {
        if (state.wavesCleared === 1) return "w1-gold";
        if (state.wavesCleared === 2) return "w2-gold";
        return "w3-heal";
      },
      stop: (state) => state.phase === "reward" && state.wavesCleared === 4,
    }).state;
    const smallerFirst = asBoundary(wave4, "rate 25% sudah ada sebelum reward 30%", {
      effects: {
        ...wave4.effects,
        upgradeDiscountRate: 0.25,
        upgradeDiscountUntilWave: 5,
      },
    });
    const raised = mustOk(chooseReward(smallerFirst, "w4-discount"));
    expect(raised.effects.upgradeDiscountRate).toBe(0.3);
    expect(getUpgradeCost(raised, "troops")).toBe(expectedDiscountedUpgradeCost(raised.troopLevel, 0.3));
  });

  it("DSC-03 diskon wave 1 berakhir setelah battle wave 2 dan biaya kembali mentah", () => {
    const beforeBattle = play(createInitialState({ runId: RUN.reward, difficulty: "normal" }), {
      spend: "knownWin",
      eventChoice: avoidDiscount,
      rewardChoice: (state) => (state.wavesCleared === 1 ? "w1-discount" : "w2-gold"),
      stop: (state) => state.phase === "battleReady" && state.day === 20,
    }).state;

    expect(beforeBattle.effects.upgradeDiscountRate).toBe(0.25);
    expect(getUpgradeCost(beforeBattle, "wall")).toBe(expectedDiscountedUpgradeCost(beforeBattle.wallLevel, 0.25));
    expect(getUpgradeCost(beforeBattle, "troops")).toBe(expectedDiscountedUpgradeCost(beforeBattle.troopLevel, 0.25));
    expect(getUpgradeCost(beforeBattle, "city")).toBe(expectedDiscountedUpgradeCost(beforeBattle.cityLevel, 0.25));
    expect(getRepairCost(beforeBattle)).toBe(25);

    const resolved = mustOk(startBattle(beforeBattle));
    expect(resolved.effects.upgradeDiscountRate).toBe(0);
    expect(resolved.effects.upgradeDiscountUntilWave).toBeNull();

    const nextPrep = play(resolved, {
      spend: "skip",
      eventChoice: avoidDiscount,
      rewardChoice: () => "w2-gold",
      stop: (state) => state.day === 21,
    }).state;
    expect(getUpgradeCost(nextPrep, "wall")).toBe(expectedRawUpgradeCost(nextPrep.wallLevel));
    expect(getUpgradeCost(nextPrep, "troops")).toBe(expectedRawUpgradeCost(nextPrep.troopLevel));
    expect(getUpgradeCost(nextPrep, "city")).toBe(expectedRawUpgradeCost(nextPrep.cityLevel));
    expect(callWithoutMutating(beforeBattle, (state) => startBattle(state)).ok).toBe(true);
  });

  it("DSC-04 diskon baru setelah expiry tidak menghidupkan rate lama", () => {
    const reward = play(createInitialState({ runId: RUN.reward, difficulty: "normal" }), {
      spend: "knownWin",
      eventChoice: avoidDiscount,
      rewardChoice: (state) => {
        if (state.wavesCleared === 1) return "w1-discount";
        if (state.wavesCleared === 2) return "w2-gold";
        if (state.wavesCleared === 3) return "w3-heal";
        return "w4-discount";
      },
      stop: (state) => state.rewardsChosenByWave["4"] === "w4-discount",
    }).state;

    expect(reward.effects.upgradeDiscountRate).toBe(0.3);
    expect(reward.effects.upgradeDiscountUntilWave).toBe(5);
    expect(getUpgradeCost(reward, "city")).toBe(expectedDiscountedUpgradeCost(reward.cityLevel, 0.3));
  });
});