import { describe, expect, it } from "vitest";

import { createInitialState, endPreparationDay, installCommittedPackage } from "../../../src/game";
import { assertPatchedGameState, createGameState } from "./adapter";

describe("dynamic package load compatibility", () => {
  it("keeps a catalog save loadable", () => {
    const state = createGameState("compat-catalog");
    expect(() => assertPatchedGameState(state, state.runId)).not.toThrow();
  });

  it("accepts one committed dynamic package on the original event id", () => {
    let state = createInitialState({ runId: "compat-dynamic" });
    for (let step = 0; step < 20 && state.phase !== "event"; step += 1) {
      const ended = endPreparationDay(state);
      if (!ended.ok) throw new Error(ended.error.message);
      state = ended.state;
    }
    const event = state.activeEvent;
    if (!event) throw new Error("expected event");
    const decade = Math.max(1, Math.ceil(state.day / 10));
    const installed = installCommittedPackage(state, {
      packageId: `ai:${event.eventId}`,
      eventId: event.eventId,
      decade,
      title: "Smoke on the wall",
      description: "A scout asks for orders before night.",
      choices: [
        { id: "hold", label: "Hold the wall", goldCost: 0, effects: [] },
        { id: "scout", label: "Send the scout", goldCost: 12, effects: [{ type: "grantGold", amount: 5 }] },
      ],
    }, "ai");
    expect(installed.ok).toBe(true);
    if (!installed.ok) return;
    expect(() => assertPatchedGameState(installed.state, installed.state.runId)).not.toThrow();
    const broken = {
      ...installed.state,
      eventPackageStore: {
        ...installed.state.eventPackageStore,
        "ai:bad": {
          packageId: "ai:bad",
          eventId: "nope",
          decade: 1,
          title: "x",
          description: "y",
          choices: [],
        },
      },
    };
    expect(() => assertPatchedGameState(broken as typeof installed.state, installed.state.runId)).toThrow(
      /eventPlan/,
    );
  });
});
