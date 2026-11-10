"use client";

import { useEffect } from "react";
import type { ActiveEvent, GamePhase, GameState } from "../../src/game";
import { EVENT_PACKAGES, rewardsForWave } from "../../src/game/config";
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

/**
 * For a consequence event: the earlier choice that caused it, by its trusted engine label, and the day
 * it was made (from the run's event plan; a follow-up of a follow-up has no plan entry, so no day).
 */
function consequenceCause(event: ActiveEvent, state: GameState) {
  if (!event.isConsequence || !event.originChoiceId) return null;
  const choice = EVENT_PACKAGES.flatMap((pkg) => pkg.choices).find((c) => c.id === event.originChoiceId);
  if (!choice) return null;
  const day = state.eventPlan.find((entry) => entry.eventId === event.originEventId)?.day ?? null;
  return { label: choice.label, day };
}

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
            cause={consequenceCause(eventNarrative, state)}
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
            cityHp={state.cityHp}
            cityMaxHp={state.cityMaxHp}
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
      // Each cleared wave (1–9) has its own three rewards in the engine config.
      return (
        <RewardDialog
          wave={state.wavesCleared}
          rewards={rewardsForWave(state.wavesCleared)?.options ?? []}
          pending={pending}
          onChoose={(rewardId) => act("chooseReward", { rewardId })}
        />
      );
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
