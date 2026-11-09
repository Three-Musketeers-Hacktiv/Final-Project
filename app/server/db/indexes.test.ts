import type { Db } from "mongodb";
import { describe, expect, it, vi } from "vitest";

import { databaseIndexDefinitions, ensureDatabaseIndexes } from "./indexes";

function hasIndex(collection: string, keys: Record<string, number>, name: string) {
  return databaseIndexDefinitions.some(
    (definition) =>
      definition.collection === collection &&
      definition.options?.name === name &&
      JSON.stringify(definition.keys) === JSON.stringify(keys),
  );
}

describe("database index definitions", () => {
  it("contains the remediation query indexes", () => {
    expect(hasIndex("game_actions", { gameRunId: 1, createdAt: 1 }, "actions_run_created")).toBe(true);
    expect(hasIndex("game_properties", { gameActionId: 1 }, "properties_action")).toBe(true);
    expect(hasIndex("runs_event", { gameRunId: 1, day: 1 }, "run_events_day")).toBe(true);
    expect(
      hasIndex(
        "event_data",
        { gameRulesetId: 1, packageId: 1, day: 1, createdAt: -1 },
        "events_ruleset_package_day_created",
      ),
    ).toBe(true);
  });

  it("can apply the complete index set repeatedly", async () => {
    const createIndex = vi.fn().mockResolvedValue("index-name");
    const database = {
      collection: vi.fn(() => ({ createIndex })),
    } as unknown as Db;

    await ensureDatabaseIndexes(database);
    await ensureDatabaseIndexes(database);

    expect(createIndex).toHaveBeenCalledTimes(databaseIndexDefinitions.length * 2);
  });
});
