import { restoreEventNarrative, type NarrativeResult } from "@/server/ai/event-narrative";
import type { GameState } from "@/server/game-engine/adapter";
import type { EventDataDocument } from "@/server/game/types";

type ActiveEvent = NonNullable<GameState["activeEvent"]>;

/**
 * After a live provider miss, reuse the newest valid shared AI row, then the
 * newest valid seeded fallback row. Invalid rows are skipped. Sources stay honest.
 */
export function selectSharedNarrative(input: {
  local: NarrativeResult;
  event: ActiveEvent;
  aiCandidates: EventDataDocument[];
  fallbackCandidates: EventDataDocument[];
}): { result: NarrativeResult; reused: EventDataDocument | null } {
  const tiers: Array<{ docs: EventDataDocument[]; source: "ai" | "fallback" }> = [
    { docs: input.aiCandidates, source: "ai" },
    { docs: input.fallbackCandidates, source: "fallback" },
  ];

  for (const tier of tiers) {
    for (const doc of tier.docs) {
      if (doc.validationStatus !== "valid" || doc.source !== tier.source) continue;
      try {
        return {
          result: restoreEventNarrative(input.event, doc.narrative, {
            source: tier.source,
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
  }

  return { result: input.local, reused: null };
}
