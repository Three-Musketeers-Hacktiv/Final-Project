import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInitialState, gameConfig } from "../../../src/game/index.mjs";
import { play } from "../helpers/campaignPlayer.mjs";
import { scoredEventChoice } from "../helpers/policies.mjs";
export const PAIR_RUNS = ["sim-pair-1", "sim-pair-2", "sim-pair-3", "sim-pair-4", "sim-pair-5", "sim-pair-6"];
export const PAIR_STRATEGIES = [
    { id: "attack", spend: "troops" },
    { id: "defense", spend: "wall" },
    { id: "economy", spend: "city" },
    { id: "balanced", spend: "balanced" },
];
const DIFFICULTIES = ["normal", "hard"];
function lossOf(done) {
    if (done.state.phase !== "gameOver")
        return null;
    const battle = done.state.battleResult;
    if (battle && !battle.won)
        return `kalah battle wave ${battle.wave} hari ${battle.day}`;
    if (done.state.cityHp <= 0)
        return `HP 0 pada hari ${done.state.day} sebelum battle selesai`;
    return `gameOver hari ${done.state.day}`;
}
export function playPaired(runId, difficulty, strategy, repair) {
    const done = play(createInitialState({ runId, difficulty }), {
        spend: strategy.spend,
        repair: strategy.spend === "skip" ? "off" : repair,
        eventChoice: scoredEventChoice,
        rewardPolicy: "standard",
    });
    return {
        runId,
        difficulty,
        strategy: strategy.id,
        repair: strategy.spend === "skip" ? "off" : repair,
        phase: done.state.phase,
        day: done.state.day,
        wavesCleared: done.state.wavesCleared,
        cityHp: done.state.cityHp,
        cityMaxHp: done.state.cityMaxHp,
        gold: done.state.gold,
        wallLevel: done.state.wallLevel,
        troopLevel: done.state.troopLevel,
        cityLevel: done.state.cityLevel,
        repairs: done.repairs,
        repairGold: done.repairGold,
        rewards: done.rewards.map((entry) => `${entry.wave}:${entry.rewardId}`),
        preBattle: done.preBattle,
        loss: lossOf(done),
    };
}
export function runPairedSample() {
    const rows = [];
    for (const difficulty of DIFFICULTIES) {
        for (const runId of PAIR_RUNS) {
            for (const strategy of PAIR_STRATEGIES) {
                rows.push(playPaired(runId, difficulty, strategy, "off"));
                rows.push(playPaired(runId, difficulty, strategy, "below80"));
            }
            rows.push(playPaired(runId, difficulty, { id: "skip", spend: "skip" }, "off"));
        }
    }
    return rows;
}
export function writePairedReport(rows) {
    const reportDir = join(dirname(fileURLToPath(import.meta.url)), "..", "reports");
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(join(reportDir, "paired-simulation-latest.json"), `${JSON.stringify({ maxTrackLevel: gameConfig.maxTrackLevel, repairRule: "HP di bawah 80% MaxHP didahulukan dari upgrade", rows }, null, 2)}\n`);
}
