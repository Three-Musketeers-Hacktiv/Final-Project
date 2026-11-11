import { rewardsForWave } from "./config";
import { enterCalendarDay } from "./dayEnter";
import { applyEffects, copyEffects } from "./effects";
import { fail, isEnded, ok } from "./result";
import type { ActionResult, GameState, RewardOption } from "./types";

function applyRewardOption(state: GameState, reward: RewardOption): {
  gold: number;
  cityHp: number;
  cityMaxHp: number;
  effects: GameState["effects"];
} {
  if (reward.kind === "combo" && reward.effects) {
    const applied = applyEffects(
      state.effects,
      reward.effects,
      {
        gold: state.gold,
        cityHp: state.cityHp,
        cityMaxHp: state.cityMaxHp,
      },
      { wavesCleared: state.wavesCleared },
    );
    return applied;
  }

  const effects = copyEffects(state.effects);
  let gold = state.gold;
  let cityHp = state.cityHp;
  let cityMaxHp = state.cityMaxHp;

  switch (reward.kind) {
    case "grantGold":
      gold += reward.amount;
      break;
    case "prepIncomeBonus":
      effects.prepIncomeBonus = reward.amount;
      break;
    case "upgradeDiscount": {
      const rate = reward.rate ?? reward.amount;
      const untilWave = reward.untilWave ?? state.wavesCleared + 1;
      effects.upgradeDiscountRate = Math.max(effects.upgradeDiscountRate, rate);
      effects.upgradeDiscountUntilWave =
        effects.upgradeDiscountUntilWave == null
          ? untilWave
          : Math.max(effects.upgradeDiscountUntilWave, untilWave);
      break;
    }
    case "healCity":
      cityHp = Math.min(cityMaxHp, cityHp + reward.amount);
      break;
    case "maxHpBonus":
      cityMaxHp += reward.amount;
      cityHp = Math.min(cityMaxHp, cityHp + reward.amount);
      break;
    case "nextWaveDefense": {
      const wave = reward.wave ?? state.wavesCleared + 1;
      const current = effects.defenseByWave[wave] ?? 0;
      effects.defenseByWave = { ...effects.defenseByWave, [wave]: current + reward.amount };
      break;
    }
    case "combo":
      break;
    default: {
      const _never: never = reward.kind;
      return _never;
    }
  }

  return { gold, cityHp, cityMaxHp, effects };
}

export function chooseReward(state: GameState, rewardId: string): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  if (state.phase !== "reward") {
    return fail("INVALID_PHASE", "Reward can only be chosen after a non-final wave report");
  }
  const wave = state.wavesCleared;
  if (wave < 1 || wave >= 10) {
    return fail("INVALID_TRANSITION", "Reward is only available after waves 1–9");
  }
  const waveKey = String(wave);
  if (state.rewardsChosenByWave[waveKey]) {
    return fail("REWARD_ALREADY_CHOSEN", "Reward already taken for this wave");
  }
  const set = rewardsForWave(wave);
  if (!set) return fail("INVALID_TRANSITION", "No rewards configured for this wave");
  const reward = set.options.find((option) => option.id === rewardId);
  if (!reward) return fail("INVALID_CHOICE", "Unknown reward for this wave");

  const applied = applyRewardOption(state, reward);
  const nextDay = state.day + 1;
  const draft: GameState = {
    ...state,
    gold: applied.gold,
    cityHp: applied.cityHp,
    cityMaxHp: applied.cityMaxHp,
    effects: applied.effects,
    rewardsChosenByWave: { ...state.rewardsChosenByWave, [waveKey]: reward.id },
  };
  const entered = enterCalendarDay(draft, nextDay);
  return ok({ ...entered, revision: state.revision + 1 });
}
