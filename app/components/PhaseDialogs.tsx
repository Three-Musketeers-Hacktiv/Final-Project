"use client";

import { useEffect, useState } from "react";
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

// What the bar says while the player has hidden the screen they still have to answer.
const PENDING_LABEL: Partial<Record<GamePhase, string>> = {
  event: "An event awaits your decision",
  battleReady: "The wave is at the gates",
  battleReport: "The battle report is waiting",
  reward: "Choose your reward",
  victory: "Victory!",
  gameOver: "Your city has fallen",
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

/**
 * Opens the screen the current `state.phase` asks for. The player can hide it for a look at the game,
 * but can't move on without answering it: the game only acts on preparation days.
 */
export default function PhaseDialogs({ hidden = false }: { hidden?: boolean }) {
  const { game, pending, act } = useGame();
  const { state, wavePreview, eventNarrative, report } = game;
  // Hidden by the player, for this screen only: the next one (a new phase or day) opens as usual.
  const screen = `${state.phase}:${state.day}`;
  const [hiddenScreen, setHiddenScreen] = useState<string | null>(null);
  const playerHid = hiddenScreen === screen;
  const hide = () => setHiddenScreen(screen);
  const dialogId = hidden || playerHid ? undefined : DIALOG_FOR_PHASE[state.phase];

  useEffect(() => {
    const dialog = dialogId ? document.getElementById(dialogId) : null;
    if (dialog && !dialog.matches(":popover-open")) dialog.showPopover();
    return () => {
      if (dialog?.matches(":popover-open")) dialog.hidePopover();
    };
  }, [dialogId]);

  if (hidden) return null;
  if (playerHid) {
    return (
      <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        <div className="flex items-center gap-4 rounded-sm border-2 border-gold bg-panel px-4 py-2 text-parchment shadow-lg">
          <span className="font-semibold">{PENDING_LABEL[state.phase]}</span>
          <button
            type="button"
            onClick={() => setHiddenScreen(null)}
            className="rounded-sm border-2 border-gold bg-gold/85 px-3 py-1 font-bold text-zinc-900 hover:bg-gold"
          >
            Show
          </button>
        </div>
      </div>
    );
  }
  switch (state.phase) {
    case "event":
      return (
        eventNarrative && (
          <EventDialog
            event={eventNarrative}
            cause={consequenceCause(eventNarrative, state)}
            pending={pending}
            onChoose={(choiceId) => act("chooseEventOption", { choiceId })}
            onHide={hide}
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
            onHide={hide}
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
            onHide={hide}
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
          onHide={hide}
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
          onHide={hide}
        />
      );
    default:
      return null;
  }
}
