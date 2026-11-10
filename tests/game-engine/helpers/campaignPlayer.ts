import {
  chooseEventOption,
  chooseReward,
  continueFromReport,
  endPreparationDay,
  getEffectiveAttack,
  getEffectiveDefense,
  getWavePreview,
  startBattle,
  type GameState,
} from "../../../src/game/index";
import { mustOk } from "./mustOk";
import { avoidDamageChoice, scoredEventChoice, spendOnce, type RepairPolicy, type SpendOrder } from "./policies";
import { chooseRewardId, type RewardPolicyName } from "./rewardPolicies";

export type PreBattleSnapshot = {
  day: number;
  wave: number;
  cityHp: number;
  cityMaxHp: number;
  gold: number;
  attack: number;
  defense: number;
  monsterHp: number;
  monsterAttack: number;
  wallLevel: number;
  troopLevel: number;
  cityLevel: number;
};

export type PlayLog = {
  state: GameState;
  steps: number;
  events: Array<{ day: number; eventId: string; choiceId: string }>;
  rewards: Array<{ wave: number; rewardId: string }>;
  repairs: number;
  repairGold: number;
  preBattle: PreBattleSnapshot[];
};

export type PlayOptions = {
  spend?: SpendOrder;
  repair?: RepairPolicy;
  eventChoice?: (state: GameState) => string;
  rewardChoice?: (state: GameState) => string;
  rewardPolicy?: RewardPolicyName;
  stop?: (state: GameState) => boolean;
  maxSteps?: number;
};

/**
 * Memainkan state hanya lewat aksi publik.
 * Berhenti saat `stop` benar, fase akhir, atau batas langkah.
 */
export function play(start: GameState, options: PlayOptions = {}): PlayLog {
  let state = start;
  const events: PlayLog["events"] = [];
  const rewards: PlayLog["rewards"] = [];
  const preBattle: PreBattleSnapshot[] = [];
  const spend = options.spend ?? "knownWin";
  const repair = options.repair ?? "off";
  const pickEvent = options.eventChoice ?? scoredEventChoice;
  const pickReward =
    options.rewardChoice ?? ((current: GameState) => chooseRewardId(current, options.rewardPolicy ?? "standard"));
  const maxSteps = options.maxSteps ?? 800;
  let steps = 0;
  let repairs = 0;
  let repairGold = 0;

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
      const spent = spendOnce(state, spend, repair);
      if (spent) {
        state = spent.state;
        if (spent.repaired) {
          repairs += 1;
          repairGold += spent.repairCost;
        }
      }
      if (state.phase === "preparation") state = mustOk(endPreparationDay(state));
      continue;
    }

    if (state.phase === "battleReady") {
      const preview = getWavePreview(state);
      preBattle.push({
        day: state.day,
        wave: preview?.wave ?? state.wavesCleared + 1,
        cityHp: state.cityHp,
        cityMaxHp: state.cityMaxHp,
        gold: state.gold,
        attack: getEffectiveAttack(state),
        defense: preview?.cityDefense ?? getEffectiveDefense(state),
        monsterHp: preview?.hp ?? 0,
        monsterAttack: preview?.attack ?? 0,
        wallLevel: state.wallLevel,
        troopLevel: state.troopLevel,
        cityLevel: state.cityLevel,
      });
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

  return { state, steps, events, rewards, repairs, repairGold, preBattle };
}

export { avoidDamageChoice, scoredEventChoice };
