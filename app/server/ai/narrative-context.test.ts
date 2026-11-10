import { describe, expect, it } from "vitest";

import { createGameState } from "@/server/game-engine/adapter";
import { buildNarrativeContext, goldBand, hpBand } from "./narrative-context";
import { eventPackageById } from "../../../src/game";

describe("narrative context", () => {
  it("bands a healthy rich city differently from a broken poor one", () => {
    expect(hpBand(140, 150)).toBe("strong");
    expect(hpBand(20, 150)).toBe("critical");
    expect(goldBand(240)).toBe("flush");
    expect(goldBand(10)).toBe("broke");
  });

  it("names the next threat and omits pending consequence secrets", () => {
    const state = createGameState("context-run");
    state.cityHp = 20;
    state.gold = 12;
    state.pendingConsequences = [{
      id: "secret",
      originEventId: "d1-scouts-a",
      originChoiceId: "d1-scouts-a-skip",
      packageId: "c-raid-wave1",
      triggerDay: 8,
    }];
    const pkg = eventPackageById("d5-market-b")!;
    const event = {
      eventId: pkg.eventId,
      packageId: pkg.packageId,
      day: 46,
      title: pkg.title,
      description: pkg.description,
      choices: pkg.choices,
      source: "local" as const,
    };
    state.day = 46;
    const context = buildNarrativeContext(state, event, [
      { day: 1, packageId: "a", choiceId: "a", choiceLabel: "one" },
      { day: 2, packageId: "b", choiceId: "b", choiceLabel: "two" },
      { day: 3, packageId: "c", choiceId: "c", choiceLabel: "three" },
      { day: 4, packageId: "d", choiceId: "d", choiceLabel: "four" },
    ]);
    expect(context.city.hpBand).toBe("critical");
    expect(context.city.goldBand).toBe("broke");
    expect(context.threat.nextEnemyName).toBe("Wyvern");
    expect(context.recentDecisions).toHaveLength(3);
    expect(context.event.trustedChoices.map((choice) => choice.intent)).toEqual([
      "bargain_cheaper_works",
      "reinforce_structures",
      "hold_position",
    ]);
    expect(JSON.stringify(context)).not.toContain("c-raid-wave1");
    expect(JSON.stringify(context)).not.toContain("pendingConsequences");
  });

  it("fills origin from the earlier choice, not a guessed story", () => {
    const state = createGameState("origin-run");
    state.eventPlan = [{ day: 6, packageId: "d5-market-b", eventId: "d5-market-b" }];
    const event = {
      eventId: "c-unrest-mid::d5-market-b::d5-market-b-skip::8",
      packageId: "c-unrest-mid",
      day: 8,
      title: "Unrest",
      description: "A crowd is here.",
      choices: eventPackageById("c-unrest-mid")!.choices,
      source: "local" as const,
      isConsequence: true,
      originEventId: "d5-market-b",
      originChoiceId: "d5-market-b-skip",
    };
    const context = buildNarrativeContext(state, event);
    expect(context.origin?.choiceId).toBe("d5-market-b-skip");
    expect(context.origin?.day).toBe(6);
    expect(context.origin?.choiceLabel.toLowerCase()).toContain("alchemists");
  });
});
