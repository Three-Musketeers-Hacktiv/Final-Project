import { loadEnvConfig } from "@next/env";

import { getDatabase, getMongoClient } from "../server/db/mongodb";
import { getEngineRulesetMetadata } from "../server/game-engine/adapter";
import type { EventDataDocument, GameRulesetDocument } from "../server/game/types";
import { loadFallbackCatalog, validateFallbackCatalog } from "./lib/fallback-catalog";
import {
  assertSeedRuleset,
  deterministicEventId,
  planFallbackInserts,
  toFallbackEventData,
} from "./lib/fallback-seed";

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Seed failed";
  return message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[redacted]");
}

function wantsWrite(argv: string[]): boolean {
  return argv.includes("--write");
}

function requestedRulesetId(argv: string[]): string {
  const flag = argv.find((arg) => arg.startsWith("--ruleset-id="));
  return flag ? flag.slice("--ruleset-id=".length) : getEngineRulesetMetadata().rulesetId;
}

async function main() {
  loadEnvConfig(process.cwd());
  const write = wantsWrite(process.argv);
  const { events, manifest } = loadFallbackCatalog();
  const errors = validateFallbackCatalog(events, manifest);
  if (errors.length > 0) {
    console.error(`Rejected fallback catalog (${errors.length} errors)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  const rulesetId = requestedRulesetId(process.argv);
  const database = await getDatabase();
  try {
    const ruleset = await database.collection<GameRulesetDocument>("game_rulesets").findOne({ rulesetId });
    if (!ruleset) {
      throw new Error(`No game_rulesets document for ${rulesetId}. Start the app once, then retry.`);
    }
    assertSeedRuleset(ruleset, rulesetId);

    const collection = database.collection<EventDataDocument>("event_data");
    const ids = events.map((event) => deterministicEventId(event.seedKey));
    const existingById = await collection
      .find({ _id: { $in: ids } }, { projection: { promptVersion: 1, gameRulesetId: 1 } })
      .toArray();
    const foreign = existingById.find((doc) => !doc.gameRulesetId.equals(ruleset._id));
    if (foreign) {
      throw new Error("A fallback document id is already used by another ruleset");
    }
    const existingKeys = new Set(existingById.map((doc) => doc.promptVersion));
    const plan = planFallbackInserts(events, existingKeys);
    console.info(
      `Fallback seed ${write ? "write" : "dry-run"}: insert ${plan.insert.length}, skip ${plan.skip.length}, rejected 0`,
    );

    if (!write) return;

    const now = new Date();
    if (plan.insert.length === 0) return;
    await collection.insertMany(
      plan.insert.map((event) => toFallbackEventData(event, ruleset._id, now)),
      { ordered: false },
    );
    console.info(`Inserted ${plan.insert.length} fallback event_data documents`);
  } finally {
    const client = await getMongoClient();
    await client.close();
  }
}

main().catch((error) => {
  console.error(safeMessage(error));
  process.exitCode = 1;
});
