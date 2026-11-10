"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import GameButton from "./GameButton";
import { useGame } from "./GameProvider";
import LogoutButton from "./LogoutButton";
import Modal from "./Modal";
import RunSummary from "./RunSummary";

export const SETTINGS_DIALOG = "settings";

type SettingsDialogProps = {
  /** Called whenever the dialog closes; `resume` is true when the player pressed Resume. */
  onClose: (resume: boolean) => void;
};

/** In-game menu behind the ⚙ button: run overview, Resume, Main Menu, Surrender and Log Out. */
export default function SettingsDialog({ onClose }: SettingsDialogProps) {
  const router = useRouter();
  const { game, pending, act } = useGame();
  const { state } = game;
  const ended = state.phase === "gameOver" || state.phase === "victory";
  const resumeRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [confirmingSurrender, setConfirmingSurrender] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Esc, a click outside and × close it too, so listen for every close, not just the buttons.
  useEffect(() => {
    const dialog = document.getElementById(SETTINGS_DIALOG);
    if (!dialog) return;
    const handleToggle = (event: Event) => {
      if ((event as ToggleEvent).newState !== "closed") return;
      onCloseRef.current(resumeRef.current);
      resumeRef.current = false;
      setConfirmingSurrender(false);
    };
    dialog.addEventListener("toggle", handleToggle);
    return () => dialog.removeEventListener("toggle", handleToggle);
  }, []);

  function resume() {
    resumeRef.current = true;
    document.getElementById(SETTINGS_DIALOG)?.hidePopover();
  }

  // The run is saved after every action, so leaving keeps it; Continue on the menu picks it up again.
  // Close the dialog first: Next.js keeps /play alive in the background, and an open dialog would stay
  // on screen over the menu (and still be open on returning).
  function mainMenu() {
    document.getElementById(SETTINGS_DIALOG)?.hidePopover();
    router.push("/");
    router.refresh();
  }

  // The run ends as game over and the end screen takes over; a failure shows in the game toast.
  async function surrender() {
    if (await act("surrender", {})) document.getElementById(SETTINGS_DIALOG)?.hidePopover();
  }

  return (
    <Modal id={SETTINGS_DIALOG} title="Settings" subtitle="Game paused" size="sm">
      <div className="flex flex-col gap-3">
        <RunSummary label="This run" day={state.day} cityHp={state.cityHp} cityMaxHp={state.cityMaxHp} gold={state.gold} difficulty={state.difficulty} />

        <GameButton variant="primary" onClick={resume}>
          Resume
        </GameButton>

        <GameButton onClick={mainMenu}>Main Menu</GameButton>

        {!confirmingSurrender && (
          <GameButton variant="danger" disabled={ended} onClick={() => setConfirmingSurrender(true)}>
            Surrender
          </GameButton>
        )}
        {confirmingSurrender && (
          <div className="rounded-sm border-2 border-crimson/70 p-3">
            <p>Give up this run? Your city will fall and the run ends.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <GameButton disabled={pending} onClick={() => setConfirmingSurrender(false)}>
                Cancel
              </GameButton>
              <GameButton variant="danger" disabled={pending} onClick={surrender}>
                {pending ? "Surrendering…" : "Surrender"}
              </GameButton>
            </div>
          </div>
        )}

        {/* Kept apart so it isn't pressed by accident. */}
        <div className="mt-6 flex flex-col border-t-2 border-frame/40 pt-4">
          <LogoutButton />
        </div>
      </div>
    </Modal>
  );
}
