"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CreateRunRequest, CreateRunResponse } from "@/contracts/api";
import { ApiError, apiRequest } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessages";
import GameButton from "./GameButton";
import Modal from "./Modal";

const REPLACE_SAVE_DIALOG = "replace-save";

type NewGameButtonProps = {
  /** Day of the current save, or null when the player has none. */
  saveDay: number | null;
};

/**
 * Starts a run with POST /api/runs. With a save, it asks before replacing it.
 * Each intent (start / replace) gets one `startRequestId`, reused if the player retries after an error.
 */
export default function NewGameButton({ saveDay }: NewGameButtonProps) {
  const router = useRouter();
  const startRequestIds = useRef<Partial<Record<"start" | "replace", string>>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(saveDay !== null);

  async function startRun(replaceActiveSave: boolean) {
    const intent = replaceActiveSave ? "replace" : "start";
    startRequestIds.current[intent] ??= crypto.randomUUID();

    setPending(true);
    setError(null);
    try {
      await apiRequest<CreateRunResponse>("/api/runs", {
        method: "POST",
        body: { startRequestId: startRequestIds.current[intent], replaceActiveSave } satisfies CreateRunRequest,
      });
      router.push("/play");
      // Also from /play itself (end screen): load the new run on the server.
      router.refresh();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "INTERNAL_ERROR";
      if (code === "ACTIVE_SAVE_EXISTS") {
        // A save appeared since the menu loaded (e.g. another tab): ask first.
        setNeedsConfirm(true);
        document.getElementById(REPLACE_SAVE_DIALOG)?.showPopover();
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
      <GameButton
        variant={needsConfirm ? "secondary" : "primary"}
        popoverTarget={needsConfirm ? REPLACE_SAVE_DIALOG : undefined}
        onClick={needsConfirm ? undefined : () => startRun(false)}
        disabled={pending}
      >
        {pending && !needsConfirm ? "Starting…" : "New Game"}
      </GameButton>
      {error && !needsConfirm && (
        <p role="alert" className="text-sm text-crimson day:text-red-700">
          {error}
        </p>
      )}

      <Modal id={REPLACE_SAVE_DIALOG} title="Start a New Game?" size="sm" accent>
        <p>
          {saveDay !== null ? (
            <>
              Your saved run on <strong>Day {saveDay}</strong> will be replaced.
            </>
          ) : (
            "Your saved run will be replaced."
          )}{" "}
          You won&apos;t be able to continue it.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-crimson day:text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <GameButton popoverTarget={REPLACE_SAVE_DIALOG} popoverTargetAction="hide" disabled={pending}>
            Cancel
          </GameButton>
          <GameButton variant="danger" onClick={() => startRun(true)} disabled={pending}>
            {pending ? "Starting…" : "Replace Save"}
          </GameButton>
        </div>
      </Modal>
    </>
  );
}
