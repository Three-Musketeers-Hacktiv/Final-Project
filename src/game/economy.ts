import { GAME_CONFIG } from "./config";
import { getEffectiveStats } from "./stats";
import type { ActionResult, GameErrorCode, GameState } from "./types";

function fail(code: GameErrorCode, message: string): ActionResult<GameState> {
  return { ok: false, error: { code, message } };
}

function requirePrepAction(state: GameState): ActionResult<GameState> | null {
  if (state.phase === "gameOver" || state.phase === "victory") {
    return fail("GAME_ENDED", "Game has ended");
  }
  if (state.phase === "event") {
    return fail("EVENT_REQUIRED", "Resolve the event before acting");
  }
  if (state.phase !== "preparation") {
    return fail("INVALID_PHASE", "Economic actions require preparation phase");
  }
  if (state.actionUsedToday) {
    return fail("NO_ACTION_LEFT", "Daily action already used");
  }
  return null;
}

export function upgradeCity(state: GameState): ActionResult<GameState> {
  const blocked = requirePrepAction(state);
  if (blocked) return blocked;
  if (state.upgradeLevel >= GAME_CONFIG.maxUpgradeLevel) {
    return fail("MAX_UPGRADE", "City upgrade level is at maximum");
  }
  const { upgradeCost } = getEffectiveStats(state);
  if (state.gold < upgradeCost) {
    return fail("INSUFFICIENT_GOLD", "Not enough gold to upgrade");
  }
  return {
    ok: true,
    state: {
      ...state,
      gold: state.gold - upgradeCost,
      upgradeLevel: state.upgradeLevel + 1,
      actionUsedToday: true,
    },
  };
}

export function repairCity(state: GameState): ActionResult<GameState> {
  const blocked = requirePrepAction(state);
  if (blocked) return blocked;
  if (state.cityHp >= state.cityMaxHp) {
    return fail("HP_FULL", "City HP is already full");
  }
  const cost = GAME_CONFIG.repairCost;
  if (state.gold < cost) {
    return fail("INSUFFICIENT_GOLD", "Not enough gold to repair");
  }
  const healed = Math.min(
    GAME_CONFIG.repairAmount,
    state.cityMaxHp - state.cityHp,
  );
  return {
    ok: true,
    state: {
      ...state,
      gold: state.gold - cost,
      cityHp: state.cityHp + healed,
      actionUsedToday: true,
    },
  };
}

export function incomeForDay(state: GameState, day: number): number {
  let amount = GAME_CONFIG.dailyIncome;
  if (day >= 11 && day <= 19) {
    amount += state.effects.incomeBonus;
  }
  return amount;
}
