export { gameConfig } from "./config";
export { createInitialState } from "./initialState";
export { getEffectiveAttack, getEffectiveDefense, getEffectiveStats, getRepairCost, getUpgradeCost, getWavePreview } from "./stats";
export { upgradeWall, upgradeTroops, upgradeCity, repairCity } from "./economy";
export { endPreparationDay, startBattle, continueFromReport } from "./transitions";
export { attachActiveEvent, chooseEventOption, ensureLocalEvent } from "./events";
export { chooseReward } from "./rewards";
export type {
  ActionResult,
  ActiveEffects,
  ActiveEvent,
  BattleResult,
  Effect,
  EffectiveStats,
  GameError,
  GameErrorCode,
  GamePhase,
  GameState,
  UpgradeTrack,
} from "./types";
