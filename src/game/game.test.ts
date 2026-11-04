import { describe, expect, it } from "vitest";
import { resolveBattle } from "./battle";
import { EVENT_PACKAGES, GAME_CONFIG, REWARD_OPTIONS } from "./config";
import { upgradeCity, repairCity } from "./economy";
import { ensureLocalEvent, chooseEventOption } from "./events";
import { createInitialState } from "./initialState";
import { getEffectiveStats, rawUpgradeCost, discountedCost } from "./stats";
import {
  chooseReward,
  continueFromReport,
  endPreparationDay,
  enterDay,
  startBattle,
} from "./transitions";
import type { GameState } from "./types";

function must<T>(r: { ok: true; state: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.state;
}

function advancePrep(state: GameState, choiceId?: string): GameState {
  let s = state;
  if (s.phase === "event") {
    s = ensureLocalEvent(s);
    const free =
      choiceId ??
      EVENT_PACKAGES.find((p) => p.id === s.activeEvent!.packageId)!.choices.find(
        (c) => c.goldCost === 0,
      )!.id;
    s = must(chooseEventOption(s, free));
  }
  return must(endPreparationDay(s));
}

describe("income and calendar", () => {
  it("grants day-1 income once and skips battle-day income", () => {
    const s0 = createInitialState("test-run");
    expect(s0.day).toBe(1);
    expect(s0.gold).toBe(
      GAME_CONFIG.goldBeforeDay1Income + GAME_CONFIG.dailyIncome,
    );
    expect(s0.incomeGrantedForDay).toBe(1);

    const again = must(enterDay(s0, 1));
    expect(again.gold).toBe(s0.gold);

    let s = s0;
    for (let d = 1; d < 10; d++) s = advancePrep(s);
    expect(s.day).toBe(10);
    expect(s.phase).toBe("battleReady");
    const goldBefore = s.gold;
    // entering day 10 must not add income
    expect(s.incomeGrantedForDay).toBe(9);
    expect(s.gold).toBe(goldBefore);
  });
});

describe("economy", () => {
  it("allows one successful action per day; failed action keeps slot", () => {
    let s = createInitialState("eco");
    s = { ...s, gold: 0 };
    const fail = upgradeCity(s);
    expect(fail.ok).toBe(false);
    expect(s.actionUsedToday).toBe(false);

    s = { ...s, gold: 200 };
    s = must(upgradeCity(s));
    expect(s.actionUsedToday).toBe(true);
    expect(upgradeCity(s).ok).toBe(false);
  });

  it("scales upgrade cost and caps level; repair respects max HP", () => {
    let s = createInitialState("up");
    s = { ...s, gold: 10_000 };
    expect(getEffectiveStats(s).upgradeCost).toBe(rawUpgradeCost(0));
    s = must(upgradeCity(s));
    expect(s.upgradeLevel).toBe(1);
    expect(getEffectiveStats(s).attack).toBe(
      GAME_CONFIG.baseAttack + GAME_CONFIG.upgradeAttackBonus,
    );
    expect(getEffectiveStats(s).defense).toBe(
      GAME_CONFIG.baseDefense + GAME_CONFIG.upgradeDefenseBonus,
    );

    s = { ...s, actionUsedToday: false };
    for (let i = 1; i < GAME_CONFIG.maxUpgradeLevel; i++) {
      s = must(upgradeCity({ ...s, actionUsedToday: false, day: s.day }));
    }
    expect(s.upgradeLevel).toBe(5);
    expect(upgradeCity({ ...s, actionUsedToday: false }).ok).toBe(false);

    s = {
      ...s,
      phase: "preparation",
      actionUsedToday: false,
      cityHp: s.cityMaxHp,
      gold: 100,
    };
    expect(repairCity(s).ok).toBe(false);

    s = { ...s, cityHp: s.cityMaxHp - 10 };
    s = must(repairCity(s));
    expect(s.cityHp).toBe(s.cityMaxHp);
  });

  it("does not stack discounts; ceils cost", () => {
    const rate = 0.25;
    expect(discountedCost(50, rate)).toBe(38);
    expect(discountedCost(70, 0.25)).toBe(53);
    let s = createInitialState("disc");
    s = {
      ...s,
      effects: {
        ...s.effects,
        upgradeDiscounts: [
          { rate: 0.1, untilWave: 1, sourceId: "a" },
          { rate: 0.25, untilWave: 1, sourceId: "b" },
        ],
      },
    };
    expect(getEffectiveStats(s).upgradeDiscountRate).toBe(0.25);
    expect(getEffectiveStats(s).upgradeCost).toBe(38);
  });
});

describe("battle", () => {
  it("applies simultaneous damage, min 1 to city, and city-zero loses on mutual KO", () => {
    const highDef = must(
      resolveBattle(
        { hp: 50, attack: 10, defense: 100 },
        { name: "X", hp: 30, attack: 5 },
        1,
      ),
    );
    expect(highDef.rounds[0].damageToCity).toBe(1);

    const mutual = must(
      resolveBattle(
        { hp: 10, attack: 50, defense: 0 },
        { name: "Y", hp: 10, attack: 50 },
        1,
      ),
    );
    expect(mutual.won).toBe(false);
    expect(mutual.cityHpAfter).toBe(0);
    expect(mutual.monsterHpAfter).toBe(0);

    const overkill = must(
      resolveBattle(
        { hp: 100, attack: 200, defense: 0 },
        { name: "Z", hp: 50, attack: 5 },
        1,
      ),
    );
    expect(overkill.cityHpBefore - overkill.cityHpAfter).toBe(5);
    expect(overkill.monsterHpAfter).toBe(0);
  });

  it("rejects invalid battle config", () => {
    expect(
      resolveBattle(
        { hp: 0, attack: 10, defense: 0 },
        { name: "Z", hp: 10, attack: 1 },
        1,
      ).ok,
    ).toBe(false);
  });
});

describe("events and rewards", () => {
  it("rejects bad choice / poor gold; fatal HP ends game; no double resolve", () => {
    let s = createInitialState("ev");
    while (s.day < 7) s = advancePrep(s);
    expect(s.phase).toBe("event");
    s = ensureLocalEvent(s);
    s = { ...s, gold: 0 };
    const paid = EVENT_PACKAGES.find((p) => p.day === 7)!.choices[0];
    expect(chooseEventOption(s, paid.id).ok).toBe(false);
    expect(chooseEventOption(s, "nope").ok).toBe(false);

    s = { ...s, cityHp: 5, gold: 100 };
    s = must(chooseEventOption(s, "event-day-7-b"));
    expect(s.phase).toBe("gameOver");

    let s2 = createInitialState("ev2");
    while (s2.day < 3) s2 = advancePrep(s2);
    s2 = ensureLocalEvent(s2);
    s2 = must(chooseEventOption(s2, "event-day-3-b"));
    s2 = { ...s2, phase: "event", activeEvent: ensureLocalEvent({ ...s2, phase: "event", activeEvent: null, day: 3 }).activeEvent };
    // already completed — even if we force phase
    s2 = {
      ...s2,
      phase: "event",
      day: 3,
      activeEvent: {
        packageId: "event-day-3",
        day: 3,
        title: "t",
        description: "d",
        choiceIds: ["event-day-3-a", "event-day-3-b"],
        source: "fallback",
      },
    };
    expect(chooseEventOption(s2, "event-day-3-b").ok).toBe(false);
  });

  it("applies reward once and income bonus only on days 11–19", () => {
    let s = createInitialState("rw");
    s = {
      ...s,
      phase: "reward",
      day: 10,
      wavesCleared: 1,
      battleResult: {
        wave: 1,
        won: true,
        rounds: [],
        cityHpBefore: 150,
        cityHpAfter: 80,
        monsterHpBefore: 150,
        monsterHpAfter: 0,
        cityAttack: 20,
        cityDefense: 6,
        monsterAttack: 22,
      },
    };
    const goldBefore = s.gold;
    s = must(chooseReward(s, "reward-income"));
    expect(s.day).toBe(11);
    expect(s.effects.incomeBonus).toBe(6);
    expect(s.gold).toBe(goldBefore + GAME_CONFIG.dailyIncome + 6);
    expect(chooseReward({ ...s, phase: "reward" }, "reward-gold").ok).toBe(
      false,
    );
    expect(REWARD_OPTIONS).toHaveLength(3);
  });
});

describe("state purity", () => {
  it("keeps input state intact and serializable", () => {
    const s = createInitialState("ser");
    const snap = JSON.parse(JSON.stringify(s)) as GameState;
    upgradeCity(s);
    expect(s).toEqual(snap);
    expect(() => JSON.stringify(s)).not.toThrow();
  });
});

describe("20-day integration", () => {
  it("wins via real actions without jumping phase", () => {
    let s = createInitialState("full");

    const playDay = (choice?: string, action?: "upgrade" | "repair") => {
      if (s.phase === "event") {
        s = ensureLocalEvent(s);
        const pkg = EVENT_PACKAGES.find((p) => p.id === s.activeEvent!.packageId)!;
        const id =
          choice ?? pkg.choices.find((c) => c.goldCost === 0)!.id;
        s = must(chooseEventOption(s, id));
      }
      if (action === "upgrade" && s.phase === "preparation") {
        const r = upgradeCity(s);
        if (r.ok) s = r.state;
      }
      if (action === "repair" && s.phase === "preparation") {
        const r = repairCity(s);
        if (r.ok) s = r.state;
      }
      if (s.phase === "preparation") s = must(endPreparationDay(s));
    };

    // lv2 for wave 1; discount reward; finish lv5 + repairs + day-17 defense.
    playDay(undefined, "upgrade");
    playDay(undefined, "upgrade");
    playDay("event-day-3-b");
    playDay();
    playDay();
    playDay();
    playDay("event-day-7-b");
    playDay();
    playDay();

    expect(s.phase).toBe("battleReady");
    expect(s.upgradeLevel).toBe(2);
    s = must(startBattle(s));
    expect(s.battleResult?.won).toBe(true);
    const hp = s.cityHp;
    const loaded = JSON.parse(JSON.stringify(s)) as GameState;
    expect(startBattle(loaded).ok).toBe(false);
    expect(loaded.cityHp).toBe(hp);
    s = must(continueFromReport(s));
    expect(s.phase).toBe("reward");
    s = must(chooseReward(s, "reward-discount"));
    expect(s.day).toBe(11);

    playDay(undefined, "upgrade");
    playDay(undefined, "upgrade");
    playDay("event-day-13-a", "upgrade");
    playDay(undefined, "repair");
    playDay(undefined, "repair");
    playDay(undefined, "repair");
    playDay("event-day-17-a", "repair");
    playDay(undefined, "repair");
    playDay();

    expect(s.phase).toBe("battleReady");
    expect(s.upgradeLevel).toBe(5);
    s = must(startBattle(s));
    expect(s.phase).toBe("battleReport");
    s = must(continueFromReport(s));
    expect(s.phase).toBe("victory");
  });
});
