"use client";

import { useEffect } from "react";
import type { GamePhase } from "../../src/game";
import { gameConfig } from "../../src/game/config";
import type { RewardOption } from "../../src/game/types";
import { useGame } from "./GameProvider";
import BattleReadyDialog, { BATTLE_READY_DIALOG } from "./phases/BattleReadyDialog";
import BattleReportDialog, { BATTLE_REPORT_DIALOG } from "./phases/BattleReportDialog";
import EndScreen, { GAME_OVER_DIALOG, VICTORY_DIALOG } from "./phases/EndScreen";
import EventDialog, { EVENT_DIALOG } from "./phases/EventDialog";
import RewardDialog, { REWARD_DIALOG } from "./phases/RewardDialog";
import { waveInfo } from "./waveInfo";

const DIALOG_FOR_PHASE: Partial<Record<GamePhase, string>> = {
  event: EVENT_DIALOG,
  battleReady: BATTLE_READY_DIALOG,
  battleReport: BATTLE_REPORT_DIALOG,
  reward: REWARD_DIALOG,
  victory: VICTORY_DIALOG,
  gameOver: GAME_OVER_DIALOG,
};

// The engine's reward labels are Indonesian; ids, kinds and amounts still come from its config.
const REWARD_LABELS: Record<string, string> = {
  "reward-gold": "Royal Aid",
  "reward-income": "Trade Route",
  "reward-discount": "City Logistics",
};

const REWARDS: RewardOption[] = gameConfig.rewards.map((reward) => ({
  ...reward,
  label: REWARD_LABELS[reward.id] ?? reward.label,
}));

/** Opens the screen the current `state.phase` asks for. The player can't close it without answering. */
export default function PhaseDialogs({ hidden = false }: { hidden?: boolean }) {
  const { game, pending, act } = useGame();
  const { state, wavePreview, eventNarrative, report } = game;
  const dialogId = hidden ? undefined : DIALOG_FOR_PHASE[state.phase];

  useEffect(() => {
    const dialog = dialogId ? document.getElementById(dialogId) : null;
    if (dialog && !dialog.matches(":popover-open")) dialog.showPopover();
    return () => {
      if (dialog?.matches(":popover-open")) dialog.hidePopover();
    };
  }, [dialogId]);

  if (hidden) return null;
  switch (state.phase) {
    case "event":
      return (
        eventNarrative && (
          <EventDialog
            event={eventNarrative}
            pending={pending}
            onChoose={(choiceId) => act("chooseEventOption", { choiceId })}
          />
        )
      );
    case "battleReady":
      return (
        wavePreview && (
          <BattleReadyDialog
            wave={{ ...wavePreview, name: waveInfo(wavePreview.wave, wavePreview.name).name }}
            pending={pending}
            onStart={() => act("startBattle", {})}
          />
        )
      );
    case "battleReport":
      return (
        report && (
          <BattleReportDialog
            result={report.battleResult}
            pending={pending}
            onContinue={() => act("continueFromReport", {})}
          />
        )
      );
    case "reward":
      return <RewardDialog rewards={REWARDS} pending={pending} onChoose={(rewardId) => act("chooseReward", { rewardId })} />;
    case "victory":
    case "gameOver":
      return (
        <EndScreen
          outcome={state.phase}
          day={state.day}
          wavesCleared={state.wavesCleared}
          cityHp={state.cityHp}
          cityMaxHp={state.cityMaxHp}
          gold={state.gold}
        />
      );
    default:
      return null;
  }
}
