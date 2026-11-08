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
const RULESET_ID = "prototype-v3-event-plan-v1";

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

export function assertPatchedGameState(state: GameState, expectedRunId: string): void {
  assertSupportedState(state);
  if (state.runId !== expectedRunId) {
    throw new Error("Game state runId does not match the persisted run");
  }

  const trustedPlan = createInitialState({ runId: expectedRunId }).eventPlan;
  if (!Array.isArray(state.eventPlan) || JSON.stringify(state.eventPlan) !== JSON.stringify(trustedPlan)) {
    throw new Error("Game state eventPlan is missing or incompatible with this engine revision");
  }

  const plannedEventIds = new Set(trustedPlan.map((entry) => entry.eventId));
  if (state.completedEventIds.some((eventId) => !plannedEventIds.has(eventId))) {
    throw new Error("Game state contains an event outside its trusted eventPlan");
  }

  if (state.activeEvent) {
    const entry = trustedPlan.find((candidate) => candidate.day === state.activeEvent?.day);
    if (
      !entry ||
      entry.eventId !== state.activeEvent.eventId ||
      entry.packageId !== state.activeEvent.packageId
    ) {
      throw new Error("Active event does not match the trusted eventPlan");
    }
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
    rulesetId: RULESET_ID,
    engineVersion: RULESET_ID,
    stateVersion: SUPPORTED_STATE_VERSION,
    configFingerprint: createHash("sha256").update(JSON.stringify(gameConfig)).digest("hex"),
  };
}

export function createGameState(runId: string): GameState {
  const state = createInitialState({ runId });
  assertPatchedGameState(state, runId);
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
