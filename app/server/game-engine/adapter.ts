import {
  createInitialState,
  gameConfig,
  getEffectiveStats,
  type GameState,
} from "../../../src/game";

const SUPPORTED_STATE_VERSION = 3 as const;

export type EngineCompatibility = {
  stateVersion: typeof SUPPORTED_STATE_VERSION;
  lastDay: number;
  battleDays: readonly number[];
};

function assertSupportedState(state: GameState): void {
  if (state.version !== SUPPORTED_STATE_VERSION) {
    throw new Error(`Unsupported game state version: ${state.version}`);
  }
}

export function getEngineCompatibility(): EngineCompatibility {
  const probeState = createInitialState({ runId: "engine-compatibility-probe" });
  assertSupportedState(probeState);

  return {
    stateVersion: SUPPORTED_STATE_VERSION,
    lastDay: gameConfig.lastDay,
    battleDays: [...gameConfig.battleDays],
  };
}

export function createGameState(runId: string): GameState {
  const state = createInitialState({ runId });
  assertSupportedState(state);
  return state;
}

export function readEffectiveStats(state: GameState) {
  assertSupportedState(state);
  return getEffectiveStats(state);
}

export type { GameState };
