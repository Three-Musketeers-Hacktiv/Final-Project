import type { ActionResult, GameErrorCode, GameState } from "./types";

export function ok(state: GameState): ActionResult {
  return { ok: true, state };
}

export function fail(code: GameErrorCode, message: string): ActionResult {
  return { ok: false, error: { code, message } };
}

export function isEnded(state: GameState): boolean {
  return state.phase === "gameOver" || state.phase === "victory";
}
