import type { SaveGamePointer } from "@/server/auth/types";
import {
  assertPatchedGameState,
  getEngineRulesetMetadata,
} from "@/server/game-engine/adapter";
import type { GameRulesetDocument, GameRunDocument } from "@/server/game/types";
import { ApiError } from "@/server/http/api-error";

function assertRulesetCompatible(
  run: GameRunDocument,
  ruleset: GameRulesetDocument | null,
): void {
  const expected = getEngineRulesetMetadata();
  if (
    !ruleset ||
    !ruleset._id.equals(run.gameRulesetId) ||
    ruleset.rulesetId !== expected.rulesetId ||
    ruleset.engineVersion !== expected.engineVersion ||
    ruleset.stateVersion !== expected.stateVersion ||
    ruleset.configFingerprint !== expected.configFingerprint
  ) {
    throw new ApiError(
      409,
      "RUN_INTEGRITY_ERROR",
      "Game run uses an incompatible ruleset",
    );
  }
}

export function assertLoadableRun(
  run: GameRunDocument,
  ruleset: GameRulesetDocument | null,
  pointer?: SaveGamePointer,
): void {
  if (run.state.version !== 4) {
    throw new ApiError(
      409,
      "UNSUPPORTED_STATE_VERSION",
      "Game state version is not supported",
    );
  }

  try {
    assertPatchedGameState(run.state, run._id.toHexString());
  } catch {
    throw new ApiError(
      409,
      "RUN_INTEGRITY_ERROR",
      "Game state is incompatible with the current engine",
    );
  }

  assertRulesetCompatible(run, ruleset);

  if (
    pointer &&
    (!pointer.gameRunId.equals(run._id) || pointer.savedRevision !== run.state.revision)
  ) {
    throw new ApiError(
      409,
      "SAVE_POINTER_MISMATCH",
      "Active save pointer does not match the persisted game",
    );
  }
}
