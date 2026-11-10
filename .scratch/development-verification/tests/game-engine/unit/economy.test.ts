import { describe, expect, it } from "vitest";
import {
  createInitialState,
  endPreparationDay,
  getEffectiveAttack,
  getEffectiveDefense,
  getRepairCost,
  getUpgradeCost,
  incomeAmountForDay,
  repairCity,
  upgradeCity,
  upgradeTroops,
  upgradeWall,
} from "../../../src/game/index";
import { expectError, callWithoutMutating } from "../helpers/assertions";
import { play } from "../helpers/campaignPlayer";
import { avoidDamageChoice } from "../helpers/policies";
import { mustOk } from "../helpers/mustOk";
import { asBoundary } from "../fixtures/boundaryStates";
import { RUN } from "../fixtures/runIds";

describe("ekonomi dan upgrade", () => {
  it("ECO-01 tiga jalur menaikkan stat yang sesuai", () => {
    const state = createInitialState({ runId: RUN.economy });

    const wall = mustOk(upgradeWall(state));
    expect(wall.wallLevel).toBe(1);
    expect(wall.troopLevel).toBe(0);
    expect(wall.cityLevel).toBe(0);
    expect(getEffectiveDefense(wall)).toBe(5);
    expect(getEffectiveAttack(wall)).toBe(10);

    const troops = mustOk(upgradeTroops(state));
    expect(troops.troopLevel).toBe(1);
    expect(getEffectiveAttack(troops)).toBe(15);
    expect(getEffectiveDefense(troops)).toBe(2);

    const damaged = asBoundary(state, "HP 100 sebelum upgrade kota", { cityHp: 100, gold: 200 });
    const city = mustOk(upgradeCity(damaged));
    expect(city.cityLevel).toBe(1);
    expect(city.cityMaxHp).toBe(185);
    expect(city.cityHp).toBe(135);
    expect(incomeAmountForDay(city, 2)).toBe(33);
  });

  it("ECO-02 biaya naik 45, 75, lalu 105", () => {
    let state = createInitialState({ runId: RUN.economy });
    expect(getUpgradeCost(state, "troops")).toBe(45);
    state = mustOk(upgradeTroops(state));
    expect(state.gold).toBe(83);
    expect(getUpgradeCost(state, "troops")).toBe(75);

    const later = play(state, {
      spend: "skip",
      eventChoice: avoidDamageChoice,
      stop: (current) => current.phase === "preparation" && !current.actionUsedToday && current.gold >= 75,
    }).state;
    expect(getUpgradeCost(later, "troops")).toBe(75);
    const second = mustOk(upgradeTroops(later));
    expect(second.troopLevel).toBe(2);
    expect(second.gold).toBe(later.gold - 75);
    expect(getUpgradeCost(second, "troops")).toBe(105);
  });

  it("ECO-03 difficulty mengubah biaya, gold pas diterima, satu di bawah ditolak", () => {
    const easy = createInitialState({ runId: RUN.economy, difficulty: "easy" });
    const hard = createInitialState({ runId: RUN.economy, difficulty: "hard" });
    expect(getUpgradeCost(easy, "wall")).toBe(39);
    expect(getRepairCost(easy)).toBe(23);
    expect(getUpgradeCost(hard, "wall")).toBe(49);
    expect(getRepairCost(hard)).toBe(27);

    const exact = asBoundary(createInitialState({ runId: RUN.economy }), "gold persis 45", { gold: 45 });
    const paid = mustOk(upgradeWall(exact));
    expect(paid.gold).toBe(0);

    const short = asBoundary(createInitialState({ runId: RUN.economy }), "gold 44", { gold: 44 });
    const denied = callWithoutMutating(short, (current) => upgradeWall(current));
    expectError(denied, "INSUFFICIENT_GOLD");
    expect(short.actionUsedToday).toBe(false);
  });

  it("ECO-04 level 17 masih bisa, level 18 ditolak", () => {
    const almost = asBoundary(createInitialState({ runId: RUN.economy }), "wall level 17", {
      wallLevel: 17,
      gold: 600,
    });
    expect(getUpgradeCost(almost, "wall")).toBe(555);
    const capped = mustOk(upgradeWall(almost));
    expect(capped.wallLevel).toBe(18);
    expect(capped.gold).toBe(45);
    expect(getEffectiveDefense(capped)).toBe(56);

    const full = asBoundary(capped, "wall sudah 18 dan jatah masih ada", {
      actionUsedToday: false,
      gold: 1000,
    });
    const blocked = callWithoutMutating(full, (current) => upgradeWall(current));
    expectError(blocked, "MAX_UPGRADE");
  });

  it("ECO-05 satu aksi berhasil, gagal tidak menghabiskan jatah, skip boleh", () => {
    const state = createInitialState({ runId: RUN.economy });
    const once = mustOk(upgradeWall(state));
    const second = callWithoutMutating(once, (current) => upgradeTroops(current));
    expectError(second, "NO_ACTION_LEFT");
    expect(once.gold).toBe(83);

    const broke = asBoundary(state, "gold tidak cukup untuk upgrade", { gold: 10 });
    const failed = callWithoutMutating(broke, (current) => upgradeCity(current));
    expectError(failed, "INSUFFICIENT_GOLD");
    expect(broke.actionUsedToday).toBe(false);

    const skipped = mustOk(endPreparationDay(state));
    expect(skipped.day).toBe(2);
    expect(skipped.actionUsedToday).toBe(false);
  });

  it("ECO-06 repair parsial, dekat maksimum, dan tolak saat penuh", () => {
    const state = createInitialState({ runId: RUN.economy });
    const low = asBoundary(state, "HP 80", { cityHp: 80, gold: 200 });
    const partial = mustOk(repairCity(low));
    expect(partial.cityHp).toBe(140);
    expect(partial.gold).toBe(175);

    const near = asBoundary(state, "HP 140 dari 150", { cityHp: 140, gold: 200 });
    const topped = mustOk(repairCity(near));
    expect(topped.cityHp).toBe(150);
    expect(topped.cityMaxHp).toBe(150);

    const full = callWithoutMutating(state, (current) => repairCity(current));
    expectError(full, "HP_FULL");
  });

  it("ECO-07 diskon tidak berlaku pada repair dan biaya dibulatkan ke atas", () => {
    const state = createInitialState({ runId: RUN.economy });
    const discounted = asBoundary(state, "diskon upgrade 25% sampai wave 2", {
      effects: {
        defenseByWave: {},
        upgradeDiscountRate: 0.25,
        upgradeDiscountUntilWave: 2,
        prepIncomeBonus: 0,
      },
    });
    expect(getUpgradeCost(discounted, "troops")).toBe(34);
    expect(getRepairCost(discounted)).toBe(25);

    const hard = asBoundary(
      createInitialState({ runId: RUN.economy, difficulty: "hard" }),
      "hard lalu diskon 25%",
      {
        effects: {
          defenseByWave: {},
          upgradeDiscountRate: 0.25,
          upgradeDiscountUntilWave: 2,
          prepIncomeBonus: 0,
        },
      },
    );
    expect(getUpgradeCost(hard, "troops")).toBe(37);
    expect(getRepairCost(hard)).toBe(27);

    const larger = asBoundary(discounted, "rate tersimpan 30%, bukan 25%+30%", {
      effects: {
        defenseByWave: {},
        upgradeDiscountRate: 0.3,
        upgradeDiscountUntilWave: 2,
        prepIncomeBonus: 0,
      },
    });
    expect(getUpgradeCost(larger, "troops")).toBe(32);
  });
});