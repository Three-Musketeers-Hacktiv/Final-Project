import { rewardsForWave } from "../../../src/game";
import { readEffectiveStats, readWavePreview } from "@/server/game-engine/adapter";
import type { GameReportDocument, GameRunDocument } from "@/server/game/types";

export function toGameView(run: GameRunDocument, report: GameReportDocument | null = null) {
  return {
    state: run.state,
    stats: readEffectiveStats(run.state),
    wavePreview: readWavePreview(run.state),
    eventNarrative: run.state.activeEvent,
    rewardOptions: run.state.phase === "reward"
      ? [...(rewardsForWave(run.state.wavesCleared)?.options ?? [])]
      : [],
    timeline: run.timeline ?? [],
    report: report
      ? {
          id: report._id.toHexString(),
          runId: report.gameRunId.toHexString(),
          wave: report.wave,
          day: report.day,
          sourceRevision: report.sourceRevision,
          battleResult: report.battleResult,
          createdAt: report.createdAt.toISOString(),
        }
      : null,
  };
}
