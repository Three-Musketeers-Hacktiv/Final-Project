import type { GameState } from "../../../src/game/index";

/** Salin state lewat JSON, sama seperti save/load debug tanpa storage. */
export function roundTrip(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function freezeJson(state: GameState): string {
  return JSON.stringify(state);
}