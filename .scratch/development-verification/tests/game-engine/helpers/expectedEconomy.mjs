import { gameConfig } from "../../../src/game/index.mjs";
/**
 * Rumus harapan dari konstanta konfigurasi.
 * Bukan pemanggilan `getUpgradeCost` atau `incomeAmountForDay`.
 * Berlaku untuk difficulty normal (pengali 1).
 */
export function expectedPrepIncome(cityLevel, prepIncomeBonus) {
    return gameConfig.dailyIncome + cityLevel * gameConfig.cityIncomeBonus + prepIncomeBonus;
}
export function expectedRawUpgradeCost(level) {
    return gameConfig.upgradeBaseCost + level * gameConfig.upgradeCostStep;
}
/** Diskon dibulatkan ke atas, minimum 1. Rate 0 berarti biaya mentah. */
export function expectedDiscountedUpgradeCost(level, rate) {
    const raw = expectedRawUpgradeCost(level);
    if (rate <= 0)
        return raw;
    return Math.max(1, Math.ceil(raw * (1 - rate)));
}
export function expectedRepairCostNormal() {
    return gameConfig.repairCost;
}
