import { restoreEventNarrative, type NarrativeResult } from "@/server/ai/event-narrative";
import type { GameState } from "@/server/game-engine/adapter";
import type { EventDataDocument } from "@/server/game/types";

type ActiveEvent = NonNullable<GameState["activeEvent"]>;

/**
 * After a live provider miss, reuse seeded fallback rows only.
 * Shared AI rows are not reused: they may describe another city's condition.
 * Prefer fallback-catalog-v3, then v2, then older seeded rows. Invalid rows are skipped.
 * Older rows stay in MongoDB and are not deleted; a valid newer catalog wins.
 */
export function selectSharedNarrative(input: {
  local: NarrativeResult;
  event: ActiveEvent;
  aiCandidates?: EventDataDocument[];
  fallbackCandidates: EventDataDocument[];
}): { result: NarrativeResult; reused: EventDataDocument | null } {
  const current = input.fallbackCandidates.filter((doc) => doc.promptVersion.startsWith("fallback-catalog-v3"));
  const previous = input.fallbackCandidates.filter((doc) => doc.promptVersion.startsWith("fallback-catalog-v2"));
  const older = input.fallbackCandidates.filter(
    (doc) => !doc.promptVersion.startsWith("fallback-catalog-v3") && !doc.promptVersion.startsWith("fallback-catalog-v2"),
  );
  const preferred = [...current, ...previous];
  for (const doc of [...preferred, ...older]) {
    if (doc.validationStatus !== "valid" || doc.source !== "fallback") continue;
    try {
      return {
        result: restoreEventNarrative(input.event, doc.narrative, {
          source: "fallback",
          provider: doc.provider ?? null,
          model: doc.model ?? null,
          promptVersion: doc.promptVersion,
        }),
        reused: doc,
      };
    } catch {
      // Choice drift or schema failure: try the next candidate.
    }
  }

  return { result: input.local, reused: null };
}
