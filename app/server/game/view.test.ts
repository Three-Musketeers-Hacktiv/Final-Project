import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import { createGameState } from "@/server/game-engine/adapter";
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

describe("game view timeline", () => {
  it("exposes the persisted timeline", () => {
    const run = runDocument();
    run.timeline.push({
      id: "action-1:0",
      day: 1,
      category: "city",
      tone: "city",
      icon: "wallLevel",
      highlight: "Upgraded Wall",
      text: "to Lv.1.",
    });

    expect(toGameView(run).timeline).toEqual(run.timeline);
  });

  it("normalizes a legacy document without timeline to an empty array", () => {
    const run = runDocument();
    const legacy = { ...run, timeline: undefined } as unknown as GameRunDocument;

    expect(toGameView(legacy).timeline).toEqual([]);
  });

  it("exposes only the trusted reward options for the current reward wave", () => {
    const run = runDocument();
    run.state = { ...run.state, phase: "reward", wavesCleared: 1 };

    const rewardView = toGameView(run);
    expect(rewardView.rewardOptions).toHaveLength(3);
    expect(rewardView.rewardOptions.every((reward) => reward.id.startsWith("w1-"))).toBe(true);

    run.state = { ...run.state, phase: "preparation" };
    expect(toGameView(run).rewardOptions).toEqual([]);
  });

  it("keeps eventNarrative as the active event, with consequence still optional", () => {
    const run = runDocument();
    expect(toGameView(run).eventNarrative).toBeNull();
    run.state = {
      ...run.state,
      phase: "event",
      activeEvent: {
        eventId: "day-1",
        packageId: "day-1",
        day: run.state.day,
        title: "Gate",
        description: "Someone is at the gate.",
        source: "fallback",
        choices: [
          { id: "wait", label: "Wait", goldCost: 0, effects: [] },
          { id: "pay", label: "Pay", goldCost: 10, effects: [{ type: "grantGold", amount: 1 }] },
        ],
      },
    };
    const view = toGameView(run);
    expect(view.eventNarrative).toBe(run.state.activeEvent);
    expect(view.eventNarrative?.choices.map((choice) => choice.id)).toEqual(["wait", "pay"]);
    expect(view.eventNarrative?.choices.every((choice) => !("consequence" in choice && choice.consequence))).toBe(true);
  });
});
