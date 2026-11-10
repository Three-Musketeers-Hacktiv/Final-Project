import {
  chooseEventOption,
  chooseReward,
  continueFromReport,
  endPreparationDay,
  rewardsForWave,
  startBattle,
  type GameState,
} from "../../../src/game/index";
import { mustOk } from "./mustOk";
import { avoidDamageChoice, scoredEventChoice, spendOnce, type SpendOrder } from "./policies";

export type PlayLog = {
  state: GameState;
  steps: number;
  events: Array<{ day: number; eventId: string; choiceId: string }>;
  rewards: Array<{ wave: number; rewardId: string }>;
};

export type PlayOptions = {
  spend?: SpendOrder;
  eventChoice?: (state: GameState) => string;
  rewardChoice?: (state: GameState) => string;
  stop?: (state: GameState) => boolean;
  maxSteps?: number;
};

function defaultReward(state: GameState): string {
  const options = rewardsForWave(state.wavesCleared);
  if (!options) throw new Error(`Tidak ada reward untuk wave ${state.wavesCleared}`);
  const hpRatio = state.cityHp / state.cityMaxHp;
  const rank = (kind: string) => {
    if (kind === "maxHpBonus") return 0;
    if (kind === "nextWaveDefense" || kind === "combo") return 1;
    if (kind === "healCity") return hpRatio < 0.9 ? 2 : 6;
    if (kind === "upgradeDiscount") return 3;
    if (kind === "prepIncomeBonus") return 4;
    return 5;
  };
  return options.options
    .slice()
    .sort((left, right) => rank(left.kind) - rank(right.kind) || left.id.localeCompare(right.id))[0]!.id;
}

/**
 * Memainkan state hanya lewat aksi publik.
 * Berhenti saat `stop` benar, fase akhir, atau batas langkah.
 */
export function play(start: GameState, options: PlayOptions = {}): PlayLog {
  let state = start;
  const events: PlayLog["events"] = [];
  const rewards: PlayLog["rewards"] = [];
  const spend = options.spend ?? "knownWin";
  const pickEvent = options.eventChoice ?? scoredEventChoice;
  const pickReward = options.rewardChoice ?? defaultReward;
  const maxSteps = options.maxSteps ?? 800;
  let steps = 0;

  for (; steps < maxSteps; steps += 1) {
    if (options.stop?.(state)) break;
    if (state.phase === "victory" || state.phase === "gameOver") break;

    if (state.phase === "event" && state.activeEvent) {
      const choiceId = pickEvent(state);
      const eventId = state.activeEvent.eventId;
      const day = state.day;
      state = mustOk(chooseEventOption(state, choiceId));
      events.push({ day, eventId, choiceId });
      continue;
    }

    if (state.phase === "preparation") {
      const spent = spendOnce(state, spend);
      if (spent) state = spent;
      if (state.phase === "preparation") state = mustOk(endPreparationDay(state));
      continue;
    }

    if (state.phase === "battleReady") {
      state = mustOk(startBattle(state));
      continue;
    }

    if (state.phase === "battleReport") {
      state = mustOk(continueFromReport(state));
      continue;
    }

    if (state.phase === "reward") {
      const rewardId = pickReward(state);
      const wave = state.wavesCleared;
      state = mustOk(chooseReward(state, rewardId));
      rewards.push({ wave, rewardId });
      continue;
    }

    break;
  }

  return { state, steps, events, rewards };
}

export { avoidDamageChoice, scoredEventChoice };
