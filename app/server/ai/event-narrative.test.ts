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
  process.env.OPENAI_PROMPT_VERSION = "test-v1";
});

function stateAtFirstEvent() {
  const initial = createGameState("run-ai-test");
  const dayTwo = applyGameAction(initial, { type: "endPreparationDay", payload: {} });
  if (!dayTwo.ok) throw new Error("Could not advance to day two");
  const dayThree = applyGameAction(dayTwo.state, { type: "endPreparationDay", payload: {} });
  if (!dayThree.ok || !dayThree.state.activeEvent) throw new Error("Could not enter event day");
  return dayThree.state;
}

describe("event narrative runtime", () => {
  it("decorates only trusted narrative fields", async () => {
    const state = stateAtFirstEvent();
    const original = state.activeEvent!;
    const generator: EventNarrativeGenerator = {
      model: "test-model",
      async generate() {
        return {
          title: "Judul AI",
          description: "Deskripsi AI",
          choices: [
            { id: original.choices[1].id, label: "Pilihan kedua" },
            { id: original.choices[0].id, label: "Pilihan pertama" },
          ],
        };
      },
    };

    const narrative = await generateEventNarrative(original, generator);
    const decorated = decorateActiveEvent(state, narrative).activeEvent!;

    expect(narrative.source).toBe("ai");
    expect(decorated.title).toBe("Judul AI");
    expect(decorated.choices[0].goldCost).toBe(original.choices[0].goldCost);
    expect(decorated.choices[0].effects).toEqual(original.choices[0].effects);
    expect(decorated.choices[0].label).toBe("Pilihan pertama");
  });

  it("falls back when generated choice ids are untrusted", async () => {
    const event = stateAtFirstEvent().activeEvent!;
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const generator: EventNarrativeGenerator = {
      model: "test-model",
      async generate() {
        return {
          title: "Invalid",
          description: "Invalid",
          choices: [
            { id: "invented-one", label: "Invalid" },
            { id: "invented-two", label: "Invalid" },
          ],
        };
      },
    };

    const result = await generateEventNarrative(event, generator);

    expect(result.source).toBe("fallback");
    expect(result.narrative.title).toBe(event.title);
    expect(result.narrative.choices.map((choice) => choice.id)).toEqual(
      event.choices.map((choice) => choice.id),
    );
    warning.mockRestore();
  });
});
