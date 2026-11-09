export { eventPackageById, eventPackageForDay, eventPackagesForDay, gameConfig, scheduledEventDays } from "./config";
export { createInitialState } from "./initialState";
export { pickEventPlan, resolveEventPackage } from "./eventPlan";
export { getEffectiveAttack, getEffectiveDefense, getEffectiveStats, getRepairCost, getUpgradeCost, getWavePreview } from "./stats";
export { upgradeWall, upgradeTroops, upgradeCity, repairCity } from "./economy";
export { endPreparationDay, startBattle, continueFromReport, surrender } from "./transitions";
export { attachActiveEvent, chooseEventOption, ensureLocalEvent, toActiveEvent } from "./events";
export { decorateActiveEvent } from "./narrative";
export { chooseReward } from "./rewards";
export type {
  ActionResult,
  ActiveEffects,
  ActiveEvent,
  BattleResult,
  Effect,
  EffectiveStats,
  EventPackage,
  EventPlanEntry,
  GameError,
  GameErrorCode,
  GamePhase,
  GameState,
  RewardOption,
  UpgradeTrack,
} from "./types";
export type { EventNarrativeOverlay } from "./narrative";
