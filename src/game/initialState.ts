import { gameConfig } from "./config";
import { incomeAmountForDay } from "./calendar";
import { emptyEffects } from "./effects";
import { pickEventPlan } from "./eventPlan";
import type { GameState } from "./types";

export function createInitialState(options?: { runId?: string }): GameState {
  const day = gameConfig.startingDay;
  const runId = options?.runId ?? "run-1";
  const shell: GameState = {
    version: 3,
    revision: 0,
    runId,
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
    activeEvent: null,
    effects: emptyEffects(),
    wavesCleared: 0,
    battleResult: null,
    rewardChosenId: null,
  };
  return {
    ...shell,
    gold: shell.gold + incomeAmountForDay(shell, day),
    incomeGrantedDays: [day],
  };
}
