import { createHash } from "node:crypto";

import {
  chooseEventOption,
  chooseReward,
  continueFromReport,
  createInitialState,
  eventPackageById,
  GAME_STATE_VERSION,
  endPreparationDay,
  gameConfig,
  getEffectiveStats,
  getWavePreview,
  isDifficulty,
  isPreparationDay,
  repairCity,
  surrender,
  startBattle,
  upgradeCity,
  upgradeTroops,
  upgradeWall,
  type ActionResult,
  type Difficulty,
  type GameState,
} from "../../../src/game";

const SUPPORTED_STATE_VERSION = GAME_STATE_VERSION;
const RULESET_ID = "campaign-v4-100-day-v1";

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
  if (!isDifficulty(state.difficulty)) {
    throw new Error("Game state difficulty is invalid");
  }
  if (!Array.isArray(state.eventPlan)) {
    throw new Error("Game state eventPlan is missing or incompatible with this engine revision");
  }

  const trustedPlan = createInitialState({
    runId: expectedRunId,
    difficulty: state.difficulty,
  }).eventPlan;
  const trustedIdentities = new Set(
    trustedPlan.map((entry) => `${entry.eventId}:${entry.packageId}`),
  );
  const actualIdentities = new Set(
    state.eventPlan.map((entry) => `${entry.eventId}:${entry.packageId}`),
  );
  const eventDays = new Set(state.eventPlan.map((entry) => entry.day));
  const invalidPlanEntry = state.eventPlan.some((entry) => {
    const pkg = eventPackageById(entry.packageId);
    return !pkg || pkg.eventId !== entry.eventId || pkg.decade !== Math.ceil(entry.day / 10) ||
      !isPreparationDay(entry.day);
  });
  if (
    state.eventPlan.length !== trustedPlan.length ||
    actualIdentities.size !== trustedIdentities.size ||
    eventDays.size !== state.eventPlan.length ||
    invalidPlanEntry ||
    [...actualIdentities].some((identity) => !trustedIdentities.has(identity))
  ) {
    throw new Error("Game state eventPlan is missing or incompatible with this engine revision");
  }

  const plannedEventIds = new Set(state.eventPlan.map((entry) => entry.eventId));
  const isTrustedConsequenceId = (eventId: string): boolean => {
    const [packageId, originEventId, originChoiceId, triggerDayText, ...extra] = eventId.split("::");
    if (extra.length > 0 || !packageId || !originEventId || !originChoiceId || !triggerDayText) return false;
    const triggerDay = Number(triggerDayText);
    const consequencePackage = eventPackageById(packageId);
    const originPackage = state.eventPlan
      .map((entry) => eventPackageById(entry.packageId))
      .find((pkg) => pkg?.eventId === originEventId);
    const originChoice = originPackage?.choices.find((choice) => choice.id === originChoiceId);
    return Boolean(
      consequencePackage &&
      originChoice?.consequence?.packageId === packageId &&
      Number.isInteger(triggerDay) &&
      isPreparationDay(triggerDay),
    );
  };
  if (
    new Set(state.completedEventIds).size !== state.completedEventIds.length ||
    state.completedEventIds.some(
      (eventId) => !plannedEventIds.has(eventId) && !isTrustedConsequenceId(eventId),
    )
  ) {
    throw new Error("Game state contains an event outside its trusted eventPlan");
  }

  const pendingIds = new Set<string>();
  for (const pending of state.pendingConsequences) {
    if (
      pendingIds.has(pending.id) ||
      pending.id !== `${pending.packageId}::${pending.originEventId}::${pending.originChoiceId}::${pending.triggerDay}` ||
      !isTrustedConsequenceId(pending.id)
    ) {
      throw new Error("Game state contains an invalid pending consequence");
    }
    pendingIds.add(pending.id);
  }

  if (state.activeEvent) {
    const entry = state.eventPlan.find((candidate) => candidate.day === state.activeEvent?.day);
    const pending = state.pendingConsequences.find((candidate) => candidate.id === state.activeEvent?.eventId);
    const scheduledMatches = !state.activeEvent.isConsequence && entry &&
      entry.eventId === state.activeEvent.eventId && entry.packageId === state.activeEvent.packageId;
    const consequenceMatches = state.activeEvent.isConsequence && pending &&
      pending.packageId === state.activeEvent.packageId && pending.triggerDay === state.activeEvent.day &&
      pending.originEventId === state.activeEvent.originEventId &&
      pending.originChoiceId === state.activeEvent.originChoiceId;
    if (!scheduledMatches && !consequenceMatches) {
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

export function createGameState(runId: string, difficulty: Difficulty = "normal"): GameState {
  const state = createInitialState({ runId, difficulty });
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
  | { type: "chooseReward"; payload: { rewardId: string } }
  | { type: "surrender"; payload: Record<string, never> };

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
    case "surrender": return surrender(state);
  }
}

export type { GameState };
