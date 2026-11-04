import { REWARD_OPTIONS } from "./config";
import { applyEffects } from "./effects";
import type { ActionResult, GameState } from "./types";

/** Apply chosen reward; caller advances calendar (day 11). */
export function applyReward(
  state: GameState,
  rewardId: string,
): ActionResult<GameState> {
  if (state.phase !== "reward") {
    return {
      ok: false,
      error: { code: "INVALID_PHASE", message: "Not in reward phase" },
    };
  }
  if (state.rewardChosenId) {
    return {
      ok: false,
      error: {
        code: "REWARD_ALREADY_CHOSEN",
        message: "Reward already chosen",
      },
    };
  }
  const option = REWARD_OPTIONS.find((r) => r.id === rewardId);
  if (!option) {
    return {
      ok: false,
      error: { code: "INVALID_CHOICE", message: "Unknown reward" },
    };
  }

  let next: GameState = {
    ...state,
    rewardChosenId: option.id,
  };

  if (option.kind === "gold") {
    next = applyEffects(
      next,
      [{ type: "gold_gain", amount: option.amount }],
      option.id,
    );
  } else if (option.kind === "income_bonus") {
    next = {
      ...next,
      effects: {
        ...next.effects,
        incomeBonus: option.amount,
        incomeBonusSourceId: option.id,
      },
    };
  } else {
    next = applyEffects(
      next,
      [{ type: "upgrade_discount", rate: option.amount, untilWave: 2 }],
      option.id,
    );
  }

  return { ok: true, state: next };
}
