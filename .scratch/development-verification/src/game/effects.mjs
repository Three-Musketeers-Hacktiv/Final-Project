import { gameConfig, lastWaveNumber } from "./config.mjs";
import { getDifficultyModifiers, scaleEconomyCost } from "./difficulty.mjs";
export function emptyEffects() {
    return {
        defenseByWave: {},
        upgradeDiscountRate: 0,
        upgradeDiscountUntilWave: null,
        prepIncomeBonus: 0,
    };
}
export function copyEffects(effects) {
    return {
        defenseByWave: { ...effects.defenseByWave },
        upgradeDiscountRate: effects.upgradeDiscountRate,
        upgradeDiscountUntilWave: effects.upgradeDiscountUntilWave,
        prepIncomeBonus: effects.prepIncomeBonus,
    };
}
export function upcomingWave(state) {
    return Math.min(state.wavesCleared + 1, lastWaveNumber());
}
export function defenseBonusForWave(effects, wave) {
    return effects.defenseByWave[wave] ?? 0;
}
export function rawUpgradeCost(level) {
    return gameConfig.upgradeBaseCost + level * gameConfig.upgradeCostStep;
}
/** Difficulty then discount; repair is never discounted. */
export function discountedUpgradeCost(level, effects, difficulty) {
    const mods = getDifficultyModifiers(difficulty);
    const withDifficulty = scaleEconomyCost(rawUpgradeCost(level), mods.upgradeCost);
    if (effects.upgradeDiscountRate <= 0)
        return withDifficulty;
    return Math.max(1, Math.ceil(withDifficulty * (1 - effects.upgradeDiscountRate)));
}
function waveStillAhead(requested, ctx) {
    if (!ctx)
        return requested;
    const upcoming = Math.min(ctx.wavesCleared + 1, lastWaveNumber());
    return requested < upcoming ? upcoming : requested;
}
export function applyEffect(effects, effect, state, ctx) {
    const next = copyEffects(effects);
    let { gold, cityHp, cityMaxHp } = state;
    switch (effect.type) {
        case "grantGold":
            gold += effect.amount;
            break;
        case "damageCity":
            cityHp = Math.max(0, cityHp - effect.amount);
            break;
        case "healCity":
            cityHp = Math.min(cityMaxHp, cityHp + effect.amount);
            break;
        case "maxHpBonus":
            cityMaxHp += effect.amount;
            cityHp = Math.min(cityMaxHp, cityHp + effect.amount);
            break;
        case "nextWaveDefense": {
            const wave = waveStillAhead(effect.wave, ctx);
            const current = next.defenseByWave[wave] ?? 0;
            next.defenseByWave = { ...next.defenseByWave, [wave]: current + effect.amount };
            break;
        }
        case "upgradeDiscount": {
            const untilWave = waveStillAhead(effect.untilWave, ctx);
            next.upgradeDiscountRate = Math.max(next.upgradeDiscountRate, effect.rate);
            next.upgradeDiscountUntilWave =
                next.upgradeDiscountUntilWave == null
                    ? untilWave
                    : Math.max(next.upgradeDiscountUntilWave, untilWave);
            break;
        }
        default: {
            const _never = effect;
            return _never;
        }
    }
    return { effects: next, gold, cityHp, cityMaxHp };
}
export function applyEffects(effects, list, state, ctx) {
    return list.reduce((acc, effect) => applyEffect(acc.effects, effect, acc, ctx), {
        effects: copyEffects(effects),
        gold: state.gold,
        cityHp: state.cityHp,
        cityMaxHp: state.cityMaxHp,
    });
}
export function clearWaveDefense(effects, wave) {
    const defenseByWave = { ...effects.defenseByWave };
    delete defenseByWave[wave];
    const next = { ...effects, defenseByWave };
    if (next.upgradeDiscountUntilWave === wave) {
        next.upgradeDiscountRate = 0;
        next.upgradeDiscountUntilWave = null;
    }
    // Prep income bonus is timed until next battle; clear when that wave resolves.
    // Callers that need to keep income across a wave should re-apply via reward.
    return next;
}
/** Clear timed prep income when leaving a reward segment into the next decade after a wave. */
export function clearPrepIncomeBonus(effects) {
    return { ...effects, prepIncomeBonus: 0 };
}
export function clearEndOfCampaignEffects() {
    return emptyEffects();
}
