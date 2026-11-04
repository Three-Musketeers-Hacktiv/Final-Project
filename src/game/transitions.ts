import { resolveBattle } from "./battle";
import {
  expectedEventPackageId,
  isBattleDay,
  isPreparationDay,
  phaseForEnteringDay,
} from "./calendar";
import { WAVES, waveForDay } from "./config";
import { clearEffectsAfterWave } from "./effects";
import { incomeForDay } from "./economy";
import { applyReward } from "./rewards";
import {
  baseAttack,
  baseDefense,
  defenseBonusForWave,
  getEffectiveStats,
} from "./stats";
import type { ActionResult, GameErrorCode, GameState, WaveId } from "./types";

function fail(code: GameErrorCode, message: string): ActionResult<GameState> {
  return { ok: false, error: { code, message } };
}

export function createRunId(): string {
  return `run-${Math.random().toString(36).slice(2, 10)}`;
}

export function enterDay(state: GameState, day: number): ActionResult<GameState> {
  if (state.phase === "gameOver" || state.phase === "victory") {
    return fail("GAME_ENDED", "Game has ended");
  }

  const eventId = expectedEventPackageId(day);
  const eventDone =
    eventId !== null && state.completedEventIds.includes(eventId);
  const phase = phaseForEnteringDay(day, eventDone);

  let next: GameState = {
    ...state,
    day,
    phase,
    actionUsedToday: false,
    battleResult: isBattleDay(day) ? null : state.battleResult,
    activeEvent: phase === "event" ? state.activeEvent : null,
  };

  if (isPreparationDay(day) && next.incomeGrantedForDay !== day) {
    next = {
      ...next,
      gold: next.gold + incomeForDay(next, day),
      incomeGrantedForDay: day,
    };
  }

  return { ok: true, state: next };
}

export function endPreparationDay(state: GameState): ActionResult<GameState> {
  if (state.phase === "event") {
    return fail("EVENT_REQUIRED", "Resolve the event before advancing");
  }
  if (state.phase !== "preparation") {
    return fail("INVALID_PHASE", "Can only end a preparation day");
  }
  const nextDay = state.day + 1;
  if (nextDay > 20) {
    return fail("INVALID_PHASE", "No further preparation days");
  }
  return enterDay(state, nextDay);
}

export function startBattle(state: GameState): ActionResult<GameState> {
  if (state.phase !== "battleReady") {
    return fail("INVALID_PHASE", "Not ready for battle");
  }
  if (state.battleResult) {
    return fail("BATTLE_ALREADY_RESOLVED", "Battle already resolved");
  }
  const wave = waveForDay(state.day);
  if (!wave) {
    return fail("BATTLE_INVALID", "Current day is not a battle day");
  }

  const monster = WAVES[wave];
  const defense = baseDefense(state) + defenseBonusForWave(state, wave);
  const resolved = resolveBattle(
    { hp: state.cityHp, attack: baseAttack(state), defense },
    { name: monster.name, hp: monster.hp, attack: monster.attack },
    wave,
  );
  if (!resolved.ok) return resolved;

  const result = resolved.state;
  if (!result.won) {
    return {
      ok: true,
      state: {
        ...state,
        cityHp: result.cityHpAfter,
        battleResult: result,
        phase: "gameOver",
        effects: clearEffectsAfterWave(state.effects, wave),
      },
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      cityHp: result.cityHpAfter,
      battleResult: result,
      wavesCleared: state.wavesCleared + 1,
      phase: "battleReport",
      effects: clearEffectsAfterWave(state.effects, wave),
    },
  };
}

export function continueFromReport(state: GameState): ActionResult<GameState> {
  if (state.phase !== "battleReport") {
    return fail("INVALID_PHASE", "Not in battle report phase");
  }
  const wave = state.battleResult?.wave;
  if (wave === 1) {
    return { ok: true, state: { ...state, phase: "reward" } };
  }
  if (wave === 2) {
    return { ok: true, state: { ...state, phase: "victory" } };
  }
  return fail("INVALID_PHASE", "Missing battle result wave");
}

export function chooseReward(
  state: GameState,
  rewardId: string,
): ActionResult<GameState> {
  const applied = applyReward(state, rewardId);
  if (!applied.ok) return applied;
  return enterDay(applied.state, 11);
}

export function previewWave(state: GameState): {
  wave: WaveId;
  name: string;
  hp: number;
  attack: number;
  city: ReturnType<typeof getEffectiveStats> & { hp: number };
} {
  const wave = waveForDay(state.day) ?? (state.wavesCleared >= 1 ? 2 : 1);
  const monster = WAVES[wave];
  const stats = getEffectiveStats(state);
  return {
    wave,
    name: monster.name,
    hp: monster.hp,
    attack: monster.attack,
    city: { ...stats, hp: state.cityHp },
  };
}
