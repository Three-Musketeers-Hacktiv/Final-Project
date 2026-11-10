import { describe, expect, it } from "vitest";

import { createInitialState, endPreparationDay, validateEventPackage } from "../../../src/game";
import { resetServerEnv } from "@/server/config/env";
import {
  buildPackageGenerationInput,
  canonicalizeEventPackage,
  GeminiEventPackageGenerator,
  generatedEventPackageSchema,
} from "./event-package";

const enabled = process.env.LIVE_GEMINI_SMOKE === "1";

function openedState() {
  let state = createInitialState({ runId: "pkg-live-smoke" });
  for (let step = 0; step < 20 && !state.activeEvent; step += 1) {
    const ended = endPreparationDay(state);
    if (!ended.ok) throw new Error(ended.error.message);
    state = ended.state;
  }
  return state;
}

describe.skipIf(!enabled)("live Gemini event package smoke", () => {
  it("requests one package from Gemini and accepts only a validated AI draft", async () => {
    expect(process.env.GEMINI_API_KEY, "GEMINI_API_KEY is required for live smoke").toBeTruthy();
    expect(process.env.GEMINI_MODEL, "GEMINI_MODEL is required for live smoke").toBeTruthy();
    resetServerEnv();
    const state = openedState();
    const event = state.activeEvent;
    if (!event) throw new Error("expected an open event");
    const before = JSON.stringify(state);
    const generator = new GeminiEventPackageGenerator();
    const draft = await generator.generate(buildPackageGenerationInput(state, event));
    expect(generator.provider).toBe("gemini");
    expect(generatedEventPackageSchema.safeParse(draft).success).toBe(true);
    const canonical = canonicalizeEventPackage(draft, {
      eventId: event.eventId,
      day: event.day,
      isConsequence: Boolean(event.isConsequence),
    });
    const validated = validateEventPackage(canonical, {
      day: event.day,
      wavesCleared: state.wavesCleared,
      allowConsequence: !event.isConsequence,
      checkDominance: true,
      enforceWaveTiming: true,
      enforceDecade: true,
    });
    expect(validated.ok).toBe(true);
    expect(canonical.packageId.startsWith("ai:")).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  }, 20_000);
});
