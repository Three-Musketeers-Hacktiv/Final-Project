import { createHash } from "node:crypto";

import { ObjectId } from "mongodb";

import { getEngineRulesetMetadata } from "@/server/game-engine/adapter";
import type { EventDataDocument, GameRulesetDocument } from "@/server/game/types";
import { toEventDay } from "@/server/game/persisted-values";
import type { FallbackEventSource } from "./fallback-catalog";

export function deterministicEventId(seedKey: string): ObjectId {
  return new ObjectId(createHash("sha256").update(seedKey).digest("hex").slice(0, 24));
}

export function assertSeedRuleset(
  ruleset: Pick<GameRulesetDocument, "rulesetId" | "engineVersion" | "stateVersion" | "configFingerprint">,
  requestedRulesetId: string,
): void {
  const metadata = getEngineRulesetMetadata();
  if (requestedRulesetId !== metadata.rulesetId) {
    throw new Error(`Refusing seed for unexpected ruleset id: ${requestedRulesetId}`);
  }
  if (
    ruleset.rulesetId !== metadata.rulesetId ||
    ruleset.engineVersion !== metadata.engineVersion ||
    ruleset.stateVersion !== metadata.stateVersion ||
    ruleset.configFingerprint !== metadata.configFingerprint
  ) {
    throw new Error("Ruleset is not compatible with the current engine");
  }
}

export function planFallbackInserts(
  events: FallbackEventSource[],
  existingPromptVersions: ReadonlySet<string>,
): { insert: FallbackEventSource[]; skip: string[] } {
  const insert: FallbackEventSource[] = [];
  const skip: string[] = [];
  for (const event of events) {
    if (existingPromptVersions.has(event.seedKey)) skip.push(event.seedKey);
    else insert.push(event);
  }
  return { insert, skip };
}

export function toFallbackEventData(
  event: FallbackEventSource,
  gameRulesetId: ObjectId,
  createdAt: Date,
): EventDataDocument {
  return {
    _id: deterministicEventId(event.seedKey),
    gameRulesetId,
    packageId: event.packageId,
    day: toEventDay(event.day),
    narrative: event.narrative,
    source: "fallback",
    promptVersion: event.seedKey,
    schemaVersion: 1,
    validationStatus: "valid",
    createdAt,
  };
}
