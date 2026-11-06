import { createHash } from "node:crypto";

import {
  chooseEventOption,
  chooseReward,
  continueFromReport,
  createInitialState,
  endPreparationDay,
  gameConfig,
  getEffectiveStats,
  getWavePreview,
  repairCity,
  startBattle,
  upgradeCity,
  upgradeTroops,
  upgradeWall,
  type ActionResult,
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

export function getEngineRulesetMetadata() {
  return {
    rulesetId: "prototype-v3",
    engineVersion: "prototype-v3",
    stateVersion: SUPPORTED_STATE_VERSION,
    configFingerprint: createHash("sha256").update(JSON.stringify(gameConfig)).digest("hex"),
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

export function readWavePreview(state: GameState) {
  assertSupportedState(state);
  return getWavePreview(state);
}

export type EngineGameAction =
  | { type: "upgradeWall"; payload: Record<string, never> }
  | { type: "upgradeTroops"; payload: Record<string, never> }
  | { type: "upgradeCity"; payload: Record<string, never> }
  | { type: "repairCity"; payload: Record<string, never> }
  | { type: "endPreparationDay"; payload: Record<string, never> }
  | { type: "chooseEventOption"; payload: { choiceId: string } }
  | { type: "startBattle"; payload: Record<string, never> }
  | { type: "continueFromReport"; payload: Record<string, never> }
  | { type: "chooseReward"; payload: { rewardId: string } };

export function applyGameAction(state: GameState, action: EngineGameAction): ActionResult {
  assertSupportedState(state);

  switch (action.type) {
    case "upgradeWall": return upgradeWall(state);
    case "upgradeTroops": return upgradeTroops(state);
    case "upgradeCity": return upgradeCity(state);
    case "repairCity": return repairCity(state);
    case "endPreparationDay": return endPreparationDay(state);
    case "chooseEventOption": return chooseEventOption(state, action.payload.choiceId);
    case "startBattle": return startBattle(state);
    case "continueFromReport": return continueFromReport(state);
    case "chooseReward": return chooseReward(state, action.payload.rewardId);
  }
}

export type { GameState };
