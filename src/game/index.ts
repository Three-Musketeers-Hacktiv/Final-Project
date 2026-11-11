export {
  CONSEQUENCE_SUCCESSOR,
  CONSEQUENCE_TARGET_WAVE,
  isTrustedConsequencePackage,
} from "./eventPackages";
export {
  eventPackageById,
  eventPackageForDay,
  eventPackagesForDay,
  eventPackagesForDecade,
  gameConfig,
  GAME_STATE_VERSION,
  lastWaveNumber,
  rewardById,
  rewardsForWave,
  scheduledEventDays,
  getWaveByDay,
  getWaveByNumber,
} from "./config";
export { createInitialState } from "./initialState";
export {
  hashString,
  pickEventPlan,
  planEntryForDay,
  resolveEventPackage,
  shiftPlanEntryDay,
} from "./eventPlan";
export {
  getEffectiveAttack,
  getEffectiveDefense,
  getEffectiveStats,
  getRepairCost,
  getUpgradeCost,
  getWavePreview,
} from "./stats";
export { upgradeWall, upgradeTroops, upgradeCity, repairCity } from "./economy";
export { endPreparationDay, startBattle, continueFromReport, surrender } from "./transitions";
export {
  attachActiveEvent,
  canScheduleConsequence,
  chooseEventOption,
  ensureLocalEvent,
  hasConsequenceScheduleWindow,
  installCommittedPackage,
  resolveIncomingConsequencePolicy,
  stripUnschedulableConsequences,
  toActiveEvent,
  UNSCHEDULABLE_CONSEQUENCE_MESSAGE,
} from "./events";
export type { IncomingConsequencePolicy } from "./events";
export {
  validateEventPackage,
  validateEffect,
  packageHasConsequenceChoice,
  PACKAGE_LIMITS,
  CONSEQUENCE_REQUIRED_MESSAGE,
} from "./packageValidation";
export type { PackageValidationContext, PackageValidationResult } from "./packageValidation";
export {
  choiceLabelRespectsGoldCost,
  decorateActiveEvent,
  labelStatesCurrencyAmount,
  narrativeChoiceIdsMatch,
  trustedChoiceLabel,
} from "./narrative";
export { chooseReward } from "./rewards";
export { resolveBattle } from "./battle";
export {
  isBattleDay,
  isPreparationDay,
  nextBattleDay,
  previousBattleDay,
  prepSegmentForDay,
  incomeAmountForDay,
} from "./calendar";
export { hasUnresolvedEvent } from "./dayEnter";
export {
  getDifficultyModifiers,
  isDifficulty,
  scaleMonsterStat,
  scaleEconomyCost,
  scaleIncome,
  scaleEventGoldCost,
} from "./difficulty";
export type { DifficultyModifiers } from "./difficulty";
export type { EventNarrativeOverlay } from "./narrative";
export type { BattleSnapshot } from "./battle";
export type {
  ActionResult,
  ActiveEffects,
  ActiveEvent,
  BattleResult,
  ChoiceConsequence,
  Difficulty,
  Effect,
  EffectiveStats,
  EventChoice,
  EventPackage,
  EventPlanEntry,
  GameError,
  GameErrorCode,
  GamePhase,
  GameState,
  PendingConsequence,
  RewardKind,
  RewardOption,
  UpgradeTrack,
  WaveDefinition,
  WaveRewardSet,
  WaveRole,
} from "./types";
