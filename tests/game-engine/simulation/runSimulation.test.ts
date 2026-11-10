import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createInitialState, type Difficulty } from "../../../src/game/index";
import { play, type PlayLog } from "../helpers/campaignPlayer";
import { scoredEventChoice } from "../helpers/policies";
import { SIM_DIFFICULTIES, SIM_STRATEGIES } from "./strategies";
import { SIM_RUNS } from "../fixtures/runIds";

const STRATEGIES = SIM_STRATEGIES;

export type SimulationRow = {
  runId: string;
  difficulty: Difficulty;
  strategy: (typeof STRATEGIES)[number]["id"];
  phase: PlayLog["state"]["phase"];
  day: number;
  wavesCleared: number;
  gold: number;
  cityHp: number;
  wallLevel: number;
  troopLevel: number;
  cityLevel: number;
  eventChoices: string[];
  rewardChoices: string[];
};

function runOne(runId: string, difficulty: Difficulty, strategy: (typeof STRATEGIES)[number]): SimulationRow {
  const done = play(createInitialState({ runId, difficulty }), {
    spend: strategy.spend,
    eventChoice: scoredEventChoice,
  });
  return {
    runId,
    difficulty,
    strategy: strategy.id,
    phase: done.state.phase,
    day: done.state.day,
    wavesCleared: done.state.wavesCleared,
    gold: done.state.gold,
    cityHp: done.state.cityHp,
    wallLevel: done.state.wallLevel,
    troopLevel: done.state.troopLevel,
    cityLevel: done.state.cityLevel,
    eventChoices: done.events.map((entry) => `${entry.day}:${entry.choiceId}`),
    rewardChoices: done.rewards.map((entry) => `${entry.wave}:${entry.rewardId}`),
  };
}

export function runSample(): SimulationRow[] {
  const rows: SimulationRow[] = [];
  for (const difficulty of SIM_DIFFICULTIES) {
    for (const strategy of STRATEGIES) {
      for (const runId of SIM_RUNS) {
        rows.push(runOne(runId, difficulty, strategy));
      }
    }
  }
  return rows;
}

describe("simulasi strategi", () => {
  it("SIM-01 tiga runId dan lima strategi selesai, dan ulangan memberi hasil yang sama", () => {
    const rows = runSample();
    expect(rows).toHaveLength(SIM_DIFFICULTIES.length * STRATEGIES.length * SIM_RUNS.length);
    for (const row of rows) {
      expect(["victory", "gameOver"]).toContain(row.phase);
    }

    const again = runOne(SIM_RUNS[0], "normal", STRATEGIES[0]);
    expect(again).toEqual(rows.find((row) => row.runId === SIM_RUNS[0] && row.difficulty === "normal" && row.strategy === "attack"));

    const reportDir = join(dirname(fileURLToPath(import.meta.url)), "..", "reports");
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(join(reportDir, "simulation-2026-11-10.json"), `${JSON.stringify(rows, null, 2)}\n`);
  });
});
