import { describe, expect, it } from "vitest";
import {
  attachActiveEvent,
  chooseEventOption,
  chooseReward,
  continueFromReport,
  createInitialState,
  decorateActiveEvent,
  endPreparationDay,
  ensureLocalEvent,
  gameConfig,
  getEffectiveStats,
  getRepairCost,
  getUpgradeCost,
  getWavePreview,
  hashString,
  isBattleDay,
  isPreparationDay,
  pickEventPlan,
  repairCity,
  resolveBattle,
  rewardsForWave,
  startBattle,
  surrender,
  upgradeCity,
  upgradeTroops,
  upgradeWall,
  type GameState,
} from "./index";

function mustOk(result: { ok: true; state: GameState } | { ok: false; error: unknown }): GameState {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("expected ok");
  return result.state;
}

function skipToDay(state: GameState, targetDay: number): GameState {
  let current = state;
  while (current.day < targetDay) {
    if (current.phase === "event" && current.activeEvent) {
      const free = current.activeEvent.choices.find((choice) => choice.goldCost === 0);
      expect(free).toBeTruthy();
      // Prefer free choices without consequence when available.
      const safe =
        current.activeEvent.choices.find(
          (choice) => choice.goldCost === 0 && !choice.consequence && choice.effects.length === 0,
        ) ??
        current.activeEvent.choices.find(
          (choice) => choice.goldCost === 0 && !choice.consequence,
        ) ??
        free!;
      current = mustOk(chooseEventOption(current, safe.id));
      continue;
    }
    if (current.phase === "preparation") {
      current = mustOk(endPreparationDay(current));
      continue;
    }
    throw new Error(`Cannot skip from phase ${current.phase} on day ${current.day}`);
  }
  return current;
}

function clearEventsIfAny(state: GameState): GameState {
  let current = state;
  while (current.phase === "event" && current.activeEvent) {
    const free =
      current.activeEvent.choices.find(
        (choice) => choice.goldCost === 0 && !choice.consequence && choice.effects.every((e) => e.type !== "damageCity"),
      ) ??
      current.activeEvent.choices.find((choice) => choice.goldCost === 0 && !choice.consequence) ??
      current.activeEvent.choices.find((choice) => choice.goldCost === 0)!;
    current = mustOk(chooseEventOption(current, free.id));
  }
  return current;
}

describe("calendar 100-day", () => {
  it("marks every 10th day as battle and others as prep within 1..100", () => {
    expect(isBattleDay(10)).toBe(true);
    expect(isBattleDay(100)).toBe(true);
    expect(isPreparationDay(1)).toBe(true);
    expect(isPreparationDay(9)).toBe(true);
    expect(isPreparationDay(11)).toBe(true);
    expect(isPreparationDay(10)).toBe(false);
    expect(isPreparationDay(101)).toBe(false);
  });

  it("grants day-1 income once and never on battle days", () => {
    const state = createInitialState({ runId: "income-run" });
    expect(state.version).toBe(4);
    expect(state.day).toBe(1);
    expect(state.incomeGrantedDays).toEqual([1]);
    expect(state.gold).toBe(gameConfig.startingGold + gameConfig.dailyIncome);

    let current = skipToDay(state, 10);
    expect(current.phase).toBe("battleReady");
    expect(current.incomeGrantedDays.includes(10)).toBe(false);
  });
});

describe("difficulty", () => {
  it("defaults to normal and matches base wave table in preview", () => {
    const normal = createInitialState({ runId: "diff-normal" });
    expect(normal.difficulty).toBe("normal");
    const preview = getWavePreview(normal)!;
    expect(preview.hp).toBe(150);
    expect(preview.attack).toBe(22);
  });

  it("scales monster stats and economy on easy/hard", () => {
    const easy = createInitialState({ runId: "diff-easy", difficulty: "easy" });
    const hard = createInitialState({ runId: "diff-hard", difficulty: "hard" });
    expect(getWavePreview(easy)!.hp).toBe(Math.max(1, Math.round(150 * 0.75)));
    expect(getWavePreview(hard)!.hp).toBe(Math.max(1, Math.round(150 * 1.3)));
    expect(getUpgradeCost(easy, "wall")).toBeLessThan(getUpgradeCost(hard, "wall"));
    expect(getRepairCost(easy)).toBeLessThan(getRepairCost(hard));
    expect(getEffectiveStats(easy).dailyIncome).toBeGreaterThan(getEffectiveStats(hard).dailyIncome);
  });
});

describe("event plan", () => {
  it("picks two stable prep days per decade for a runId", () => {
    const a = pickEventPlan("plan-a");
    const b = pickEventPlan("plan-a");
    const c = pickEventPlan("plan-b");
    expect(a).toEqual(b);
    expect(a).toHaveLength(20);
    expect(a.every((entry) => isPreparationDay(entry.day))).toBe(true);
    expect(a.some((entry) => entry.day === 1)).toBe(false);
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(c));
  });

  it("keeps packages with 2-4 choices and at least one free option", () => {
    const state = createInitialState({ runId: "choices-run" });
    for (const entry of state.eventPlan) {
      const dayState = skipToDay(createInitialState({ runId: "choices-run" }), entry.day);
      if (dayState.phase !== "event" || !dayState.activeEvent) continue;
      const count = dayState.activeEvent.choices.length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(4);
      expect(dayState.activeEvent.choices.some((choice) => choice.goldCost === 0)).toBe(true);
      break;
    }
  });
});

describe("economy", () => {
  it("allows one successful action per prep day and rejects failed spends without consuming slot", () => {
    let state = createInitialState({ runId: "eco-run", difficulty: "normal" });
    state = { ...state, gold: 5, actionUsedToday: false };
    const failed = upgradeWall(state);
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe("INSUFFICIENT_GOLD");
    expect(state.actionUsedToday).toBe(false);

    state = { ...state, gold: 200 };
    state = mustOk(upgradeTroops(state));
    expect(state.actionUsedToday).toBe(true);
    const second = upgradeWall(state);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("NO_ACTION_LEFT");
  });

  it("repairs without exceeding max HP", () => {
    let state = createInitialState({ runId: "repair-run" });
    state = { ...state, cityHp: state.cityMaxHp - 10, gold: 200 };
    state = mustOk(repairCity(state));
    expect(state.cityHp).toBe(Math.min(state.cityMaxHp, state.cityMaxHp - 10 + gameConfig.repairHeal));
    const full = repairCity({ ...state, actionUsedToday: false, cityHp: state.cityMaxHp });
    expect(full.ok).toBe(false);
  });
});

describe("battle", () => {
  it("rejects non-finite snapshots and resolves simultaneous damage", () => {
    expect(
      resolveBattle({
        wave: 1,
        day: 10,
        cityHp: 100,
        cityAttack: Number.NaN,
        cityDefense: 2,
        monsterHp: 50,
        monsterAttack: 10,
      }),
    ).toBeNull();

    const result = resolveBattle({
      wave: 1,
      day: 10,
      cityHp: 40,
      cityAttack: 20,
      cityDefense: 100,
      monsterHp: 30,
      monsterAttack: 10,
    });
    expect(result).not.toBeNull();
    expect(result!.rounds[0]!.damageToCity).toBe(1);
    expect(result!.won).toBe(true);
  });

  it("does not re-apply damage when battle already resolved", () => {
    let state = createInitialState({ runId: "battle-once" });
    state = skipToDay(state, 10);
    state = {
      ...state,
      troopLevel: 8,
      wallLevel: 8,
      cityHp: 200,
      cityMaxHp: 200,
      gold: 500,
    };
    state = mustOk(startBattle(state));
    expect(state.phase).toBe("battleReport");
    const hp = state.cityHp;
    const again = startBattle(state);
    expect(again.ok).toBe(false);
    expect(state.cityHp).toBe(hp);
  });
});

describe("rewards", () => {
  it("offers unique options per wave and rejects wrong-wave ids", () => {
    const w1 = rewardsForWave(1)!;
    const w2 = rewardsForWave(2)!;
    expect(w1.options.map((o) => o.id)).not.toEqual(w2.options.map((o) => o.id));

    let state = createInitialState({ runId: "reward-run" });
    state = skipToDay(state, 10);
    state = {
      ...state,
      troopLevel: 10,
      wallLevel: 10,
      cityLevel: 4,
      cityHp: 300,
      cityMaxHp: 300,
    };
    state = mustOk(startBattle(state));
    state = mustOk(continueFromReport(state));
    expect(state.phase).toBe("reward");
    const bad = chooseReward(state, w2.options[0]!.id);
    expect(bad.ok).toBe(false);
    state = mustOk(chooseReward(state, w1.options[0]!.id));
    expect(state.rewardsChosenByWave["1"]).toBe(w1.options[0]!.id);
    expect(state.day).toBe(11);
  });
});

describe("consequences", () => {
  it("schedules a deterministic consequence from a skip choice and fires later", () => {
    const runId = "consequence-run";
    let state = createInitialState({ runId });
    // Find first planned event day with a skip consequence choice.
    const firstDay = state.eventPlan[0]!.day;
    state = skipToDay(state, firstDay);
    state = clearEventsIfAny(state);
    // Re-enter if skip cleared; force ensure on exact day by recreating path.
    state = createInitialState({ runId });
    state = skipToDay(state, firstDay);
    expect(state.phase).toBe("event");
    expect(state.activeEvent).not.toBeNull();
    const skip = state.activeEvent!.choices.find((choice) => choice.consequence);
    if (!skip) {
      // Package may not include consequence; pick another plan day.
      const withConsequence = state.eventPlan.find((entry) => {
        const probe = skipToDay(createInitialState({ runId }), entry.day);
        return probe.activeEvent?.choices.some((choice) => choice.consequence);
      });
      expect(withConsequence).toBeTruthy();
      state = skipToDay(createInitialState({ runId }), withConsequence!.day);
    }
    const choice =
      state.activeEvent!.choices.find((entry) => entry.consequence) ??
      state.activeEvent!.choices.find((entry) => entry.goldCost === 0)!;
    if (!choice.consequence) return;

    state = mustOk(chooseEventOption(state, choice.id));
    expect(state.pendingConsequences.length).toBeGreaterThan(0);
    const pending = state.pendingConsequences[0]!;
    expect(pending.triggerDay).toBeGreaterThan(state.day);
    expect(isPreparationDay(pending.triggerDay)).toBe(true);

    const triggerHash = hashString(`${runId}:${choice.id}:${choice.consequence.packageId}:trigger`);
    expect(typeof triggerHash).toBe("number");

    state = skipToDay(state, pending.triggerDay);
    expect(state.phase).toBe("event");
    expect(state.activeEvent?.isConsequence).toBe(true);
    expect(state.activeEvent?.packageId).toBe(pending.packageId);
  });
});

describe("narrative overlay", () => {
  it("rewrites labels only for trusted choice ids", () => {
    let state = createInitialState({ runId: "narr-run" });
    const day = state.eventPlan[0]!.day;
    state = skipToDay(state, day);
    expect(state.activeEvent).not.toBeNull();
    const event = state.activeEvent!;
    const decorated = decorateActiveEvent(state, {
      title: "AI title",
      description: "AI body",
      choices: event.choices.map((choice) => ({ id: choice.id, label: `AI:${choice.id}` })),
      source: "ai",
    });
    expect(decorated.activeEvent?.title).toBe("AI title");
    expect(decorated.activeEvent?.choices[0]?.effects).toEqual(event.choices[0]?.effects);
    expect(decorated.activeEvent?.choices[0]?.goldCost).toBe(event.choices[0]?.goldCost);
  });
});

describe("campaign integration", () => {
  it("serializes state and supports surrender", () => {
    const state = createInitialState({ runId: "json-run", difficulty: "hard" });
    const json = JSON.stringify(state);
    const parsed = JSON.parse(json) as GameState;
    expect(parsed.version).toBe(4);
    expect(parsed.difficulty).toBe("hard");
    expect(parsed.eventPlan).toHaveLength(20);
    const ended = mustOk(surrender(state));
    expect(ended.phase).toBe("gameOver");
  });

  it("clears wave 1 through reward into day 11 with real actions", () => {
    let state = createInitialState({ runId: "campaign-w1" });
    // Buff enough to clear goblins reliably.
    while (state.day < 10) {
      state = clearEventsIfAny(state);
      if (state.phase === "preparation" && !state.actionUsedToday && state.gold >= getUpgradeCost(state, "troops")) {
        if (state.troopLevel < 6) state = mustOk(upgradeTroops(state));
        else if (state.wallLevel < 4) state = mustOk(upgradeWall(state));
        else if (state.cityLevel < 2) state = mustOk(upgradeCity(state));
      }
      if (state.phase === "preparation") state = mustOk(endPreparationDay(state));
    }
    expect(state.phase).toBe("battleReady");
    state = mustOk(startBattle(state));
    expect(state.battleResult?.won).toBe(true);
    state = mustOk(continueFromReport(state));
    expect(state.phase).toBe("reward");
    state = mustOk(chooseReward(state, rewardsForWave(1)!.options[2]!.id));
    expect(state.day).toBe(11);
    expect(state.rewardsChosenByWave["1"]).toBeTruthy();
  });

  it("reaches victory after wave 10 with a focused fixture", () => {
    let state = createInitialState({ runId: "victory-run", difficulty: "easy" });
    state = {
      ...state,
      day: 100,
      phase: "battleReady",
      troopLevel: 18,
      wallLevel: 18,
      cityLevel: 12,
      cityHp: 2000,
      cityMaxHp: 2000,
      gold: 500,
      wavesCleared: 9,
      effects: {
        defenseByWave: { 10: 80 },
        upgradeDiscountRate: 0,
        upgradeDiscountUntilWave: null,
        prepIncomeBonus: 0,
      },
      activeEvent: null,
      pendingConsequences: [],
      actionUsedToday: false,
    };
    state = mustOk(startBattle(state));
    expect(state.battleResult?.won).toBe(true);
    state = mustOk(continueFromReport(state));
    expect(state.phase).toBe("victory");
  });

  it("rejects attach of a foreign event package", () => {
    let state = createInitialState({ runId: "trust-run" });
    const day = state.eventPlan[0]!.day;
    state = skipToDay(state, day);
    const foreign = attachActiveEvent(
      { ...state, activeEvent: null, phase: "preparation" },
      {
        eventId: "fake",
        packageId: "fake",
        day,
        title: "x",
        description: "y",
        choices: [
          { id: "a", label: "a", goldCost: 0, effects: [] },
          { id: "b", label: "b", goldCost: 0, effects: [] },
        ],
        source: "ai",
      },
    );
    expect(foreign.ok).toBe(false);
  });

  it("ensureLocalEvent is idempotent for the same identity", () => {
    let state = createInitialState({ runId: "ensure-run" });
    const day = state.eventPlan[0]!.day;
    state = skipToDay(state, day);
    const first = mustOk(ensureLocalEvent(state));
    const second = mustOk(ensureLocalEvent(first));
    expect(second.revision).toBe(first.revision);
  });
});
