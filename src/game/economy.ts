import { gameConfig } from "./config";
import { hasUnresolvedEvent, isBattleDay } from "./calendar";
import { fail, isEnded, ok } from "./result";
import { getRepairCost, getUpgradeCost, trackLevel } from "./stats";
import type { ActionResult, GameState, UpgradeTrack } from "./types";

function economyGate(state: GameState): ActionResult | null {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  if (hasUnresolvedEvent(state) || state.phase === "event") {
    return fail("EVENT_REQUIRED", "Resolve the event before spending");
  }
  if (state.phase !== "preparation" || isBattleDay(state.day)) {
    return fail("INVALID_PHASE", "Economic actions are only allowed during preparation");
  }
  if (state.actionUsedToday) return fail("NO_ACTION_LEFT", "Daily economic action already used");
  return null;
}

function spendUpgrade(state: GameState, track: UpgradeTrack): ActionResult {
  const blocked = economyGate(state);
  if (blocked) return blocked;
  if (trackLevel(state, track) >= gameConfig.maxTrackLevel) {
    return fail("MAX_UPGRADE", "Upgrade level is at the maximum");
  }
  const cost = getUpgradeCost(state, track);
  if (state.gold < cost) return fail("INSUFFICIENT_GOLD", "Not enough gold to upgrade");
  const paid = {
    ...state,
    gold: state.gold - cost,
    actionUsedToday: true,
    revision: state.revision + 1,
  };
  if (track === "wall") return ok({ ...paid, wallLevel: state.wallLevel + 1 });
  if (track === "troops") return ok({ ...paid, troopLevel: state.troopLevel + 1 });
  const cityMaxHp = state.cityMaxHp + gameConfig.cityMaxHpBonus;
  return ok({
    ...paid,
    cityLevel: state.cityLevel + 1,
    cityMaxHp,
    cityHp: Math.min(cityMaxHp, state.cityHp + gameConfig.cityMaxHpBonus),
  });
}

export function upgradeWall(state: GameState): ActionResult {
  return spendUpgrade(state, "wall");
}

export function upgradeTroops(state: GameState): ActionResult {
  return spendUpgrade(state, "troops");
}

export function upgradeCity(state: GameState): ActionResult {
  return spendUpgrade(state, "city");
}

export function repairCity(state: GameState): ActionResult {
  const blocked = economyGate(state);
  if (blocked) return blocked;
  if (state.cityHp >= state.cityMaxHp) return fail("HP_FULL", "City HP is already full");
  const cost = getRepairCost();
  if (state.gold < cost) return fail("INSUFFICIENT_GOLD", "Not enough gold to repair");
  const healed = Math.min(state.cityMaxHp, state.cityHp + gameConfig.repairHeal);
  return ok({
    ...state,
    gold: state.gold - cost,
    cityHp: healed,
    actionUsedToday: true,
    revision: state.revision + 1,
  });
}
