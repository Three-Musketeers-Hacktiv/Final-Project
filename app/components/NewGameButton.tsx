"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import type { CreateRunRequest, CreateRunResponse } from "@/contracts/api";
import type { Difficulty } from "../../src/game";
import { ApiError, apiRequest } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessages";
import GameButton from "./GameButton";
import Modal from "./Modal";

const NEW_GAME_DIALOG = "new-game";

// The engine applies the numbers (src/game/difficulty.ts); this is only how they are described.
const DIFFICULTIES: { id: Difficulty; label: string; description: string }[] = [
  { id: "easy", label: "Easy", description: "Weaker monsters, cheaper upgrades, more gold." },
  { id: "normal", label: "Normal", description: "The siege as intended." },
  { id: "hard", label: "Hard", description: "Stronger monsters, pricier upgrades, less gold." },
];

type NewGameButtonProps = {
  /** Day of the current save, or null when there is none or it can't be loaded. */
  saveDay: number | null;
  /** The account has an active save, even one that can't be loaded (so its day is unknown). */
  hasSave?: boolean;
};

/**
 * Starts a run with POST /api/runs after the player picks a difficulty; with a save, the same dialog
 * warns that it will be replaced. Each request (difficulty × replace) gets one `startRequestId`,
 * reused if the player retries after an error.
 */
export default function NewGameButton({ saveDay, hasSave = false }: NewGameButtonProps) {
  const router = useRouter();
  const startRequestIds = useRef<Record<string, string>>({});
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A save the server reported after this loaded (e.g. from another tab). The saved run itself is read
  // from `saveDay` each render, so a menu restored after the run ended doesn't still warn about it.
  const [saveAppeared, setSaveAppeared] = useState(false);
  const replacesSave = hasSave || saveDay !== null || saveAppeared;

  // Pages are kept when you leave them (cacheComponents): reset so a restored menu isn't stuck on "Starting…".
  useLayoutEffect(
    () => () => {
      setPending(false);
      setError(null);
      setSaveAppeared(false);
    },
    [],
  );

  async function startRun() {
    const key = `${difficulty}:${replacesSave}`;
    startRequestIds.current[key] ??= crypto.randomUUID();

    setPending(true);
    setError(null);
    try {
      await apiRequest<CreateRunResponse>("/api/runs", {
        method: "POST",
        body: {
          startRequestId: startRequestIds.current[key],
          replaceActiveSave: replacesSave,
          difficulty,
        } satisfies CreateRunRequest,
      });
      router.push("/play");
      // Also from /play itself (end screen): load the new run on the server.
      router.refresh();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "INTERNAL_ERROR";
      if (code === "ACTIVE_SAVE_EXISTS") {
        // A save appeared since the menu loaded (e.g. another tab): show the warning, let them confirm.
        setSaveAppeared(true);
      } else if (code === "UNAUTHENTICATED") {
        router.replace("/login");
      } else {
        setError(errorMessage(code));
      }
      setPending(false);
    }
  }

  return (
    <>
      <GameButton variant={replacesSave ? "secondary" : "primary"} popoverTarget={NEW_GAME_DIALOG} disabled={pending}>
        New Game
      </GameButton>

      <Modal id={NEW_GAME_DIALOG} title="Start a New Game" size="sm" accent={replacesSave}>
        {replacesSave && (
          <p className="mb-4 rounded-sm border-2 border-crimson/70 px-3 py-2">
            {saveDay !== null ? (
              <>
                Your saved run on <strong>Day {saveDay}</strong> will be replaced.
              </>
            ) : (
              "Your saved run will be replaced."
            )}{" "}
            You won&apos;t be able to continue it.
          </p>
        )}

        <fieldset disabled={pending}>
          <legend className="mb-2 font-semibold">Difficulty</legend>
          <div className="flex flex-col gap-2">
            {DIFFICULTIES.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-sm border-2 px-3 py-2 transition-colors ${
                  difficulty === option.id ? "border-gold bg-panel-head" : "border-frame/60 hover:border-frame"
                }`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={option.id}
                  checked={difficulty === option.id}
                  onChange={() => setDifficulty(option.id)}
                  className="mt-1.5 accent-gold"
                />
                <span>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="text-sm text-muted">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="mt-3 text-sm text-crimson day:text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <GameButton popoverTarget={NEW_GAME_DIALOG} popoverTargetAction="hide" disabled={pending}>
            Cancel
          </GameButton>
          <GameButton variant={replacesSave ? "danger" : "primary"} onClick={startRun} disabled={pending}>
            {pending ? "Starting…" : replacesSave ? "Replace Save" : "Start"}
          </GameButton>
        </div>
      </Modal>
    </>
  );
}
