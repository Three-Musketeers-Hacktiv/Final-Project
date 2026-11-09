import { GAME_STATE_VERSION, gameConfig } from "./config";
import { incomeAmountForDay } from "./calendar";
import { isDifficulty } from "./difficulty";
import { emptyEffects } from "./effects";
import { pickEventPlan } from "./eventPlan";
import type { Difficulty, GameState } from "./types";

export function createInitialState(options?: {
  runId?: string;
  difficulty?: Difficulty;
}): GameState {
  const day = gameConfig.startingDay;
  const runId = options?.runId ?? "run-1";
  const difficulty =
    options?.difficulty && isDifficulty(options.difficulty) ? options.difficulty : "normal";
  const shell: GameState = {
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
