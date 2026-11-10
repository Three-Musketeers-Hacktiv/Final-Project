import { expect } from "vitest";
import type { ActionResult, GameErrorCode, GameState } from "../../../src/game/index";
import { freezeJson } from "./roundTrip";

export function expectError(result: ActionResult, code: GameErrorCode): void {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe(code);
}

/** Panggil aksi dan pastikan objek state masukan tidak berubah. */
export function callWithoutMutating(state: GameState, run: (current: GameState) => ActionResult): ActionResult {
  const before = freezeJson(state);
  const result = run(state);
  expect(freezeJson(state)).toBe(before);
  return result;
}
