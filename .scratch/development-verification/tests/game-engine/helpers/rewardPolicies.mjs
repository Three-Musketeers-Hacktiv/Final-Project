import { rewardsForWave } from "../../../src/game/index.mjs";
function optionsOf(state) {
    const set = rewardsForWave(state.wavesCleared);
    if (!set)
        throw new Error(`Tidak ada reward untuk wave ${state.wavesCleared}`);
    return [...set.options];
}
function firstOf(options, kinds) {
    for (const kind of kinds) {
        const found = options.find((option) => option.kind === kind);
        if (found)
            return found;
    }
    return options[0];
}
/**
 * Pilihan reward hanya memakai HP saat ini dan daftar reward wave ini.
 * Tidak membaca jadwal event yang belum muncul.
 */
export function chooseRewardId(state, policy) {
    const options = optionsOf(state);
    const hpRatio = state.cityHp / state.cityMaxHp;
    if (policy === "survival") {
        const order = hpRatio < 0.85 ? ["healCity", "maxHpBonus", "combo", "nextWaveDefense", "upgradeDiscount", "prepIncomeBonus", "grantGold"] : ["maxHpBonus", "combo", "nextWaveDefense", "healCity", "upgradeDiscount", "prepIncomeBonus", "grantGold"];
        return firstOf(options, order).id;
    }
    if (policy === "fortify") {
        return firstOf(options, ["nextWaveDefense", "upgradeDiscount", "combo", "maxHpBonus", "healCity", "prepIncomeBonus", "grantGold"]).id;
    }
    if (policy === "treasury") {
        return firstOf(options, ["grantGold", "prepIncomeBonus", "upgradeDiscount", "maxHpBonus", "healCity", "nextWaveDefense", "combo"]).id;
    }
    const rank = (kind) => {
        if (kind === "maxHpBonus")
            return 0;
        if (kind === "nextWaveDefense" || kind === "combo")
            return 1;
        if (kind === "healCity")
            return hpRatio < 0.9 ? 2 : 6;
        if (kind === "upgradeDiscount")
            return 3;
        if (kind === "prepIncomeBonus")
            return 4;
        return 5;
    };
    return options.slice().sort((left, right) => rank(left.kind) - rank(right.kind) || left.id.localeCompare(right.id))[0].id;
}
