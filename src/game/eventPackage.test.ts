import { describe, expect, it } from "vitest";

import {
  chooseEventOption,
  chooseReward,
  continueFromReport,
  createInitialState,
  endPreparationDay,
  installCommittedPackage,
  repairCity,
  rewardsForWave,
  scaleEventGoldCost,
  startBattle,
  upgradeTroops,
  upgradeWall,
  validateEventPackage,
} from "./index";
import type { EventPackage, GameState } from "./types";

function openFirstEvent(state: GameState): GameState {
  let current = state;
  for (let step = 0; step < 30 && current.phase !== "event"; step += 1) {
    if (current.phase === "preparation") {
      const ended = endPreparationDay(current);
      if (!ended.ok) throw new Error(ended.error.message);
      current = ended.state;
      continue;
    }
    break;
  }
  if (!current.activeEvent) throw new Error("expected an event");
  return current;
}

function dynamicPackage(state: GameState, goldCost = 25): EventPackage {
  const event = state.activeEvent!;
  const decade = Math.max(1, Math.ceil(state.day / 10));
  const wave = Math.min(state.wavesCleared + 1, 10);
  return {
    packageId: `ai:${event.eventId}`,
    eventId: "draft-ignored",
    decade,
    title: "Riders at the east gate",
    description: "The watch captain is waiting for an order.",
    choices: [
      {
        id: "pay-watch",
        label: "Hire the night watch",
        goldCost,
        effects: [{ type: "grantGold", amount: 40 }],
        consequence: {
          packageId: `ai:cons:${event.eventId}:pay-watch`,
          minDelayDays: 1,
          maxDelayDays: 2,
          targetWave: wave,
          fallbackPackage: {
            packageId: `ai:cons:${event.eventId}:pay-watch`,
            eventId: `ai:cons:${event.eventId}:pay-watch`,
            decade,
            title: "The watch returns at dusk",
            description: "They kept the gate and now ask what comes next.",
            choices: [
              { id: "release", label: "Release the watch", goldCost: 0, effects: [{ type: "grantGold", amount: 3 }] },
              { id: "keep", label: "Keep them another night", goldCost: 10, effects: [] },
            ],
          },
        },
      },
      { id: "dismiss", label: "Send the riders away", goldCost: 0, effects: [] },
    ],
  };
}

describe("dynamic event packages", () => {
  it("accepts a package outside the local catalog and applies its base cost once", () => {
    const opened = openFirstEvent(createInitialState({ runId: "dynamic-cost", difficulty: "hard" }));
    const before = JSON.stringify(opened);
    const installed = installCommittedPackage(opened, dynamicPackage(opened, 100), "ai");
    expect(installed.ok).toBe(true);
    if (!installed.ok) return;
    expect(installed.state.revision).toBe(opened.revision);
    expect(installed.state.activeEvent?.packageId.startsWith("ai:")).toBe(true);
    expect(installed.state.activeEvent?.choices.find((choice) => choice.id === "pay-watch")?.goldCost).toBe(
      scaleEventGoldCost(100, "hard"),
    );
    const paid = chooseEventOption(installed.state, "pay-watch");
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.state.gold).toBe(installed.state.gold - scaleEventGoldCost(100, "hard") + 40);
    expect(paid.state.pendingConsequences).toHaveLength(1);
    expect(JSON.parse(before).gold).toBe(opened.gold);
  });

  it("rejects an invalid package without mutating state", () => {
    const opened = openFirstEvent(createInitialState({ runId: "dynamic-invalid" }));
    const broken = dynamicPackage(opened);
    broken.choices = broken.choices.map((choice) => ({ ...choice, goldCost: 10 }));
    const rejected = installCommittedPackage(opened, broken, "ai");
    expect(rejected.ok).toBe(false);
    expect(opened.activeEvent?.packageId.startsWith("ai:") ?? false).toBe(false);
    expect(validateEventPackage(broken, {
      day: opened.day,
      wavesCleared: opened.wavesCleared,
      allowConsequence: true,
      checkDominance: true,
      enforceWaveTiming: true,
    }).ok).toBe(false);
  });

  it("runs a stored consequence after the provider is gone", () => {
    let state = openFirstEvent(createInitialState({ runId: "dynamic-consequence" }));
    const installed = installCommittedPackage(state, dynamicPackage(state, 10), "ai");
    if (!installed.ok) throw new Error("install failed");
    const chosen = chooseEventOption(installed.state, "pay-watch");
    if (!chosen.ok) throw new Error(chosen.error.message);
    state = chosen.state;
    for (let step = 0; step < 12 && !state.activeEvent?.isConsequence; step += 1) {
      if (state.phase === "event" && state.activeEvent) {
        const free = state.activeEvent.choices.find((choice) => choice.goldCost === 0);
        const next = chooseEventOption(state, free?.id ?? state.activeEvent.choices[0]!.id);
        if (!next.ok) throw new Error(next.error.message);
        state = next.state;
        continue;
      }
      if (state.phase === "preparation") {
        const ended = endPreparationDay(state);
        if (!ended.ok) throw new Error(ended.error.message);
        state = ended.state;
      }
    }
    expect(state.activeEvent?.isConsequence).toBe(true);
    expect(state.activeEvent?.source).toBe("local");
    const resolved = chooseEventOption(state, "release");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.state.gold).toBe(state.gold + 3);
    expect(resolved.state.pendingConsequences.some((entry) => entry.id === state.activeEvent?.eventId)).toBe(false);
  });

  it("plays a campaign with installed packages and local fallback choices", () => {
    let state = createInitialState({ runId: "dynamic-campaign", difficulty: "normal" });
    let installedPackages = 0;
    for (let step = 0; step < 900 && state.phase !== "victory" && state.phase !== "gameOver"; step += 1) {
      if (state.phase === "event" && state.activeEvent) {
        if (!state.activeEvent.isConsequence && state.activeEvent.source === "local") {
          const installed = installCommittedPackage(state, dynamicPackage(state, 5), "ai");
          if (!installed.ok) throw new Error(installed.error.message);
          state = installed.state;
          installedPackages += 1;
        }
        const free = state.activeEvent?.choices.find((choice) => choice.goldCost === 0);
        const chosen = chooseEventOption(state, free?.id ?? "dismiss");
        if (!chosen.ok) throw new Error(chosen.error.message);
        state = chosen.state;
        continue;
      }
      if (state.phase === "preparation") {
        if (!state.actionUsedToday && state.cityHp < state.cityMaxHp * 0.7) {
          const repaired = repairCity(state);
          if (repaired.ok) {
            state = repaired.state;
            continue;
          }
        }
        if (!state.actionUsedToday) {
          const upgraded = upgradeTroops(state).ok ? upgradeTroops(state) : upgradeWall(state);
          if (upgraded.ok) {
            state = upgraded.state;
            continue;
          }
        }
        const ended = endPreparationDay(state);
        if (!ended.ok) throw new Error(ended.error.message);
        state = ended.state;
        continue;
      }
      if (state.phase === "battleReady") {
        const battle = startBattle(state);
        if (!battle.ok) throw new Error(battle.error.message);
        state = battle.state;
        continue;
      }
      if (state.phase === "battleReport") {
        const report = continueFromReport(state);
        if (!report.ok) throw new Error(report.error.message);
        state = report.state;
        continue;
      }
      if (state.phase === "reward") {
        const reward = rewardsForWave(state.wavesCleared)?.options[0];
        if (!reward) throw new Error("missing reward");
        const chosen = chooseReward(state, reward.id);
        if (!chosen.ok) throw new Error(chosen.error.message);
        state = chosen.state;
      }
    }
    expect(installedPackages).toBeGreaterThan(0);
    expect(state.phase === "victory" || state.phase === "gameOver").toBe(true);
    expect(JSON.parse(JSON.stringify(state)).runId).toBe(state.runId);
  });
});
