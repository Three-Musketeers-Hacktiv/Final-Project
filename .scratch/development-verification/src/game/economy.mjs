import { gameConfig } from "./config.mjs";
import { isBattleDay } from "./calendar.mjs";
import { hasUnresolvedEvent } from "./dayEnter.mjs";
import { fail, isEnded, ok } from "./result.mjs";
import { getRepairCost, getUpgradeCost, trackLevel } from "./stats.mjs";
function economyGate(state) {
    if (isEnded(state))
        return fail("GAME_ENDED", "Game has ended");
    if (hasUnresolvedEvent(state) || state.phase === "event") {
        return fail("EVENT_REQUIRED", "Resolve the event before spending");
    }
    if (state.phase !== "preparation" || isBattleDay(state.day)) {
        return fail("INVALID_PHASE", "Economic actions are only allowed during preparation");
    }
    if (state.actionUsedToday)
        return fail("NO_ACTION_LEFT", "Daily economic action already used");
    return null;
}
function spendUpgrade(state, track) {
    const blocked = economyGate(state);
    if (blocked)
        return blocked;
    if (trackLevel(state, track) >= gameConfig.maxTrackLevel) {
        return fail("MAX_UPGRADE", "Upgrade level is at the maximum");
    }
    const cost = getUpgradeCost(state, track);
    if (state.gold < cost)
        return fail("INSUFFICIENT_GOLD", "Not enough gold to upgrade");
    const paid = {
        ...state,
        gold: state.gold - cost,
        actionUsedToday: true,
        revision: state.revision + 1,
    };
    if (track === "wall")
        return ok({ ...paid, wallLevel: state.wallLevel + 1 });
    if (track === "troops")
        return ok({ ...paid, troopLevel: state.troopLevel + 1 });
    const cityMaxHp = state.cityMaxHp + gameConfig.cityMaxHpBonus;
    return ok({
        ...paid,
        cityLevel: state.cityLevel + 1,
        cityMaxHp,
        cityHp: Math.min(cityMaxHp, state.cityHp + gameConfig.cityMaxHpBonus),
    });
}
export function upgradeWall(state) {
    return spendUpgrade(state, "wall");
}
export function upgradeTroops(state) {
    return spendUpgrade(state, "troops");
}
export function upgradeCity(state) {
    return spendUpgrade(state, "city");
}
export function repairCity(state) {
    const blocked = economyGate(state);
    if (blocked)
        return blocked;
    if (state.cityHp >= state.cityMaxHp)
        return fail("HP_FULL", "City HP is already full");
    const cost = getRepairCost(state);
    if (state.gold < cost)
        return fail("INSUFFICIENT_GOLD", "Not enough gold to repair");
    const healed = Math.min(state.cityMaxHp, state.cityHp + gameConfig.repairHeal);
    return ok({
        ...state,
        gold: state.gold - cost,
        cityHp: healed,
        actionUsedToday: true,
        revision: state.revision + 1,
    });
}
