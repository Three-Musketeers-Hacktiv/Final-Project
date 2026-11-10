import { gameConfig } from "./config.mjs";
import { getDifficultyModifiers, scaleIncome } from "./difficulty.mjs";
export function isBattleDay(day) {
    return gameConfig.battleDays.includes(day);
}
export function isPreparationDay(day) {
    return (Number.isInteger(day) &&
        day >= gameConfig.startingDay &&
        day <= gameConfig.lastDay &&
        !isBattleDay(day));
}
export function nextBattleDay(day) {
    for (const battle of gameConfig.battleDays) {
        if (battle > day)
            return battle;
    }
    if (gameConfig.battleDays.includes(day))
        return day;
    return null;
}
export function previousBattleDay(day) {
    let prev = null;
    for (const battle of gameConfig.battleDays) {
        if (battle >= day)
            break;
        prev = battle;
    }
    return prev;
}
/** Prep days belonging to the segment that ends at the next battle (or current battle's segment). */
export function prepSegmentForDay(day) {
    const battle = isBattleDay(day) ? day : nextBattleDay(day);
    if (battle == null)
        return null;
    const prev = previousBattleDay(battle);
    const start = prev == null ? gameConfig.startingDay : prev + 1;
    return { start, end: battle - 1, battleDay: battle };
}
export function incomeAmountForDay(state, day) {
    if (!isPreparationDay(day))
        return 0;
    const mods = getDifficultyModifiers(state.difficulty);
    const base = gameConfig.dailyIncome +
        state.cityLevel * gameConfig.cityIncomeBonus +
        state.effects.prepIncomeBonus;
    return scaleIncome(base, mods.dailyIncome);
}
/** First unresolved consequence scheduled for `day` (stable array order). */
export function pendingConsequenceForDay(state, day) {
    return state.pendingConsequences.find((entry) => entry.triggerDay === day && !state.completedEventIds.includes(entry.id));
}
/** All unresolved consequences for `day` in queue order. */
export function pendingConsequencesForDay(state, day) {
    return state.pendingConsequences.filter((entry) => entry.triggerDay === day && !state.completedEventIds.includes(entry.id));
}
