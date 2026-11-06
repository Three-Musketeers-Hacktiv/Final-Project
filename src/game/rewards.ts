import { rewardById } from "./config";
import { incomeAmountForDay, isPreparationDay } from "./calendar";
import { copyEffects } from "./effects";
import { fail, isEnded, ok } from "./result";
import type { ActionResult, GameState } from "./types";

export function chooseReward(state: GameState, rewardId: string): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  if (state.rewardChosenId) return fail("REWARD_ALREADY_CHOSEN", "Reward already taken");
  if (state.phase !== "reward") return fail("INVALID_PHASE", "Reward can only be chosen after the first wave report");
  if (state.wavesCleared !== 1 || state.day !== 10) {
    return fail("INVALID_TRANSITION", "Reward is only available after winning wave 1");
  }
  const reward = rewardById(rewardId);
  if (!reward) return fail("INVALID_CHOICE", "Unknown reward");

  let gold = state.gold;
  const effects = copyEffects(state.effects);
  if (reward.kind === "grantGold") gold += reward.amount;
  if (reward.kind === "prepIncomeBonus") effects.prepIncomeBonus += reward.amount;
  if (reward.kind === "upgradeDiscount") {
    effects.upgradeDiscountRate = Math.max(effects.upgradeDiscountRate, reward.amount);
    effects.upgradeDiscountUntilWave =
      effects.upgradeDiscountUntilWave == null || 2 > effects.upgradeDiscountUntilWave
        ? 2
        : effects.upgradeDiscountUntilWave;
  }

  const nextDay = 11;
  if (!isPreparationDay(nextDay)) return fail("INVALID_TRANSITION", "Day 11 is not a preparation day");
  const draft: GameState = { ...state, gold, effects, rewardChosenId: reward.id };
  const incomeDays = state.incomeGrantedDays.includes(nextDay)
    ? state.incomeGrantedDays
    : [...state.incomeGrantedDays, nextDay];
  const income = state.incomeGrantedDays.includes(nextDay) ? 0 : incomeAmountForDay(draft, nextDay);

  return ok({
    ...draft,
    day: nextDay,
    phase: "preparation",
    gold: gold + income,
    incomeGrantedDays: incomeDays,
    actionUsedToday: false,
    activeEvent: null,
    revision: state.revision + 1,
  });
}
