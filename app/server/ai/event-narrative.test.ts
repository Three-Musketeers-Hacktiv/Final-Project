import { beforeAll, describe, expect, it, vi } from "vitest";

import { applyGameAction, createGameState } from "@/server/game-engine/adapter";
import {
  decorateActiveEvent,
  generateEventNarrative,
  restoreEventNarrative,
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

  it("keeps the engine label when AI mentions a currency term", async () => {
    const state = stateAtFirstEvent();
    const original = state.activeEvent!;
    const paid = original.choices.find((choice) => choice.goldCost > 0);
    expect(paid).toBeTruthy();
    const generator: EventNarrativeGenerator = {
      provider: "test",
      model: "test-model",
      async generate() {
        return {
          title: original.title,
          description: original.description,
          choices: original.choices.map((choice) => ({
            id: choice.id,
            label: choice.id === paid!.id ? "Protect the treasury" : "Hold position",
          })),
        };
      },
    };
    const narrative = await generateEventNarrative(original, generator);
    const decorated = decorateActiveEvent(state, narrative).activeEvent!;
    expect(decorated.choices.find((choice) => choice.id === paid!.id)!.label).toBe(paid!.label);
    expect(decorated.choices.find((choice) => choice.id === paid!.id)!.goldCost).toBe(paid!.goldCost);
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

  it("restores stored text through trusted ids and label decoration", () => {
    const state = stateAtFirstEvent();
    const event = state.activeEvent!;
    const paid = event.choices.find((choice) => choice.goldCost > 0)!;
    const restored = restoreEventNarrative(event, {
      title: "Stored counsel",
      description: "My lord, this advice was generated earlier.",
      choices: event.choices.map((choice) => ({
        id: choice.id,
        label: choice.id === paid.id ? "Protect the treasury" : "Wait and observe",
      })),
    }, {
      source: "ai",
      provider: "gemini",
      model: "stored-model",
      promptVersion: "stored-v1",
    });

    const decorated = decorateActiveEvent(state, restored).activeEvent!;
    expect(restored.source).toBe("ai");
    expect(decorated.title).toBe("Stored counsel");
    expect(decorated.choices.find((choice) => choice.id === paid.id)?.label).toBe(paid.label);
    expect(decorated.choices.find((choice) => choice.id === paid.id)?.goldCost).toBe(paid.goldCost);
  });

  it("rejects a stored narrative with untrusted choice ids", () => {
    const event = stateAtFirstEvent().activeEvent!;
    expect(() => restoreEventNarrative(event, {
      title: "Invalid stored counsel",
      description: "Invalid",
      choices: event.choices.map((_, index) => ({ id: `forged-${index}`, label: "Invalid" })),
    }, {
      source: "ai",
      provider: "gemini",
      model: null,
      promptVersion: "stored-v1",
    })).toThrow("untrusted choice ids");
  });
});
