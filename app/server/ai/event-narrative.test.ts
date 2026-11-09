import { beforeAll, describe, expect, it, vi } from "vitest";

import { applyGameAction, createGameState } from "@/server/game-engine/adapter";
import {
  decorateActiveEvent,
  generateEventNarrative,
  type EventNarrativeGenerator,
} from "./event-narrative";

beforeAll(() => {
  process.env.MONGODB_URI = "mongodb://localhost:27017";
  process.env.JWT_SECRET = "test-secret-value-with-at-least-32-characters";
  process.env.APP_ORIGIN = "http://localhost:3000";
  process.env.AI_PROVIDER = "gemini";
  process.env.AI_PROMPT_VERSION = "test-v1";
});

function stateAtFirstEvent() {
  let state = createGameState("run-ai-test");
  while (!state.activeEvent && state.day < 10) {
    const advanced = applyGameAction(state, { type: "endPreparationDay", payload: {} });
    if (!advanced.ok) throw new Error("Could not enter event day");
    state = advanced.state;
  }
  if (!state.activeEvent) throw new Error("Could not enter event day");
  return state;
}

describe("event narrative runtime", () => {
  it("decorates only trusted narrative fields", async () => {
    const state = stateAtFirstEvent();
    const original = state.activeEvent!;
    const generator: EventNarrativeGenerator = {
      provider: "test",
      model: "test-model",
      async generate() {
        return {
          title: "An Urgent Counsel",
          description: "My lord, the city awaits your decision.",
          choices: [...original.choices].reverse().map((choice, index) => ({
            id: choice.id,
            label: `Trusted counsel ${index + 1}`,
          })),
        };
      },
    };

    const narrative = await generateEventNarrative(original, generator);
    const decorated = decorateActiveEvent(state, narrative).activeEvent!;

    expect(narrative.source).toBe("ai");
    expect(narrative.provider).toBe("test");
    expect(decorated.title).toBe("An Urgent Counsel");
    expect(decorated.choices[0].goldCost).toBe(original.choices[0].goldCost);
    expect(decorated.choices[0].effects).toEqual(original.choices[0].effects);
    expect(decorated.choices).toHaveLength(original.choices.length);
    expect(decorated.choices.every((choice) => choice.label.startsWith("Trusted counsel"))).toBe(true);
  });

  it("falls back when generated choice ids are untrusted", async () => {
    const event = stateAtFirstEvent().activeEvent!;
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const generator: EventNarrativeGenerator = {
      provider: "test",
      model: "test-model",
      async generate() {
        return {
          title: "Invalid",
          description: "Invalid",
          choices: event.choices.map((_, index) => ({
            id: `invented-${index}`,
            label: "Invalid",
          })),
        };
      },
    };

    const result = await generateEventNarrative(event, generator);

    expect(result.source).toBe("fallback");
    expect(result.provider).toBeNull();
    expect(result.narrative.title).toBe(event.title);
    expect(result.narrative.choices.map((choice) => choice.id)).toEqual(
      event.choices.map((choice) => choice.id),
    );
    warning.mockRestore();
  });
});
