import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import type { SubmitActionRequest } from "@/contracts/api";
import { applyGameAction, createGameState } from "@/server/game-engine/adapter";
import { describeTimelineAction } from "@/server/game/timeline";
import type { GameRunDocument } from "@/server/game/types";
import { toGameView } from "@/server/game/view";

function runDocument(): GameRunDocument {
  const runId = new ObjectId();
  const now = new Date("2026-11-08T00:00:00.000Z");
  return {
    _id: runId,
    userId: new ObjectId(),
    gameRulesetId: new ObjectId(),
    startRequestId: "5a9d7be4-1c56-4bf4-99e0-12ca9e6efbb9",
    startRequestPayloadHash: "hash",
    state: createGameState(runId.toHexString()),
    timeline: [],
    createdAt: now,
    updatedAt: now,
    endedAt: null,
  };
}

function successfulState(run: GameRunDocument, action: SubmitActionRequest) {
  const result = applyGameAction(run.state, action);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

describe("action timeline author", () => {
  it("creates deterministic entries from trusted before and after views", () => {
    const run = runDocument();
    const action: SubmitActionRequest = {
      actionId: "5a9d7be4-1c56-4bf4-99e0-12ca9e6efbb9",
      expectedRevision: run.state.revision,
      type: "upgradeWall",
      payload: {},
    };
    const nextRun = { ...run, state: successfulState(run, action) };

    expect(describeTimelineAction(action, toGameView(run), toGameView(nextRun))).toEqual([
      {
        id: `${action.actionId}:0`,
        day: 1,
        category: "city",
        tone: "city",
        icon: "wallLevel",
        highlight: "Upgraded Wall",
        text: "to Lv.1. Defense 2 → 5.",
      },
    ]);
  });

  it("records surrender without changing engine-owned gameplay values", () => {
    const run = runDocument();
    const action: SubmitActionRequest = {
      actionId: "e18e7dfc-7fb2-45c0-986d-f182e9ea5e7c",
      expectedRevision: run.state.revision,
      type: "surrender",
      payload: {},
    };
    const nextRun = { ...run, state: successfulState(run, action) };

    expect(describeTimelineAction(action, toGameView(run), toGameView(nextRun))).toEqual([
      {
        id: `${action.actionId}:0`,
        day: 1,
        category: "battle",
        tone: "loss",
        icon: "thisWave",
        highlight: "City surrendered.",
        text: "The defense ended on day 1.",
      },
    ]);
  });

  it("does not invent an entry for report continuation", () => {
    const run = runDocument();
    const action: SubmitActionRequest = {
      actionId: "c1bc0042-32e4-4188-b049-b7b7890dc78f",
      expectedRevision: run.state.revision,
      type: "continueFromReport",
      payload: {},
    };

    expect(describeTimelineAction(action, toGameView(run), toGameView(run))).toEqual([]);
  });
});
