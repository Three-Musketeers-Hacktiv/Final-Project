import { describe, expect, it } from "vitest";
import * as gameApi from "./index";
import {
  attachActiveEvent,
  chooseEventOption,
  chooseReward,
  choiceLabelRespectsGoldCost,
  labelStatesCurrencyAmount,
  continueFromReport,
  createInitialState,
  decorateActiveEvent,
  endPreparationDay,
  ensureLocalEvent,
  eventPackageById,
  gameConfig,
  getDifficultyModifiers,
  getEffectiveDefense,
  getEffectiveStats,
  getRepairCost,
  getUpgradeCost,
  getWavePreview,
  hashString,
  isBattleDay,
  isPreparationDay,
  isTrustedConsequencePackage,
  pickEventPlan,
  repairCity,
  resolveBattle,
  rewardsForWave,
  scaleEventGoldCost,
  scaleMonsterStat,
  shiftPlanEntryDay,
  startBattle,
  surrender,
  upgradeCity,
  upgradeTroops,
  upgradeWall,
  type Effect,
  type GameState,
  type PendingConsequence,
} from "./index";
import { CONSEQUENCE_PACKAGES, SCHEDULED_EVENT_PACKAGES } from "./eventPackages";

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

function damageFrom(effects: Effect[]): number {
  return effects.reduce((total, effect) => total + (effect.type === "damageCity" ? effect.amount : 0), 0);
}

function eventChoiceId(state: GameState): string {
  const choices = state.activeEvent?.choices ?? [];
  const survivable = choices.filter((choice) => {
    if (choice.goldCost > state.gold) return false;
    return state.cityHp - damageFrom(choice.effects) > 0;
  });
  const pool = survivable.length > 0 ? survivable : choices.filter((choice) => choice.goldCost === 0);
  const scored = (pool.length > 0 ? pool : choices).map((choice) => {
    let score = choice.goldCost === 0 ? 1 : 0;
    for (const effect of choice.effects) {
      if (effect.type === "nextWaveDefense") score += effect.amount * 8;
      else if (effect.type === "upgradeDiscount") score += 24;
      else if (effect.type === "maxHpBonus") score += effect.amount * 2;
      else if (effect.type === "healCity") score += state.cityHp < state.cityMaxHp ? effect.amount : 0;
      else if (effect.type === "grantGold") score += 3;
      else if (effect.type === "damageCity") score -= effect.amount * 4;
    }
    if (choice.consequence) score -= 6;
    if (choice.goldCost > 0) score -= 30;
    return { id: choice.id, score };
  });
  scored.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  return scored[0]!.id;
}

function rewardChoiceId(state: GameState): string {
  const options = rewardsForWave(state.wavesCleared)!.options;
  const hpRatio = state.cityHp / state.cityMaxHp;
  const rank = (kind: string) => {
    if (kind === "maxHpBonus") return 0;
    if (kind === "nextWaveDefense" || kind === "combo") return 1;
    if (kind === "healCity") return hpRatio < 0.9 ? 2 : 6;
    if (kind === "upgradeDiscount") return 3;
    if (kind === "prepIncomeBonus") return 4;
    return 5;
  };
  return options.slice().sort((left, right) => rank(left.kind) - rank(right.kind) || left.id.localeCompare(right.id))[0]!.id;
}

function playCampaign(runId: string, difficulty: "easy" | "normal" | "hard"): GameState {
  let state = createInitialState({ runId, difficulty });
  for (let step = 0; step < 800 && state.phase !== "victory" && state.phase !== "gameOver"; step += 1) {
    if (state.phase === "event" && state.activeEvent) {
      state = mustOk(chooseEventOption(state, eventChoiceId(state)));
      continue;
    }
    if (state.phase === "preparation") {
      const hpRatio = state.cityHp / state.cityMaxHp;
      if (!state.actionUsedToday && hpRatio < 0.8 && state.gold >= getRepairCost(state) && state.cityHp < state.cityMaxHp) {
        state = mustOk(repairCity(state));
      } else if (!state.actionUsedToday) {
        const troopCost = getUpgradeCost(state, "troops");
        const wallCost = getUpgradeCost(state, "wall");
        const cityCost = getUpgradeCost(state, "city");
        if (state.troopLevel < 12 && state.gold >= troopCost) {
          state = mustOk(upgradeTroops(state));
        } else if (state.wallLevel < 8 && state.gold >= wallCost) {
          state = mustOk(upgradeWall(state));
        } else if (state.cityLevel < 8 && state.gold >= cityCost) {
          state = mustOk(upgradeCity(state));
        } else if (state.troopLevel < gameConfig.maxTrackLevel && state.gold >= troopCost) {
          state = mustOk(upgradeTroops(state));
        } else if (state.wallLevel < gameConfig.maxTrackLevel && state.gold >= wallCost) {
          state = mustOk(upgradeWall(state));
        } else if (state.cityLevel < gameConfig.maxTrackLevel && state.gold >= cityCost) {
          state = mustOk(upgradeCity(state));
        }
      }
      if (state.phase === "preparation") state = mustOk(endPreparationDay(state));
      continue;
    }
    if (state.phase === "battleReady") {
      state = mustOk(startBattle(state));
      continue;
    }
    if (state.phase === "battleReport") {
      state = mustOk(continueFromReport(state));
      continue;
    }
    if (state.phase === "reward") {
      state = mustOk(chooseReward(state, rewardChoiceId(state)));
      continue;
    }
    break;
  }
  return state;
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
    const normal = createInitialState({ runId: "diff-normal-cost", difficulty: "normal" });
    const hard = createInitialState({ runId: "diff-hard", difficulty: "hard" });
    expect(getWavePreview(easy)!.hp).toBe(Math.max(1, Math.round(150 * 0.75)));
    expect(getWavePreview(hard)!.hp).toBe(Math.max(1, Math.round(150 * 1.08)));
    expect(getUpgradeCost(easy, "wall")).toBeLessThan(getUpgradeCost(normal, "wall"));
    expect(getUpgradeCost(hard, "wall")).toBeGreaterThanOrEqual(getUpgradeCost(normal, "wall"));
    expect(getRepairCost(easy)).toBeLessThan(getRepairCost(normal));
    expect(getRepairCost(hard)).toBeGreaterThanOrEqual(getRepairCost(normal));
    expect(getEffectiveStats(easy).dailyIncome).toBeGreaterThan(getEffectiveStats(normal).dailyIncome);
    expect(getEffectiveStats(hard).dailyIncome).toBeLessThanOrEqual(getEffectiveStats(normal).dailyIncome);
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

  it("wins wave 9 and the Demon King at the upgrade ceiling on easy and normal", () => {
    const attack =
      gameConfig.baseAttack + gameConfig.maxTrackLevel * gameConfig.troopAttackBonus;
    const defense =
      gameConfig.baseDefense + gameConfig.maxTrackLevel * gameConfig.wallDefenseBonus;
    const cityHp =
      gameConfig.cityMaxHp + gameConfig.maxTrackLevel * gameConfig.cityMaxHpBonus;
    expect(attack).toBe(100);
    expect(defense).toBe(56);
    expect(cityHp).toBe(780);

    for (const difficulty of ["easy", "normal"] as const) {
      const mods = getDifficultyModifiers(difficulty);
      for (const waveNumber of [9, 10]) {
        const wave = gameConfig.waves.find((entry) => entry.wave === waveNumber)!;
        const result = resolveBattle({
          wave: wave.wave,
          day: wave.day,
          cityHp,
          cityAttack: attack,
          cityDefense: defense,
          monsterHp: scaleMonsterStat(wave.hp, mods.monsterHp),
          monsterAttack: scaleMonsterStat(wave.attack, mods.monsterAttack),
        });
        expect(result?.won, `${difficulty} wave ${waveNumber}`).toBe(true);
      }
    }
  });

  it("reaches victory on easy through public actions only", () => {
    const state = playCampaign("easy-campaign", "easy");
    expect(state.phase).toBe("victory");
    expect(state.wavesCleared).toBe(10);
    expect(state.day).toBe(100);
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

describe("public API surface", () => {
  it("does not export enterCalendarDay", () => {
    expect("enterCalendarDay" in gameApi).toBe(false);
  });

  it("rejects a second economic action on the same day", () => {
    let state = createInitialState({ runId: "action-slot", difficulty: "normal" });
    state = mustOk(upgradeWall(state));
    const second = upgradeTroops(state);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("NO_ACTION_LEFT");
  });

  it("rejects actions after the game has ended", () => {
    const ended = mustOk(surrender(createInitialState({ runId: "ended-run" })));
    expect(upgradeWall(ended).ok).toBe(false);
    expect(endPreparationDay(ended).ok).toBe(false);
  });
});

describe("event gold cost scaling", () => {
  function withEnvoyDay(difficulty: "easy" | "normal" | "hard"): GameState {
    const state = createInitialState({ runId: `gold-${difficulty}`, difficulty });
    return {
      ...state,
      day: 5,
      phase: "preparation",
      activeEvent: null,
      gold: 100,
      eventPlan: [
        { day: 5, packageId: "d1-envoy-b", eventId: "d1-envoy-b" },
        ...state.eventPlan.filter((entry) => entry.day !== 5 && entry.day >= 10),
      ],
    };
  }

  it.each([
    ["easy", 17],
    ["normal", 20],
    ["hard", 22],
  ] as const)("shows and charges scaled gold for %s", (difficulty, expectedCost) => {
    let state = mustOk(ensureLocalEvent(withEnvoyDay(difficulty)));
    const pay = state.activeEvent!.choices.find((choice) => choice.id === "d1-envoy-b-pay");
    expect(pay?.goldCost).toBe(expectedCost);
    expect(pay?.goldCost).toBe(scaleEventGoldCost(20, difficulty));
    expect(pay?.label.includes("{goldCost}")).toBe(false);
    expect(pay?.label.match(/\d/)).toBeNull();
    const before = state.gold;
    state = mustOk(chooseEventOption(state, "d1-envoy-b-pay"));
    expect(state.gold).toBe(before - expectedCost);
  });

  it("rejects when gold is one below the effective cost without mutating state", () => {
    let state = mustOk(ensureLocalEvent(withEnvoyDay("hard")));
    state = { ...state, gold: 21, revision: 7 };
    const snapshot = JSON.stringify(state);
    const result = chooseEventOption(state, "d1-envoy-b-pay");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INSUFFICIENT_GOLD");
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("keeps free choices at zero and decorate does not double-scale", () => {
    let state = mustOk(ensureLocalEvent(withEnvoyDay("easy")));
    const free = state.activeEvent!.choices.find((choice) => choice.goldCost === 0);
    expect(free).toBeTruthy();
    expect(free?.label.includes("{goldCost}")).toBe(false);
    expect(free?.label.match(/(\d+)\s*gold/i)).toBeNull();
    const beforeCost = state.activeEvent!.choices.find((choice) => choice.id === "d1-envoy-b-pay")!.goldCost;
    const decorated = decorateActiveEvent(state, {
      title: "t",
      description: "d",
      choices: state.activeEvent!.choices.map((choice) => ({ id: choice.id, label: `L:${choice.id}` })),
      source: "ai",
    });
    expect(decorated.activeEvent!.choices.find((choice) => choice.id === "d1-envoy-b-pay")!.goldCost).toBe(
      beforeCost,
    );
    const again = mustOk(ensureLocalEvent(decorated));
    expect(again.activeEvent!.choices.find((choice) => choice.id === "d1-envoy-b-pay")!.goldCost).toBe(
      beforeCost,
    );
  });

  it("drops an AI label whose gold claim disagrees with the effective cost", () => {
    let state = mustOk(ensureLocalEvent(withEnvoyDay("easy")));
    const engineLabel = state.activeEvent!.choices.find((choice) => choice.id === "d1-envoy-b-pay")!.label;
    const decorated = decorateActiveEvent(state, {
      title: "t",
      description: "The envoy still wants coin, about 99 gold in the story.",
      choices: state.activeEvent!.choices.map((choice) => ({
        id: choice.id,
        label: choice.id === "d1-envoy-b-pay" ? "Fund them: pay 99 gold" : choice.label,
      })),
      source: "ai",
    });
    expect(decorated.activeEvent!.choices.find((choice) => choice.id === "d1-envoy-b-pay")!.label).toBe(
      engineLabel,
    );
    expect(decorated.activeEvent!.choices.find((choice) => choice.id === "d1-envoy-b-pay")!.goldCost).toBe(17);
  });

  it.each([
    "Pay 99 pieces of gold",
    "Pay gold worth 99",
    "Pay gold: 99",
    "gold: 17",
    "cost 17 coins",
    "pay 17 gold",
    "pay ninety-nine gold",
    "twenty gold",
    "treasury: 40",
    "12 gp",
    "Spend treasury carefully",
  ])("falls back when an overlay mentions a currency term (%s)", (overlayLabel) => {
    let state = mustOk(ensureLocalEvent(withEnvoyDay("easy")));
    const snapshot = JSON.stringify(state);
    const engineLabel = state.activeEvent!.choices.find((choice) => choice.id === "d1-envoy-b-pay")!.label;
    const effects = state.activeEvent!.choices.find((choice) => choice.id === "d1-envoy-b-pay")!.effects;
    expect(labelStatesCurrencyAmount(overlayLabel)).toBe(true);
    expect(choiceLabelRespectsGoldCost(overlayLabel, 17)).toBe(false);
    const decorated = decorateActiveEvent(state, {
      title: "t",
      description: "The story may still mention 99 gold.",
      choices: state.activeEvent!.choices.map((choice) => ({
        id: choice.id,
        label: choice.id === "d1-envoy-b-pay" ? overlayLabel : "Hold the line",
      })),
      source: "ai",
    });
    expect(JSON.stringify(state)).toBe(snapshot);
    const pay = decorated.activeEvent!.choices.find((choice) => choice.id === "d1-envoy-b-pay")!;
    expect(pay.label).toBe(engineLabel);
    expect(pay.label).not.toMatch(/\d/);
    expect(pay.goldCost).toBe(17);
    expect(pay.effects).toEqual(effects);
    expect(decorated.activeEvent!.description).toContain("99 gold");
  });

  it("keeps free and grantGold mechanics when a currency overlay falls back", () => {
    const supplies = {
      ...createInitialState({ runId: "gold-grant", difficulty: "easy" }),
      day: 5,
      phase: "preparation" as const,
      activeEvent: null,
      gold: 100,
      eventPlan: [{ day: 5, packageId: "d1-supplies-a", eventId: "d1-supplies-a" }],
    };
    let state = mustOk(ensureLocalEvent(supplies));
    const snapshot = JSON.stringify(state);
    const free = state.activeEvent!.choices.find((choice) => choice.id === "d1-supplies-a-hurt")!;
    const grant = state.activeEvent!.choices.find((choice) => choice.id === "d1-supplies-a-gold")!;
    expect(free.goldCost).toBe(0);
    expect(grant.effects).toEqual([{ type: "grantGold", amount: 12 }]);
    const decorated = decorateActiveEvent(state, {
      title: "t",
      description: "Merchants mention gold in the story.",
      choices: state.activeEvent!.choices.map((choice) => ({
        id: choice.id,
        label:
          choice.id === free.id
            ? "Refuse and keep your gold"
            : choice.id === grant.id
              ? "Take extra gold now"
              : "Quiet refusal",
      })),
      source: "ai",
    });
    expect(JSON.stringify(state)).toBe(snapshot);
    const freeAfter = decorated.activeEvent!.choices.find((choice) => choice.id === free.id)!;
    const grantAfter = decorated.activeEvent!.choices.find((choice) => choice.id === grant.id)!;
    expect(freeAfter.label).toBe(free.label);
    expect(freeAfter.goldCost).toBe(0);
    expect(freeAfter.effects).toEqual(free.effects);
    expect(grantAfter.label).toBe(grant.label);
    expect(grantAfter.goldCost).toBe(0);
    expect(grantAfter.effects).toEqual([{ type: "grantGold", amount: 12 }]);
    expect(decorated.activeEvent!.description).toContain("gold");
  });

  it("keeps an overlay label that does not state a currency amount", () => {
    let state = mustOk(ensureLocalEvent(withEnvoyDay("easy")));
    const decorated = decorateActiveEvent(state, {
      title: "t",
      description: "d",
      choices: state.activeEvent!.choices.map((choice) => ({
        id: choice.id,
        label: choice.id === "d1-envoy-b-pay" ? "Reinforce the gate quietly" : choice.label,
      })),
      source: "ai",
    });
    expect(decorated.activeEvent!.choices.find((choice) => choice.id === "d1-envoy-b-pay")!.label).toBe(
      "Reinforce the gate quietly",
    );
    expect(choiceLabelRespectsGoldCost("Reinforce the gate quietly", 17)).toBe(true);
  });

  it("removes wave defense after that wave is resolved", () => {
    let state = mustOk(ensureLocalEvent(withEnvoyDay("normal")));
    state = mustOk(chooseEventOption(state, "d1-envoy-b-pay"));
    expect(state.effects.defenseByWave[1]).toBe(4);
    state = skipToDay(state, 10);
    state = mustOk(startBattle(state));
    expect(state.effects.defenseByWave[1]).toBeUndefined();
  });
});

describe("consequence successor trust", () => {
  it("accepts the origin package and forward successors only", () => {
    expect(isTrustedConsequencePackage("c-raid-wave1", "c-raid-wave1")).toBe(true);
    expect(isTrustedConsequencePackage("c-raid-wave1", "c-raid-wave2")).toBe(true);
    expect(isTrustedConsequencePackage("c-raid-wave1", "c-raid-mid")).toBe(true);
    expect(isTrustedConsequencePackage("c-raid-wave2", "c-raid-wave1")).toBe(false);
    expect(isTrustedConsequencePackage("c-raid-wave1", "c-unrest-mid")).toBe(false);
    expect(isTrustedConsequencePackage("c-raid-wave1", "c-foreign")).toBe(false);
  });
});

describe("consequence collision and queue", () => {
  it("review-1 schedules distinct trigger days and clears day 9 without recovery helper", () => {
    let state = createInitialState({ runId: "review-1", difficulty: "normal" });
    expect(pickEventPlan("review-1").filter((entry) => entry.day < 10).map((entry) => entry.day)).toEqual([
      6, 8,
    ]);

    state = skipToDay(state, 6);
    expect(state.activeEvent?.eventId).toBe("d1-supplies-a");
    state = mustOk(chooseEventOption(state, "d1-supplies-a-gold"));
    expect(state.pendingConsequences).toHaveLength(1);

    state = skipToDay(state, 8);
    expect(state.activeEvent?.eventId).toBe("d1-labor-b");
    state = mustOk(chooseEventOption(state, "d1-labor-b-discount"));
    expect(state.pendingConsequences).toHaveLength(2);
    const triggerDays = state.pendingConsequences.map((entry) => entry.triggerDay);
    expect(new Set(triggerDays).size).toBe(2);

    const firstTrigger = Math.min(...triggerDays);
    state = skipToDay(state, firstTrigger);
    expect(state.phase).toBe("event");
    expect(state.activeEvent?.isConsequence).toBe(true);
    while (state.phase === "event" && state.activeEvent) {
      const free = state.activeEvent.choices.find((choice) => choice.goldCost === 0)!;
      state = mustOk(chooseEventOption(state, free.id));
    }
    expect(state.pendingConsequences.filter((entry) => entry.triggerDay === firstTrigger)).toHaveLength(0);
    expect(endPreparationDay(state).ok).toBe(true);
  });

  it("chains a second same-day consequence without ensureLocalEvent", () => {
    const first: PendingConsequence = {
      id: "c-unrest-wave1::origin-a::choice-a::9",
      originEventId: "origin-a",
      originChoiceId: "choice-a",
      packageId: "c-unrest-wave1",
      triggerDay: 9,
    };
    const second: PendingConsequence = {
      id: "c-raid-wave1::origin-b::choice-b::9",
      originEventId: "origin-b",
      originChoiceId: "choice-b",
      packageId: "c-raid-wave1",
      triggerDay: 9,
    };
    let state = createInitialState({ runId: "same-day-queue" });
    state = {
      ...state,
      day: 9,
      phase: "preparation",
      activeEvent: null,
      pendingConsequences: [first, second],
      eventPlan: state.eventPlan.filter((entry) => entry.day !== 9),
      completedEventIds: [],
    };
    state = mustOk(ensureLocalEvent(state));
    expect(state.activeEvent?.eventId).toBe(first.id);
    const freeFirst = state.activeEvent!.choices.find((choice) => choice.goldCost === 0)!;
    state = mustOk(chooseEventOption(state, freeFirst.id));
    expect(state.phase).toBe("event");
    expect(state.activeEvent?.eventId).toBe(second.id);
    expect(state.completedEventIds).toContain(first.id);
    expect(state.pendingConsequences.map((entry) => entry.id)).toEqual([second.id]);

    const serialized = JSON.parse(JSON.stringify(state)) as GameState;
    const freeSecond = serialized.activeEvent!.choices.find((choice) => choice.goldCost === 0)!;
    state = mustOk(chooseEventOption(serialized, freeSecond.id));
    expect(state.phase).toBe("preparation");
    expect(state.activeEvent).toBeNull();
    expect(state.pendingConsequences).toHaveLength(0);
    expect(state.completedEventIds.filter((id) => id === first.id || id === second.id)).toHaveLength(2);
    expect(endPreparationDay(state).ok).toBe(true);
  });

  it("late-3 defers a wave-1 raid into a package that still helps the next wave", () => {
    let state = createInitialState({ runId: "late-3" });
    expect(state.eventPlan.filter((entry) => entry.day < 10).map((entry) => entry.day)).toEqual([6, 8]);

    state = skipToDay(state, 6);
    const skip6 = state.activeEvent!.choices.find((choice) => choice.goldCost === 0 && choice.consequence);
    expect(skip6).toBeTruthy();
    state = mustOk(chooseEventOption(state, skip6!.id));

    state = skipToDay(state, 8);
    const skip8 = state.activeEvent!.choices.find((choice) => choice.goldCost === 0 && choice.consequence);
    expect(skip8).toBeTruthy();
    state = mustOk(chooseEventOption(state, skip8!.id));

    const deferred = state.pendingConsequences.find((entry) => entry.triggerDay > 10);
    expect(deferred).toBeTruthy();
    expect(deferred!.packageId).not.toBe("c-raid-wave1");
    expect(deferred!.triggerDay).toBeLessThan(20);

    while (state.day < 10 && state.phase !== "gameOver") {
      if (state.phase === "event" && state.activeEvent) {
        state = mustOk(chooseEventOption(state, eventChoiceId(state)));
        continue;
      }
      if (state.phase === "preparation") {
        if (!state.actionUsedToday && state.cityHp < 120 && state.cityHp < state.cityMaxHp && state.gold >= getRepairCost(state)) {
          state = mustOk(repairCity(state));
        } else if (!state.actionUsedToday && state.troopLevel < 8 && state.gold >= getUpgradeCost(state, "troops")) {
          state = mustOk(upgradeTroops(state));
        } else if (!state.actionUsedToday && state.wallLevel < 4 && state.gold >= getUpgradeCost(state, "wall")) {
          state = mustOk(upgradeWall(state));
        }
        if (state.phase === "preparation") state = mustOk(endPreparationDay(state));
      }
    }
    state = mustOk(startBattle(state));
    expect(state.battleResult?.won).toBe(true);
    state = mustOk(continueFromReport(state));
    state = mustOk(chooseReward(state, rewardsForWave(1)!.options[0]!.id));

    state = skipToDay(state, deferred!.triggerDay);
    expect(state.activeEvent?.packageId).toBe(deferred!.packageId);
    expect(state.activeEvent?.packageId).not.toBe("c-raid-wave1");
    const defenseChoice = state.activeEvent!.choices.find((choice) =>
      choice.effects.some((effect) => effect.type === "nextWaveDefense"),
    );
    expect(defenseChoice).toBeTruthy();
    const before = getEffectiveDefense(state, 2);
    state = mustOk(chooseEventOption(state, defenseChoice!.id));
    expect(state.effects.defenseByWave[1]).toBeUndefined();
    expect(getEffectiveDefense(state, 2)).toBeGreaterThan(before);
  });

  it("shifts a colliding scheduled plan forward instead of deleting it", () => {
    const pkg = eventPackageById("d1-scouts-a");
    expect(pkg).toBeTruthy();
    const plan = [{ day: 9, packageId: "d1-scouts-a", eventId: "d1-scouts-a" }];
    const shifted = shiftPlanEntryDay(plan, 9, new Set([9]));
    expect(shifted).toHaveLength(1);
    expect(shifted[0]!.eventId).toBe("d1-scouts-a");
    expect(shifted[0]!.day).toBeGreaterThan(9);
    expect(isPreparationDay(shifted[0]!.day)).toBe(true);
  });
});

describe("scheduled choice dilemmas", () => {
  it("keeps a free choice and avoids a free reward that shares a skip's consequence", () => {
    for (const pkg of SCHEDULED_EVENT_PACKAGES) {
      expect(pkg.choices.some((choice) => choice.goldCost === 0)).toBe(true);
      expect(pkg.choices.some((choice) => /no hp loss|no further loss|lose discount/i.test(choice.label))).toBe(false);
      const rewarded = pkg.choices.filter(
        (choice) =>
          choice.goldCost === 0 &&
          choice.effects.some((effect) => effect.type === "grantGold" || effect.type === "maxHpBonus"),
      );
      for (const reward of rewarded) {
        const twin = pkg.choices.find(
          (choice) =>
            choice.id !== reward.id &&
            choice.goldCost === 0 &&
            choice.effects.length === 0 &&
            (choice.consequence?.packageId ?? null) === (reward.consequence?.packageId ?? null),
        );
        expect(twin, `${pkg.packageId}:${reward.id}`).toBeUndefined();
      }
    }
  });

  it("charges the same scaled cost on normal and hard for every paid choice", () => {
    for (const pkg of [...SCHEDULED_EVENT_PACKAGES, ...CONSEQUENCE_PACKAGES]) {
      for (const choice of pkg.choices) {
        if (choice.goldCost === 0) continue;
        const normal = scaleEventGoldCost(choice.goldCost, "normal");
        const hard = scaleEventGoldCost(choice.goldCost, "hard");
        expect(normal).toBe(choice.goldCost);
        expect(hard).toBeGreaterThanOrEqual(normal);
      }
    }
  });
});

describe("consequence choice dilemmas", () => {
  function openConsequence(
    packageId: string,
    day: number,
    patch: Partial<GameState> = {},
  ): GameState {
    const pending: PendingConsequence = {
      id: `${packageId}::origin::choice::${day}`,
      originEventId: "origin",
      originChoiceId: "origin-choice",
      packageId,
      triggerDay: day,
    };
    const base = createInitialState({ runId: `dilemma-${packageId}-${day}`, difficulty: "normal" });
    return mustOk(
      ensureLocalEvent({
        ...base,
        ...patch,
        day,
        phase: "preparation",
        activeEvent: null,
        eventPlan: [],
        pendingConsequences: [pending],
        completedEventIds: [],
      }),
    );
  }

  it("makes the late raid levy and the cheaper barricade different outcomes", () => {
    const paid = openConsequence("c-raid-late", 65, { gold: 100, cityHp: 150 });
    const cheap = openConsequence("c-raid-late", 65, { gold: 100, cityHp: 150 });
    const afterPay = mustOk(chooseEventOption(paid, "c-raid-late-pay"));
    const afterCheap = mustOk(chooseEventOption(cheap, "c-raid-late-def"));

    expect(afterPay.gold).toBe(65);
    expect(afterPay.cityHp).toBe(150);
    expect(afterPay.effects.defenseByWave[8]).toBe(3);
    expect(afterCheap.gold).toBe(80);
    expect(afterCheap.cityHp).toBe(136);
    expect(afterCheap.effects.defenseByWave[8]).toBe(2);
    expect(afterPay.gold).not.toBe(afterCheap.gold);
    expect(afterPay.cityHp).not.toBe(afterCheap.cityHp);
    expect(afterPay.effects.defenseByWave[8]).not.toBe(afterCheap.effects.defenseByWave[8]);
  });

  it("applies every consequence choice on normal difficulty and leaves a failed payment unchanged", () => {
    for (const pkg of CONSEQUENCE_PACKAGES) {
      expect(pkg.choices.some((choice) => /lose discount/i.test(choice.label))).toBe(false);
      const emptyPriced = pkg.choices.filter((choice) => choice.effects.length === 0);
      expect(new Set(emptyPriced.map((choice) => choice.goldCost)).size).toBe(emptyPriced.length);

      for (const choice of pkg.choices) {
        const opened = openConsequence(pkg.packageId, 5, { gold: 200, cityHp: 150, cityMaxHp: 150 });
        const damage = damageFrom(choice.effects);
        const granted = choice.effects.reduce(
          (total, effect) => total + (effect.type === "grantGold" ? effect.amount : 0),
          0,
        );
        if (choice.goldCost > 0) {
          const broke = { ...opened, gold: choice.goldCost - 1 };
          const snapshot = JSON.stringify(broke);
          const denied = chooseEventOption(broke, choice.id);
          expect(denied.ok).toBe(false);
          expect(JSON.stringify(broke)).toBe(snapshot);
        }
        const next = mustOk(chooseEventOption(opened, choice.id));
        expect(next.gold).toBe(200 - choice.goldCost + granted);
        expect(next.cityHp).toBe(150 - damage);
      }
    }
  });

  it("still allows a free consequence choice when the treasury is empty", () => {
    const opened = openConsequence("c-raid-late", 65, { gold: 0, cityHp: 80 });
    const next = mustOk(chooseEventOption(opened, "c-raid-late-accept"));
    expect(next.gold).toBe(0);
    expect(next.cityHp).toBe(50);
    expect(next.phase).toBe("preparation");
  });

  it("ends the game when a consequence deals damage equal to the current HP", () => {
    const opened = openConsequence("c-raid-late", 65, { gold: 0, cityHp: 30 });
    const next = mustOk(chooseEventOption(opened, "c-raid-late-accept"));
    expect(next.phase).toBe("gameOver");
    expect(next.cityHp).toBe(0);
  });

  it("drops wave 8 defense after that wave and moves a late bonus forward once the wave has passed", () => {
    let state = openConsequence("c-raid-late", 65, { gold: 100, cityHp: 400, cityMaxHp: 400 });
    state = mustOk(chooseEventOption(state, "c-raid-late-pay"));
    expect(state.effects.defenseByWave[8]).toBe(3);
    state = mustOk(
      startBattle({
        ...state,
        day: 80,
        phase: "battleReady",
        cityHp: 2000,
        cityMaxHp: 2000,
        troopLevel: 18,
      }),
    );
    expect(state.battleResult?.won).toBe(true);
    expect(state.effects.defenseByWave[8]).toBeUndefined();

    const late = openConsequence("c-raid-late", 81, { gold: 100, cityHp: 150, wavesCleared: 8 });
    const shifted = mustOk(chooseEventOption(late, "c-raid-late-def"));
    expect(shifted.effects.defenseByWave[8]).toBeUndefined();
    expect(shifted.effects.defenseByWave[9]).toBe(2);
  });

  it("does not raise a larger discount that already lasts through the shortage wave", () => {
    const opened = openConsequence("c-shortage-wave2", 14, {
      gold: 0,
      cityHp: 100,
      wavesCleared: 1,
      effects: {
        defenseByWave: {},
        upgradeDiscountRate: 0.25,
        upgradeDiscountUntilWave: 5,
        prepIncomeBonus: 0,
      },
    });
    const next = mustOk(chooseEventOption(opened, "c-shortage-wave2-discount"));
    expect(next.cityHp).toBe(90);
    expect(next.effects.upgradeDiscountRate).toBe(0.25);
    expect(next.effects.upgradeDiscountUntilWave).toBe(5);
  });

  it("shows wave 8 defense and the 14 HP wound winning in different city states", () => {
    const demon = gameConfig.waves.find((wave) => wave.wave === 8)!;
    const fight = (cityHp: number, cityAttack: number, cityDefense: number) =>
      resolveBattle({
        wave: 8,
        day: demon.day,
        cityHp,
        cityAttack,
        cityDefense,
        monsterHp: demon.hp,
        monsterAttack: demon.attack,
      });

    const longClean = fight(1200, 25, 2)!;
    const longBrace = fight(1200, 25, 5)!;
    expect(longClean.won && longBrace.won).toBe(true);
    expect(longBrace.cityHpAfter - longClean.cityHpAfter).toBeGreaterThan(14);

    const shortClean = fight(200, 490, 2)!;
    const shortWounded = fight(186, 490, 5)!;
    expect(shortClean.won && shortWounded.won).toBe(true);
    expect(shortWounded.cityHpAfter).toBeLessThan(shortClean.cityHpAfter);

    const cleanLives = fight(60, 490, 2)!;
    const woundedDies = fight(46, 490, 4)!;
    expect(cleanLives.won).toBe(true);
    expect(cleanLives.cityHpAfter).toBeGreaterThan(0);
    expect(woundedDies.won).toBe(false);
    expect(woundedDies.cityHpAfter).toBe(0);
  });
});
