import type { ActionResult, GameState } from "../../../src/game/index";

export function mustOk(result: ActionResult): GameState {
  if (!result.ok) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }
  return result.state;
}