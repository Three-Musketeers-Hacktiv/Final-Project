import { GAME_STATE_VERSION, gameConfig } from "./config.mjs";
import { incomeAmountForDay } from "./calendar.mjs";
import { isDifficulty } from "./difficulty.mjs";
import { emptyEffects } from "./effects.mjs";
import { pickEventPlan } from "./eventPlan.mjs";
export function createInitialState(options) {
    const day = gameConfig.startingDay;
    const runId = options?.runId ?? "run-1";
    const difficulty = options?.difficulty && isDifficulty(options.difficulty) ? options.difficulty : "normal";
    const shell = {
        version: GAME_STATE_VERSION,
        revision: 0,
        runId,
        difficulty,
        day,
        phase: "preparation",
        gold: gameConfig.startingGold,
        cityHp: gameConfig.cityMaxHp,
        cityMaxHp: gameConfig.cityMaxHp,
        wallLevel: 0,
        troopLevel: 0,
        cityLevel: 0,
        actionUsedToday: false,
        incomeGrantedDays: [],
        completedEventIds: [],
        eventPlan: pickEventPlan(runId),
        pendingConsequences: [],
        activeEvent: null,
        effects: emptyEffects(),
        wavesCleared: 0,
        battleResult: null,
        rewardsChosenByWave: {},
    };
    return {
        ...shell,
        gold: shell.gold + incomeAmountForDay(shell, day),
        incomeGrantedDays: [day],
    };
}
