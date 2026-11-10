import { gameConfig, lastWaveNumber } from "./config";
import { isBattleDay, isPreparationDay } from "./calendar";
import { resolveBattle } from "./battle";
import { getDifficultyModifiers, scaleMonsterStat } from "./difficulty";
import { clearEndOfCampaignEffects, clearPrepIncomeBonus, clearWaveDefense } from "./effects";
import { enterCalendarDay, hasUnresolvedEvent } from "./dayEnter";
import { fail, isEnded, ok } from "./result";
import { getEffectiveAttack, getEffectiveDefense } from "./stats";
import type { ActionResult, GameState } from "./types";

export function endPreparationDay(state: GameState): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  if (state.phase !== "preparation" && state.phase !== "event") {
    return fail("INVALID_PHASE", "Day can only advance from preparation");
  }
  if (hasUnresolvedEvent(state)) return fail("EVENT_REQUIRED", "Resolve the event before advancing");
  if (!isPreparationDay(state.day) || !Number.isInteger(state.day)) {
    return fail("INVALID_TRANSITION", "Current day cannot advance");
  }
  const nextDay = state.day + 1;
  if (nextDay > gameConfig.lastDay) return fail("INVALID_TRANSITION", "Calendar is finished");

  const entered = enterCalendarDay(state, nextDay);
  return ok({ ...entered, revision: state.revision + 1 });
}

export function startBattle(state: GameState): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  if (state.phase === "battleReport" || (state.battleResult && state.battleResult.day === state.day)) {
    return fail("BATTLE_ALREADY_RESOLVED", "Battle already computed");
  }
  if (state.phase !== "battleReady" || !isBattleDay(state.day)) {
    return fail("INVALID_PHASE", "Battle can only start on a battle-ready day");
  }
  const monster = gameConfig.waves.find((wave) => wave.day === state.day);
  if (!monster) return fail("BATTLE_INVALID", "No monster configured for this day");
  const mods = getDifficultyModifiers(state.difficulty);
  const monsterHp = scaleMonsterStat(monster.hp, mods.monsterHp);
  const monsterAttack = scaleMonsterStat(monster.attack, mods.monsterAttack);
  const cityAttack = getEffectiveAttack(state);
  const cityDefense = getEffectiveDefense(state, monster.wave);
  if (state.cityHp <= 0 || cityAttack <= 0) return fail("BATTLE_INVALID", "City cannot fight");

  const result = resolveBattle({
    wave: monster.wave,
    day: state.day,
    cityHp: state.cityHp,
    cityAttack,
    cityDefense,
    monsterHp,
    monsterAttack,
  });
  if (!result) return fail("BATTLE_INVALID", "Battle configuration is invalid");

  let effects = clearWaveDefense(state.effects, monster.wave);
  effects = clearPrepIncomeBonus(effects);
  if (monster.wave === lastWaveNumber()) effects = clearEndOfCampaignEffects();
  const won = result.won;
  return ok({
    ...state,
    cityHp: result.cityHpAfter,
    effects,
    battleResult: result,
    wavesCleared: won ? monster.wave : state.wavesCleared,
    phase: won ? "battleReport" : "gameOver",
    revision: state.revision + 1,
  });
}

export function continueFromReport(state: GameState): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  if (state.phase !== "battleReport" || !state.battleResult) {
    return fail("INVALID_PHASE", "No battle report to continue");
  }
  if (!state.battleResult.won) {
    return ok({ ...state, phase: "gameOver", revision: state.revision + 1 });
  }
  if (state.battleResult.wave >= lastWaveNumber()) {
    return ok({
      ...state,
      phase: "victory",
      effects: clearEndOfCampaignEffects(),
      revision: state.revision + 1,
    });
  }
  return ok({ ...state, phase: "reward", revision: state.revision + 1 });
}

export function surrender(state: GameState): ActionResult {
  if (isEnded(state)) return fail("GAME_ENDED", "Game has ended");
  return ok({ ...state, phase: "gameOver", revision: state.revision + 1 });
}
