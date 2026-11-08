import type { GameActionDocument } from "@/server/game/types";
import { ApiError } from "@/server/http/api-error";

export function assertActionIdempotency(
  existing: Pick<GameActionDocument, "payloadHash" | "revisionAfter">,
  requestPayloadHash: string,
  currentRevision = existing.revisionAfter,
): void {
  if (existing.payloadHash !== requestPayloadHash) {
    throw new ApiError(
      409,
      "ACTION_PAYLOAD_CONFLICT",
      "actionId was already used with another action payload",
      { currentRevision: currentRevision.toString() },
    );
  }

}
