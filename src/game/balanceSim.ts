import { gameConfig } from "./config";
import {
  chooseEventOption,
  chooseReward,
  continueFromReport,
  createInitialState,
  endPreparationDay,
  repairCity,
  rewardsForWave,
  startBattle,
  upgradeCity,
  upgradeTroops,
  upgradeWall,
} from "./index";
import type { Difficulty, Effect, GameState, UpgradeTrack } from "./types";

export type CampaignStrategy = "troopsFirst" | "balanced" | "wallFirst" | "repairBias";

export type CampaignRun = {
  runId: string;
  difficulty: Difficulty;
  strategy: CampaignStrategy;
  phase: GameState["phase"];
  day: number;
  wavesCleared: number;
  deathWave: number | null;
  gold: number;
  cityHp: number;
  wallLevel: number;
  troopLevel: number;
  cityLevel: number;
  repairs: number;
};

const STRATEGIES: CampaignStrategy[] = ["troopsFirst", "balanced", "wallFirst", "repairBias"];

function damageFrom(effects: Effect[]): number {
  return effects.reduce((total, effect) => total + (effect.type === "damageCity" ? effect.amount : 0), 0);
}

function eventChoiceId(state: GameState): string {
  const choices = state.activeEvent?.choices ?? [];
  const survivable = choices.filter((choice) => {
    if (choice.goldCost > state.gold) return false;
    return state.cityHp - damageFrom(choice.effects) > 0;
  });
  const pool = survivable.length > 0 ? survivable : choices.filter((choice) => choice.goldCost === 0);
  const scored = (pool.length > 0 ? pool : choices).map((choice) => {
    let score = choice.goldCost === 0 ? 1 : 0;
    for (const effect of choice.effects) {
      if (effect.type === "nextWaveDefense") score += effect.amount * 8;
      else if (effect.type === "upgradeDiscount") score += 24;
      else if (effect.type === "maxHpBonus") score += effect.amount * 2;
      else if (effect.type === "healCity") score += state.cityHp < state.cityMaxHp ? effect.amount : 0;
      else if (effect.type === "grantGold") score += 3;
      else if (effect.type === "damageCity") score -= effect.amount * 4;
    }
    if (choice.consequence) score -= 6;
    if (choice.goldCost > 0) score -= 30;
    return { id: choice.id, score };
  });
  scored.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  return scored[0]!.id;
}

function rewardChoiceId(state: GameState): string {
  const options = rewardsForWave(state.wavesCleared)!.options;
  const hpRatio = state.cityHp / state.cityMaxHp;
  const rank = (kind: string) => {
    if (kind === "maxHpBonus") return 0;
    if (kind === "nextWaveDefense" || kind === "combo") return 1;
    if (kind === "healCity") return hpRatio < 0.9 ? 2 : 6;
    if (kind === "upgradeDiscount") return 3;
    if (kind === "prepIncomeBonus") return 4;
    return 5;
  };
  return options.slice().sort((left, right) => rank(left.kind) - rank(right.kind) || left.id.localeCompare(right.id))[0]!.id;
}

function levelOf(state: GameState, track: UpgradeTrack): number {
  if (track === "wall") return state.wallLevel;
  if (track === "troops") return state.troopLevel;
  return state.cityLevel;
}

function tryUpgrade(state: GameState, track: UpgradeTrack): GameState | null {
  if (levelOf(state, track) >= gameConfig.maxTrackLevel) return null;
  const action = track === "wall" ? upgradeWall : track === "troops" ? upgradeTroops : upgradeCity;
  const result = action(state);
  return result.ok ? result.state : null;
}

function tryRepair(state: GameState, hpRatioBelow: number): GameState | null {
  const hpRatio = state.cityHp / state.cityMaxHp;
  if (hpRatio >= hpRatioBelow || state.cityHp >= state.cityMaxHp) return null;
  const result = repairCity(state);
  return result.ok ? result.state : null;
}

function economyStep(state: GameState, strategy: CampaignStrategy): { state: GameState; repaired: boolean } {
  if (state.actionUsedToday || state.phase !== "preparation") return { state, repaired: false };
  if (strategy === "troopsFirst") {
    const repaired = tryRepair(state, 0.8);
    if (repaired) return { state: repaired, repaired: true };
    const next = tryUpgrade(state, "troops") ?? tryUpgrade(state, "wall") ?? tryUpgrade(state, "city");
    return { state: next ?? state, repaired: false };
  }
  if (strategy === "wallFirst") {
    const repaired = tryRepair(state, 0.7);
    if (repaired) return { state: repaired, repaired: true };
    const next = tryUpgrade(state, "wall") ?? tryUpgrade(state, "troops") ?? tryUpgrade(state, "city");
    return { state: next ?? state, repaired: false };
  }
  if (strategy === "repairBias") {
    const repaired = tryRepair(state, 0.95);
    if (repaired) return { state: repaired, repaired: true };
    const next = tryUpgrade(state, "troops") ?? tryUpgrade(state, "wall") ?? tryUpgrade(state, "city");
    return { state: next ?? state, repaired: false };
  }
  const repaired = tryRepair(state, 0.55);
  if (repaired) return { state: repaired, repaired: true };
  const order: UpgradeTrack[] = ["troops", "wall", "city"];
  const ranked = order.slice().sort((left, right) => {
    const delta = levelOf(state, left) - levelOf(state, right);
    return delta !== 0 ? delta : order.indexOf(left) - order.indexOf(right);
  });
  for (const track of ranked) {
    const next = tryUpgrade(state, track);
    if (next) return { state: next, repaired: false };
  }
  return { state, repaired: false };
}

export function playCampaignStrategy(
  runId: string,
  difficulty: Difficulty,
  strategy: CampaignStrategy,
): CampaignRun {
  let state = createInitialState({ runId, difficulty });
  let repairs = 0;
  for (let step = 0; step < 800 && state.phase !== "victory" && state.phase !== "gameOver"; step += 1) {
    if (state.phase === "event" && state.activeEvent) {
      const chosen = chooseEventOption(state, eventChoiceId(state));
      if (!chosen.ok) break;
      state = chosen.state;
      continue;
    }
    if (state.phase === "preparation") {
      const acted = economyStep(state, strategy);
      state = acted.state;
      if (acted.repaired) repairs += 1;
      if (state.phase === "preparation") {
        const ended = endPreparationDay(state);
        if (!ended.ok) break;
        state = ended.state;
      }
      continue;
    }
    if (state.phase === "battleReady") {
      const started = startBattle(state);
      if (!started.ok) break;
      state = started.state;
      continue;
    }
    if (state.phase === "battleReport") {
      const continued = continueFromReport(state);
      if (!continued.ok) break;
      state = continued.state;
      continue;
    }
    if (state.phase === "reward") {
      const picked = chooseReward(state, rewardChoiceId(state));
      if (!picked.ok) break;
      state = picked.state;
      continue;
    }
    break;
  }
  return {
    runId,
    difficulty,
    strategy,
    phase: state.phase,
    day: state.day,
    wavesCleared: state.wavesCleared,
    deathWave: state.phase === "gameOver" ? state.wavesCleared + 1 : null,
    gold: state.gold,
    cityHp: state.cityHp,
    wallLevel: state.wallLevel,
    troopLevel: state.troopLevel,
    cityLevel: state.cityLevel,
    repairs,
  };
}

export function simulateSet(
  seeds: string[],
  difficulties: Difficulty[] = ["easy", "normal", "hard"],
): CampaignRun[] {
  const runs: CampaignRun[] = [];
  for (const difficulty of difficulties) {
    for (const strategy of STRATEGIES) {
      for (const runId of seeds) {
        runs.push(playCampaignStrategy(runId, difficulty, strategy));
      }
    }
  }
  return runs;
}
