import { gameConfig } from "./config.mjs";
import { incomeAmountForDay } from "./calendar.mjs";
import { getDifficultyModifiers, scaleMonsterStat } from "./difficulty.mjs";
import { upcomingWave, defenseBonusForWave, discountedUpgradeCost } from "./effects.mjs";
export function trackLevel(state, track) {
    if (track === "wall")
        return state.wallLevel;
    if (track === "troops")
        return state.troopLevel;
    return state.cityLevel;
}
export function getEffectiveAttack(state) {
    return gameConfig.baseAttack + state.troopLevel * gameConfig.troopAttackBonus;
}
export function getEffectiveDefense(state, wave = upcomingWave(state)) {
    return (gameConfig.baseDefense +
        state.wallLevel * gameConfig.wallDefenseBonus +
        defenseBonusForWave(state.effects, wave));
}
export function getUpgradeCost(state, track) {
    return discountedUpgradeCost(trackLevel(state, track), state.effects, state.difficulty);
}
export function getRepairCost(state) {
    const difficulty = state?.difficulty ?? "normal";
    const mods = getDifficultyModifiers(difficulty);
    return Math.max(1, Math.ceil(gameConfig.repairCost * mods.repairCost));
}
export function getEffectiveStats(state) {
    return {
        attack: getEffectiveAttack(state),
        defense: getEffectiveDefense(state),
        wallCost: getUpgradeCost(state, "wall"),
        troopCost: getUpgradeCost(state, "troops"),
        cityCost: getUpgradeCost(state, "city"),
        repairCost: getRepairCost(state),
        dailyIncome: incomeAmountForDay(state, state.day),
    };
}
export function getWavePreview(state) {
    const wave = upcomingWave(state);
    const monster = gameConfig.waves.find((entry) => entry.wave === wave);
    if (!monster)
        return null;
    const mods = getDifficultyModifiers(state.difficulty);
    return {
        wave: monster.wave,
        day: monster.day,
        name: monster.name,
        role: monster.role,
        hp: scaleMonsterStat(monster.hp, mods.monsterHp),
        attack: scaleMonsterStat(monster.attack, mods.monsterAttack),
        cityAttack: getEffectiveAttack(state),
        cityDefense: getEffectiveDefense(state, monster.wave),
    };
}
