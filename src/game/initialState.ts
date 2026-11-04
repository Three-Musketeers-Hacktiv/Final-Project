import { GAME_CONFIG } from "./config";
import { emptyEffects } from "./effects";
import { createRunId, enterDay } from "./transitions";
import type { GameState } from "./types";

function blankState(runId: string): GameState {
  return {
    version: GAME_CONFIG.stateVersion,
    runId,
    day: 0,
    phase: "preparation",
    gold: GAME_CONFIG.goldBeforeDay1Income,
    cityHp: GAME_CONFIG.cityMaxHp,
    cityMaxHp: GAME_CONFIG.cityMaxHp,
    upgradeLevel: 0,
    actionUsedToday: false,
    incomeGrantedForDay: null,
    completedEventIds: [],
    activeEvent: null,
    effects: emptyEffects(),
    wavesCleared: 0,
    battleResult: null,
    rewardChosenId: null,
  };
}

/** New run with day-1 income applied exactly once. */
export function createInitialState(runId = createRunId()): GameState {
  const entered = enterDay(blankState(runId), GAME_CONFIG.startingDay);
  if (!entered.ok) {
    throw new Error(entered.error.message);
  }
  return entered.state;
}
