import { gameConfig } from "../../../src/game/index";

/**
 * Rumus harapan dari konstanta konfigurasi.
 * Bukan pemanggilan `getUpgradeCost` atau `incomeAmountForDay`.
 * Berlaku untuk difficulty normal (pengali 1).
 */

export function expectedPrepIncome(cityLevel: number, prepIncomeBonus: number): number {
  return gameConfig.dailyIncome + cityLevel * gameConfig.cityIncomeBonus + prepIncomeBonus;
}

export function expectedRawUpgradeCost(level: number): number {
  return gameConfig.upgradeBaseCost + level * gameConfig.upgradeCostStep;
}

/** Diskon dibulatkan ke atas, minimum 1. Rate 0 berarti biaya mentah. */
export function expectedDiscountedUpgradeCost(level: number, rate: number): number {
  const raw = expectedRawUpgradeCost(level);
  if (rate <= 0) return raw;
  return Math.max(1, Math.ceil(raw * (1 - rate)));
}

export function expectedRepairCostNormal(): number {
  return gameConfig.repairCost;
}