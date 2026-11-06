import { describe, expect, it } from "vitest";
import {
  chooseEventOption,
  chooseReward,
  continueFromReport,
  createInitialState,
  endPreparationDay,
  gameConfig,
  getEffectiveStats,
  getUpgradeCost,
  repairCity,
  startBattle,
  upgradeCity,
  upgradeTroops,
  upgradeWall,
  type ActionResult,
  type GameState,
} from "./index";

function must(result: ActionResult): GameState {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.state;
}

function snapshot(state: GameState): GameState {
  return structuredClone(state);
}

describe("initial state", () => {
  it("grants day-1 income once and derives stats without storing totals", () => {
    const state = createInitialState({ runId: "run-a" });
    expect(state.version).toBe(3);
    expect(state.wallLevel).toBe(0);
    expect(state.troopLevel).toBe(0);
    expect(state.cityLevel).toBe(0);
    expect(state.revision).toBe(0);
    expect(state.day).toBe(1);
    expect(state.phase).toBe("preparation");
    expect(state.gold).toBe(gameConfig.startingGold + gameConfig.dailyIncome);
    expect(state.incomeGrantedDays).toEqual([1]);
    expect(state.cityHp).toBe(gameConfig.cityMaxHp);
    const stats = getEffectiveStats(state);
    expect(stats.attack).toBe(gameConfig.baseAttack);
    expect(stats.defense).toBe(gameConfig.baseDefense);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe("economy", () => {
  it("raises one track per spend and shares the daily action slot", () => {
    let state = createInitialState();
    const before = snapshot(state);
    const troops = must(upgradeTroops(state));
    expect(state).toEqual(before);
    expect(troops.gold).toBe(state.gold - 50);
    expect(troops.troopLevel).toBe(1);
    expect(troops.wallLevel).toBe(0);
    expect(troops.cityLevel).toBe(0);
    expect(troops.actionUsedToday).toBe(true);
    expect(troops.revision).toBe(1);
    expect(getEffectiveStats(troops).attack).toBe(15);
    expect(getEffectiveStats(troops).defense).toBe(2);

    const second = upgradeWall(troops);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("NO_ACTION_LEFT");
    expect(troops.gold).toBe(state.gold - 50);

    const broke = { ...createInitialState(), gold: 10 };
    const brokeBefore = snapshot(broke);
    const denied = upgradeTroops(broke);
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("INSUFFICIENT_GOLD");
    expect(broke).toEqual(brokeBefore);
    expect(broke.actionUsedToday).toBe(false);
  });

  it("raises max HP and income on city upgrade without a full heal", () => {
    const hurt = { ...createInitialState(), cityHp: 100, gold: 200 };
    const upgraded = must(upgradeCity(hurt));
    expect(upgraded.cityLevel).toBe(1);
    expect(upgraded.cityMaxHp).toBe(gameConfig.cityMaxHp + gameConfig.cityMaxHpBonus);
    expect(upgraded.cityHp).toBe(100 + gameConfig.cityMaxHpBonus);
    expect(getEffectiveStats(upgraded).attack).toBe(gameConfig.baseAttack);
    expect(getEffectiveStats(upgraded).defense).toBe(gameConfig.baseDefense);

    const next = must(endPreparationDay(upgraded));
    expect(next.gold).toBe(upgraded.gold + gameConfig.dailyIncome + gameConfig.cityIncomeBonus);
  });

  it("rejects max upgrade and full-HP repair, and caps partial repair", () => {
    const capped = {
      ...createInitialState(),
      wallLevel: gameConfig.maxTrackLevel,
      troopLevel: gameConfig.maxTrackLevel,
      cityLevel: gameConfig.maxTrackLevel,
      gold: 500,
    };
    expect(upgradeWall(capped).ok).toBe(false);
    expect(upgradeTroops(capped).ok).toBe(false);
    const maxed = upgradeCity(capped);
    expect(maxed.ok).toBe(false);
    if (!maxed.ok) expect(maxed.error.code).toBe("MAX_UPGRADE");
    expect(capped.actionUsedToday).toBe(false);

    const full = repairCity(createInitialState());
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.error.code).toBe("HP_FULL");

    const hurt = { ...createInitialState(), cityHp: 140, gold: 100 };
    const repaired = must(repairCity(hurt));
    expect(repaired.cityHp).toBe(150);
    expect(repaired.gold).toBe(70);
  });

  it("ceils a discounted upgrade cost and does not discount repair", () => {
    const state: GameState = {
      ...createInitialState(),
      wallLevel: 3,
      troopLevel: 3,
      cityLevel: 3,
      gold: 200,
      effects: {
        defenseByWave: {},
        upgradeDiscountRate: 0.25,
        upgradeDiscountUntilWave: 2,
        prepIncomeBonus: 0,
      },
    };
    expect(getUpgradeCost(state, "wall")).toBe(83);
    expect(getUpgradeCost(state, "troops")).toBe(83);
    expect(getUpgradeCost(state, "city")).toBe(83);
    const upgraded = must(upgradeWall(state));
    expect(upgraded.gold).toBe(200 - 83);
    expect(upgraded.wallLevel).toBe(4);
    expect(getEffectiveStats(upgraded).defense).toBe(gameConfig.baseDefense + 4 * gameConfig.wallDefenseBonus);
    const wounded = { ...state, cityHp: 100, actionUsedToday: false };
    expect(must(repairCity(wounded)).gold).toBe(200 - gameConfig.repairCost);
  });
});

describe("calendar", () => {
  it("grants income once per preparation day and not on battle day", () => {
    let state = createInitialState();
    state = must(endPreparationDay(state));
    expect(state.day).toBe(2);
    expect(state.gold).toBe(gameConfig.startingGold + gameConfig.dailyIncome * 2);
    expect(state.incomeGrantedDays).toEqual([1, 2]);
    expect(state.actionUsedToday).toBe(false);

    state = must(endPreparationDay(state));
    expect(state.day).toBe(3);
    expect(state.phase).toBe("event");
    const blocked = endPreparationDay(state);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe("EVENT_REQUIRED");

    const tampered = { ...state, phase: "preparation" as const };
    const stillBlocked = upgradeTroops(tampered);
    expect(stillBlocked.ok).toBe(false);
    if (!stillBlocked.ok) expect(stillBlocked.error.code).toBe("EVENT_REQUIRED");
  });
});

describe("events", () => {
  it("applies a choice once and can end the run on fatal damage", () => {
    let state = createInitialState();
    state = must(endPreparationDay(state));
    state = must(endPreparationDay(state));
    expect(state.activeEvent?.eventId).toBe("event-day-3");
    const resolved = must(chooseEventOption(state, "day3-pay"));
    expect(resolved.phase).toBe("preparation");
    expect(resolved.gold).toBe(state.gold - 20);
    expect(resolved.effects.defenseByWave[1]).toBe(4);
    expect(resolved.actionUsedToday).toBe(false);
    expect(resolved.incomeGrantedDays).toEqual(state.incomeGrantedDays);
    const again = chooseEventOption(resolved, "day3-skip");
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("EVENT_ALREADY_RESOLVED");

    const dying: GameState = {
      ...createInitialState(),
      day: 7,
      phase: "event",
      cityHp: 5,
      activeEvent: {
        eventId: "event-day-7",
        packageId: "event-day-7",
        day: 7,
        title: "x",
        description: "x",
        source: "local",
        choices: gameConfig.events[1].choices,
      },
    };
    const dead = must(chooseEventOption(dying, "day7-hurt"));
    expect(dead.phase).toBe("gameOver");
    expect(dead.cityHp).toBe(0);
    expect(upgradeTroops(dead).ok).toBe(false);
  });
});

describe("battle and reward", () => {
  it("resolves simultaneous damage once and keeps the stored report", () => {
    const ready: GameState = {
      ...createInitialState(),
      day: 10,
      phase: "battleReady",
      troopLevel: 5,
      wallLevel: 5,
      cityHp: 50,
      actionUsedToday: false,
    };
    const fought = must(startBattle(ready));
    expect(fought.battleResult?.won).toBe(false);
    expect(fought.battleResult?.monsterHpAfter).toBe(0);
    expect(fought.battleResult?.cityHpAfter).toBe(0);
    expect(fought.phase).toBe("gameOver");
    expect(fought.battleResult?.monsterHpLost).toBe(150);
    expect(fought.battleResult?.cityHpLost).toBe(50);
    expect(fought.battleResult?.cityHpLost).toBe(fought.battleResult?.cityHpBefore! - fought.battleResult?.cityHpAfter!);

    const winner = must(
      startBattle({
        ...createInitialState(),
        day: 10,
        phase: "battleReady",
        troopLevel: 3,
        wallLevel: 3,
      }),
    );
    const hp = winner.cityHp;
    const again = startBattle(winner);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("BATTLE_ALREADY_RESOLVED");
    expect(winner.cityHp).toBe(hp);

    const reloaded = JSON.parse(JSON.stringify(winner)) as GameState;
    expect(startBattle(reloaded).ok).toBe(false);
    expect(reloaded.cityHp).toBe(hp);
  });

  it("uses minimum 1 city damage when defense exceeds monster attack", () => {
    const ready: GameState = {
      ...createInitialState(),
      day: 10,
      phase: "battleReady",
      wallLevel: 5,
      effects: {
        defenseByWave: { 1: 100 },
        upgradeDiscountRate: 0,
        upgradeDiscountUntilWave: null,
        prepIncomeBonus: 0,
      },
    };
    const fought = must(startBattle(ready));
    expect(fought.battleResult?.rounds[0]?.damageToCity).toBe(1);
    expect(fought.battleResult?.cityDefense).toBeGreaterThan(22);
  });

  it("moves a wave-1 win into day 11 with reward income applied first", () => {
    let state: GameState = {
      ...createInitialState(),
      day: 10,
      phase: "battleReady",
      troopLevel: 3,
      wallLevel: 3,
      gold: 80,
    };
    state = must(startBattle(state));
    expect(state.phase).toBe("battleReport");
    expect(state.battleResult?.won).toBe(true);
    expect(state.cityHp).toBe(state.battleResult?.cityHpAfter);
    state = must(continueFromReport(state));
    expect(state.phase).toBe("reward");
    const goldBefore = state.gold;
    state = must(chooseReward(state, "reward-income"));
    expect(state.day).toBe(11);
    expect(state.phase).toBe("preparation");
    expect(state.rewardChosenId).toBe("reward-income");
    expect(state.gold).toBe(goldBefore + gameConfig.dailyIncome + 6);
    expect(state.incomeGrantedDays).toContain(11);
    const repeat = chooseReward(state, "reward-gold");
    expect(repeat.ok).toBe(false);
    if (!repeat.ok) expect(repeat.error.code).toBe("REWARD_ALREADY_CHOSEN");
  });
});

describe("20-day campaign", () => {
  it("reaches victory through public actions only", () => {
    let state = createInitialState({ runId: "campaign" });
    const spend = (action: (current: GameState) => ActionResult, label: string) => {
      const next = action(state);
      if (!next.ok) throw new Error(`${label} ${next.error.code} day ${state.day} gold ${state.gold}`);
      state = next.state;
    };
    const skip = () => {
      state = must(endPreparationDay(state));
    };
    const choose = (id: string) => {
      state = must(chooseEventOption(state, id));
    };

    spend(upgradeCity, "d1 city");
    skip();
    spend(upgradeCity, "d2 city");
    skip();
    choose("day3-skip");
    skip();
    spend(upgradeCity, "d4 city");
    skip();
    spend(upgradeTroops, "d5 troops");
    skip();
    spend(upgradeTroops, "d6 troops");
    skip();
    choose("day7-pay");
    skip();
    spend(upgradeTroops, "d8 troops");
    skip();
    skip();
    expect(state.day).toBe(10);
    expect(state.phase).toBe("battleReady");
    expect(state.incomeGrantedDays).not.toContain(10);

    state = must(startBattle(state));
    expect(state.battleResult?.won).toBe(true);
    state = must(continueFromReport(state));
    state = must(chooseReward(state, "reward-income"));
    expect(state.day).toBe(11);

    spend(repairCity, "d11 repair");
    skip();
    spend(repairCity, "d12 repair");
    skip();
    choose("day13-discount");
    spend(repairCity, "d13 repair");
    skip();
    spend(repairCity, "d14 repair");
    skip();
    spend(upgradeTroops, "d15 troops");
    skip();
    spend(upgradeWall, "d16 wall");
    skip();
    choose("day17-pay");
    spend(upgradeWall, "d17 wall");
    skip();
    spend(upgradeTroops, "d18 troops");
    skip();
    spend(upgradeWall, "d19 wall");
    skip();
    expect(state.day).toBe(20);
    expect(state.phase).toBe("battleReady");
    expect(state.incomeGrantedDays).not.toContain(20);

    state = must(startBattle(state));
    expect(state.battleResult?.won).toBe(true);
    expect(state.cityHp).toBeGreaterThan(0);
    state = must(continueFromReport(state));
    expect(state.phase).toBe("victory");
    expect(state.troopLevel).toBe(5);
    expect(state.wallLevel).toBe(3);
    expect(state.cityLevel).toBe(3);
    expect(upgradeCity(state).ok).toBe(false);
    expect(endPreparationDay(state).ok).toBe(false);
  });
});
