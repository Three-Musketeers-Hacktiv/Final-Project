"use client";

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

/** In-game menu behind the ⚙ button: run overview, Resume, Surrender and Log Out. */
export default function SettingsDialog({ onClose }: SettingsDialogProps) {
  const { game } = useGame();
  const { state } = game;
  const resumeRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [surrenderStep, setSurrenderStep] = useState<"idle" | "confirm" | "unavailable">("idle");

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
      setSurrenderStep("idle");
    };
    dialog.addEventListener("toggle", handleToggle);
    return () => dialog.removeEventListener("toggle", handleToggle);
  }, []);

  function resume() {
    resumeRef.current = true;
    document.getElementById(SETTINGS_DIALOG)?.hidePopover();
  }

  return (
    <Modal id={SETTINGS_DIALOG} title="Settings" subtitle="Game paused" size="sm">
      <div className="flex flex-col gap-3">
        <RunSummary label="This run" day={state.day} cityHp={state.cityHp} cityMaxHp={state.cityMaxHp} gold={state.gold} />

        <GameButton variant="primary" onClick={resume}>
          Resume
        </GameButton>

        {surrenderStep === "idle" && (
          <GameButton variant="danger" onClick={() => setSurrenderStep("confirm")}>
            Surrender
          </GameButton>
        )}
        {surrenderStep === "confirm" && (
          <div className="rounded-sm border-2 border-crimson/70 p-3">
            <p>Give up this run? Your city will fall and the run ends.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <GameButton onClick={() => setSurrenderStep("idle")}>Cancel</GameButton>
              {/* TODO: send the surrender action once the backend has one (API_CONTRACT.md has none yet). */}
              <GameButton variant="danger" onClick={() => setSurrenderStep("unavailable")}>
                Surrender
              </GameButton>
            </div>
          </div>
        )}
        {surrenderStep === "unavailable" && (
          <p role="alert" className="rounded-sm border-2 border-crimson/70 px-3 py-2 text-sm">
            Surrendering isn&apos;t available yet. The server has no surrender action.
          </p>
        )}

        {/* Kept apart so it isn't pressed by accident. */}
        <div className="mt-6 flex flex-col border-t-2 border-frame/40 pt-4">
          <LogoutButton />
        </div>
      </div>
    </Modal>
  );
}
