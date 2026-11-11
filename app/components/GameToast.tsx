"use client";

import { useEffect, useRef } from "react";
import { useGame } from "./GameProvider";

const VISIBLE_MS = 4000;

/** Shows why the last action was refused (e.g. "Not enough gold."), then fades out on its own. */
export default function GameToast() {
  const { error, dismissError } = useGame();
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!error) return;
    // A popover joins the top layer, so the toast also shows above an open phase dialog.
    const toast = toastRef.current;
    toast?.showPopover();
    const timer = setTimeout(dismissError, VISIBLE_MS);
    return () => {
      clearTimeout(timer);
      if (toast?.matches(":popover-open")) toast.hidePopover();
    };
  }, [error, dismissError]);

  if (!error) return null;

  return (
    <div
      ref={toastRef}
      popover="manual"
      role="alert"
      className="inset-auto bottom-16 left-1/2 m-0 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-sm border-2 border-crimson bg-panel px-4 py-2 text-parchment shadow-lg"
    >
      <span>{error}</span>
      <button type="button" onClick={dismissError} aria-label="Dismiss" className="text-xl leading-none text-muted hover:text-parchment">
        ×
      </button>
    </div>
  );
}
