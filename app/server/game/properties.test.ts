import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import { createGameState } from "@/server/game-engine/adapter";
import { createPropertyDocuments } from "./properties";

describe("createPropertyDocuments", () => {
  it("creates exactly eight engine-backed properties", () => {
    const runId = new ObjectId();
    const state = createGameState(runId.toHexString());
    const properties = createPropertyDocuments(runId, state, null, new Date());

    expect(properties).toHaveLength(8);
    expect(properties.map((entry) => entry.statKey).sort()).toEqual([
      "attack",
      "cityHp",
      "cityLevel",
      "cityMaxHp",
      "defense",
      "gold",
      "troopLevel",
      "wallLevel",
    ]);
    expect(properties.every((entry) => entry.revision === 0)).toBe(true);
  });
});
