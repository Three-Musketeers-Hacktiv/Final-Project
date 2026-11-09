import { describe, expect, it } from "vitest";
import { resolveBattle, type BattleSnapshot } from "./battle";
import {
  attachActiveEvent,
  chooseEventOption,
  chooseReward,
  continueFromReport,
  createInitialState,
  endPreparationDay,
  gameConfig,
  getEffectiveStats,
  getUpgradeCost,
  repairCity,
  resolveEventPackage,
  startBattle,
  upgradeCity,
  upgradeTroops,
  upgradeWall,
  surrender,
  type ActionResult,
  type ActiveEvent,
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
    expect(state.activeEvent?.day).toBe(3);
    expect(state.eventPlan.some((entry) => entry.day === 3 && entry.packageId === state.activeEvent?.packageId)).toBe(
      true,
    );
    const payId = state.activeEvent!.choices[0].id;
    const skipId = state.activeEvent!.choices[1].id;
    const resolved = must(chooseEventOption(state, payId));
    expect(resolved.phase).toBe("preparation");
    expect(resolved.gold).toBe(state.gold - 20);
    expect(resolved.effects.defenseByWave[1]).toBe(4);
    expect(resolved.actionUsedToday).toBe(false);
    expect(resolved.incomeGrantedDays).toEqual(state.incomeGrantedDays);
    const again = chooseEventOption(resolved, skipId);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("EVENT_ALREADY_RESOLVED");

    const base = createInitialState({ runId: "run-fatal-day7" });
    const day7 = resolveEventPackage(7, base.eventPlan)!;
    const dying: GameState = {
      ...base,
      day: 7,
      phase: "event",
      cityHp: 5,
      activeEvent: {
        eventId: day7.eventId,
        packageId: day7.packageId,
        day: 7,
        title: "x",
        description: "x",
        source: "local",
        choices: day7.choices,
      },
    };
    const hurtId = day7.choices[1].id;
    const dead = must(chooseEventOption(dying, hurtId));
    expect(dead.phase).toBe("gameOver");
    expect(dead.cityHp).toBe(0);
    expect(upgradeTroops(dead).ok).toBe(false);
  });

  it("assigns a deterministic event plan and varies packages across run ids", () => {
    const first = createInitialState({ runId: "run-alpha" });
    const again = createInitialState({ runId: "run-alpha" });
    expect(first.eventPlan).toEqual(again.eventPlan);
    expect(first.eventPlan).toHaveLength(4);
    expect(first.eventPlan.map((entry) => entry.day)).toEqual([3, 7, 13, 17]);

    let other = createInitialState({ runId: "run-0" });
    for (let index = 0; index < 64; index += 1) {
      other = createInitialState({ runId: `run-${index}` });
      if (JSON.stringify(other.eventPlan) !== JSON.stringify(first.eventPlan)) break;
    }
    expect(other.eventPlan).not.toEqual(first.eventPlan);
  });

  it("rejects a second attach with a new eventId for the same planned package", () => {
    let state = createInitialState({ runId: "run-event-guard" });
    state = must(endPreparationDay(state));
    state = must(endPreparationDay(state));
    expect(state.day).toBe(3);
    expect(state.phase).toBe("event");
    const payId = state.activeEvent!.choices[0].id;
    state = must(chooseEventOption(state, payId));
    expect(state.effects.defenseByWave[1]).toBe(4);

    const before = snapshot(state);
    const planned = resolveEventPackage(3, before.eventPlan)!;
    const forgedAttach: ActiveEvent = {
      eventId: `${planned.eventId}-forged`,
      packageId: planned.packageId,
      day: 3,
      title: "forged",
      description: "forged",
      source: "ai",
      choices: planned.choices,
    };
    const rejected = attachActiveEvent(state, forgedAttach);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.code).toBe("INVALID_CHOICE");
    expect(state).toEqual(before);
    expect(state.revision).toBe(before.revision);
    expect(state.effects.defenseByWave[1]).toBe(4);

    const replay = attachActiveEvent(state, {
      eventId: planned.eventId,
      packageId: planned.packageId,
      day: 3,
      title: planned.title,
      description: planned.description,
      source: "ai",
      choices: planned.choices,
    });
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.error.code).toBe("EVENT_ALREADY_RESOLVED");
    expect(state).toEqual(before);
    expect(state.effects.defenseByWave[1]).toBe(4);
  });

  it("rejects packages outside the run eventPlan and wrong day or phase", () => {
    let state = createInitialState({ runId: "run-event-plan" });
    state = must(endPreparationDay(state));
    state = must(endPreparationDay(state));
    const planned = resolveEventPackage(3, state.eventPlan)!;
    const other = gameConfig.events.find(
      (event) => event.day === 3 && event.packageId !== planned.packageId,
    )!;
    const before = snapshot(state);

    const wrongPackage = attachActiveEvent(state, {
      eventId: other.eventId,
      packageId: other.packageId,
      day: 3,
      title: other.title,
      description: other.description,
      source: "ai",
      choices: other.choices,
    });
    expect(wrongPackage.ok).toBe(false);
    if (!wrongPackage.ok) expect(wrongPackage.error.code).toBe("INVALID_CHOICE");
    expect(state).toEqual(before);

    const wrongDay = attachActiveEvent(state, {
      eventId: planned.eventId,
      packageId: planned.packageId,
      day: 7,
      title: planned.title,
      description: planned.description,
      source: "local",
      choices: planned.choices,
    });
    expect(wrongDay.ok).toBe(false);
    if (!wrongDay.ok) expect(wrongDay.error.code).toBe("INVALID_TRANSITION");

    const wrongPhase = attachActiveEvent(
      { ...state, phase: "battleReady", day: 10, activeEvent: null },
      {
        eventId: planned.eventId,
        packageId: planned.packageId,
        day: 10,
        title: planned.title,
        description: planned.description,
        source: "local",
        choices: planned.choices,
      },
    );
    expect(wrongPhase.ok).toBe(false);
    if (!wrongPhase.ok) expect(wrongPhase.error.code).toBe("INVALID_PHASE");
  });

  it("rejects inconsistent active identities and ignores forged choice effects", () => {
    let state = createInitialState({ runId: "run-event-identity" });
    state = must(endPreparationDay(state));
    state = must(endPreparationDay(state));
    const planned = resolveEventPackage(3, state.eventPlan)!;
    const before = snapshot(state);

    const inconsistent: GameState = {
      ...state,
      activeEvent: {
        ...state.activeEvent!,
        eventId: `${planned.eventId}-tampered`,
      },
    };
    const denied = chooseEventOption(inconsistent, planned.choices[0].id);
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("INVALID_CHOICE");
    expect(inconsistent).toEqual({
      ...before,
      activeEvent: {
        ...before.activeEvent!,
        eventId: `${planned.eventId}-tampered`,
      },
    });

    const forgedChoices: ActiveEvent = {
      ...state.activeEvent!,
      choices: [
        {
          ...planned.choices[0],
          effects: [{ type: "nextWaveDefense", amount: 99, wave: 1 }],
        },
        planned.choices[1],
      ],
    };
    const withForged: GameState = { ...state, activeEvent: forgedChoices };
    const applied = must(chooseEventOption(withForged, planned.choices[0].id));
    expect(applied.effects.defenseByWave[1]).toBe(4);
  });

  it("keeps identical active attach as a no-op and rejects late replacements", () => {
    let state = createInitialState({ runId: "run-event-noop" });
    state = must(endPreparationDay(state));
    state = must(endPreparationDay(state));
    const active = state.activeEvent!;
    const before = snapshot(state);

    const same = attachActiveEvent(state, {
      ...active,
      title: "late narrative",
      description: "should not replace",
      source: "ai",
    });
    expect(same.ok).toBe(true);
    if (same.ok) {
      expect(same.state).toEqual(before);
      expect(same.state.revision).toBe(before.revision);
      expect(same.state.activeEvent?.title).toBe(active.title);
    }

    const other = gameConfig.events.find(
      (event) => event.day === 3 && event.packageId !== active.packageId,
    )!;
    const replaced = attachActiveEvent(state, {
      eventId: other.eventId,
      packageId: other.packageId,
      day: 3,
      title: other.title,
      description: other.description,
      source: "ai",
      choices: other.choices,
    });
    expect(replaced.ok).toBe(false);
    if (!replaced.ok) expect(replaced.error.code).toBe("INVALID_CHOICE");
    expect(state).toEqual(before);

    const corruptActive: GameState = {
      ...state,
      activeEvent: { ...active, eventId: `${active.eventId}-stale` },
    };
    const lateValid = attachActiveEvent(corruptActive, active);
    expect(lateValid.ok).toBe(false);
    if (!lateValid.ok) expect(lateValid.error.code).toBe("INVALID_PHASE");
    expect(corruptActive.activeEvent?.eventId).toBe(`${active.eventId}-stale`);
  });
});

describe("resolveBattle validation", () => {
  const validBase = (): BattleSnapshot => {
    const wave = gameConfig.waves[0]!;
    return {
      wave: wave.wave,
      day: wave.day,
      cityHp: 100,
      cityAttack: 20,
      cityDefense: 5,
      monsterHp: wave.hp,
      monsterAttack: wave.attack,
    };
  };

  it("rejects NaN, Infinity, and -Infinity on every numeric field", () => {
    const fields: (keyof BattleSnapshot)[] = [
      "wave",
      "day",
      "cityHp",
      "cityAttack",
      "cityDefense",
      "monsterHp",
      "monsterAttack",
    ];
    for (const field of fields) {
      for (const bad of [NaN, Infinity, -Infinity]) {
        const battleSnap = { ...validBase(), [field]: bad } as BattleSnapshot;
        expect(resolveBattle(battleSnap)).toBeNull();
      }
    }
  });

  it("rejects non-positive HP/attack, negative defense, and invalid wave/day", () => {
    expect(resolveBattle({ ...validBase(), cityHp: 0 })).toBeNull();
    expect(resolveBattle({ ...validBase(), monsterHp: -1 })).toBeNull();
    expect(resolveBattle({ ...validBase(), cityAttack: 0 })).toBeNull();
    expect(resolveBattle({ ...validBase(), monsterAttack: 0 })).toBeNull();
    expect(resolveBattle({ ...validBase(), cityDefense: -1 })).toBeNull();
    expect(resolveBattle({ ...validBase(), day: 11 })).toBeNull();
    expect(resolveBattle({ ...validBase(), wave: 2, day: 10 })).toBeNull();
  });

  it("keeps a valid battle deterministic with finite HP", () => {
    const snap = validBase();
    const first = resolveBattle(snap);
    const second = resolveBattle(snap);
    expect(first).not.toBeNull();
    expect(second).toEqual(first);
    expect(Number.isFinite(first!.cityHpAfter)).toBe(true);
    expect(Number.isFinite(first!.monsterHpAfter)).toBe(true);
    expect(first!.cityHpLost).toBe(first!.cityHpBefore - first!.cityHpAfter);
    expect(first!.rounds.length).toBeGreaterThan(0);
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
    const choose = (index: 0 | 1) => {
      const event = state.activeEvent;
      if (!event) throw new Error(`No active event on day ${state.day}`);
      state = must(chooseEventOption(state, event.choices[index].id));
    };

    spend(upgradeCity, "d1 city");
    skip();
    spend(upgradeCity, "d2 city");
    skip();
    choose(1);
    skip();
    spend(upgradeCity, "d4 city");
    skip();
    spend(upgradeTroops, "d5 troops");
    skip();
    spend(upgradeTroops, "d6 troops");
    skip();
    choose(0);
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
    choose(1);
    spend(repairCity, "d13 repair");
    skip();
    spend(repairCity, "d14 repair");
    skip();
    spend(upgradeTroops, "d15 troops");
    skip();
    spend(upgradeWall, "d16 wall");
    skip();
    choose(0);
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

describe("surrender", () => {
  it("ends an active run as gameOver without changing other fields", () => {
    const before = createInitialState({ runId: "run-surrender" });
    const ended = must(surrender(before));
    expect(ended.phase).toBe("gameOver");
    expect(ended.revision).toBe(before.revision + 1);
    expect(ended.gold).toBe(before.gold);
    expect(ended.cityHp).toBe(before.cityHp);
    expect(ended.day).toBe(before.day);
    expect(ended.actionUsedToday).toBe(before.actionUsedToday);

    const again = surrender(ended);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("GAME_ENDED");
    expect(upgradeTroops(ended).ok).toBe(false);
  });

  it("rejects surrender after victory", () => {
    const victory: GameState = { ...createInitialState(), phase: "victory" };
    const result = surrender(victory);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("GAME_ENDED");
  });
});
