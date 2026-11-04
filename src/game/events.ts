import { eventPackageById, eventPackageForDay } from "./config";
import { applyEffects } from "./effects";
import type { ActionResult, ActiveEvent, GameState } from "./types";

export function attachActiveEvent(
  state: GameState,
  active: ActiveEvent,
): GameState {
  return { ...state, activeEvent: active, phase: "event" };
}

/** Local fixture narrative when mock backend is unavailable. */
export function ensureLocalEvent(state: GameState): GameState {
  if (state.phase !== "event" || state.activeEvent) return state;
  const pkg = eventPackageForDay(state.day);
  if (!pkg) return state;
  return attachActiveEvent(state, {
    packageId: pkg.id,
    day: pkg.day,
    title: pkg.title,
    description: pkg.description,
    choiceIds: [pkg.choices[0].id, pkg.choices[1].id],
    source: "fallback",
  });
}

export function chooseEventOption(
  state: GameState,
  choiceId: string,
): ActionResult<GameState> {
  if (state.phase === "gameOver" || state.phase === "victory") {
    return {
      ok: false,
      error: { code: "GAME_ENDED", message: "Game has ended" },
    };
  }
  if (state.phase !== "event" || !state.activeEvent) {
    return {
      ok: false,
      error: { code: "INVALID_PHASE", message: "No active event to resolve" },
    };
  }
  if (state.completedEventIds.includes(state.activeEvent.packageId)) {
    return {
      ok: false,
      error: {
        code: "EVENT_ALREADY_RESOLVED",
        message: "Event already resolved",
      },
    };
  }

  const pkg = eventPackageById(state.activeEvent.packageId);
  if (!pkg || pkg.day !== state.day) {
    return {
      ok: false,
      error: { code: "INVALID_CHOICE", message: "Event package mismatch" },
    };
  }

  const choice = pkg.choices.find((c) => c.id === choiceId);
  if (!choice || !state.activeEvent.choiceIds.includes(choiceId)) {
    return {
      ok: false,
      error: {
        code: "INVALID_CHOICE",
        message: "Choice is not valid for event",
      },
    };
  }
  if (state.gold < choice.goldCost) {
    return {
      ok: false,
      error: {
        code: "INSUFFICIENT_GOLD",
        message: "Not enough gold for choice",
      },
    };
  }

  let next: GameState = {
    ...state,
    gold: state.gold - choice.goldCost,
    completedEventIds: [...state.completedEventIds, pkg.id],
    activeEvent: null,
    phase: "preparation",
  };
  next = applyEffects(next, choice.effects, `${pkg.id}:${choice.id}`);
  return { ok: true, state: next };
}
