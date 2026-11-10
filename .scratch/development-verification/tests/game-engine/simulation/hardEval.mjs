import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInitialState } from "../../../src/game/index.mjs";
import { play } from "../helpers/campaignPlayer.mjs";
import { scoredEventChoice } from "../helpers/policies.mjs";
import { PAIR_RUNS } from "./pairedRepair.mjs";
const STRATEGIES = [
    { id: "attack", spend: "troops" },
    { id: "defense", spend: "wall" },
    { id: "economy", spend: "city" },
    { id: "balanced", spend: "balanced" },
    { id: "knownWin", spend: "knownWin" },
];
const REWARD_POLICIES = ["survival", "fortify", "treasury"];
function lossOf(done) {
    if (done.state.phase !== "gameOver")
        return null;
    const battle = done.state.battleResult;
    if (battle && !battle.won)
        return `kalah battle wave ${battle.wave} hari ${battle.day}`;
    if (done.state.cityHp <= 0)
        return `HP 0 pada hari ${done.state.day}`;
    return `gameOver hari ${done.state.day}`;
}
export function runHardEval() {
    const rows = [];
    for (const runId of PAIR_RUNS) {
        for (const strategy of STRATEGIES) {
            for (const rewardPolicy of REWARD_POLICIES) {
                const done = play(createInitialState({ runId, difficulty: "hard" }), {
                    spend: strategy.spend,
                    repair: strategy.spend === "knownWin" ? "off" : "below80",
                    eventChoice: scoredEventChoice,
                    rewardPolicy,
                });
                rows.push({
                    runId,
                    strategy: strategy.id,
                    rewardPolicy,
                    phase: done.state.phase,
                    day: done.state.day,
                    wavesCleared: done.state.wavesCleared,
                    cityHp: done.state.cityHp,
                    gold: done.state.gold,
                    wallLevel: done.state.wallLevel,
                    troopLevel: done.state.troopLevel,
                    cityLevel: done.state.cityLevel,
                    repairs: done.repairs,
                    rewards: done.rewards.map((entry) => `${entry.wave}:${entry.rewardId}`),
                    loss: lossOf(done),
                });
            }
        }
    }
    return rows;
}
export function writeHardReport(rows) {
    const victories = rows.filter((row) => row.phase === "victory");
    const byWave = new Map();
    for (const row of rows) {
        if (row.phase !== "gameOver")
            continue;
        const key = row.loss ?? `hari ${row.day}`;
        byWave.set(key, (byWave.get(key) ?? 0) + 1);
    }
    const reportDir = join(dirname(fileURLToPath(import.meta.url)), "..", "reports");
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(join(reportDir, "hard-eval-latest.json"), `${JSON.stringify({
        sample: "6 runId, 5 strategi, 3 kebijakan reward, difficulty hard",
        victories: victories.length,
        verdict: victories.length === 0
            ? "belum ditemukan jalur menang pada strategi dan sampel yang diuji"
            : `ditemukan ${victories.length} kemenangan pada sampel ini`,
        lossCounts: Object.fromEntries(byWave),
        rows,
    }, null, 2)}\n`);
}
