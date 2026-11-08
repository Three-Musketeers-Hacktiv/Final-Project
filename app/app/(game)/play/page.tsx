import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { RunResponse } from "@/contracts/api";
import GameProvider from "@/components/GameProvider";
import GameScreen from "@/components/GameScreen";
import { ApiError } from "@/lib/api";
import { serverApiRequest } from "@/lib/serverApi";

export const metadata: Metadata = {
  title: "Play",
};

export default function PlayPage() {
  return (
    <Suspense fallback={<p className="m-auto p-8 text-xl text-muted">Loading your city…</p>}>
      <LoadedGame />
    </Suspense>
  );
}

/** Loads the player's current run and hands it to the client-side game. */
async function LoadedGame() {
  let run: RunResponse;
  try {
    run = await serverApiRequest<RunResponse>("/api/runs/current");
  } catch (error) {
    // proxy.ts only checks the cookie exists; an expired session lands here as 401.
    if (error instanceof ApiError && error.code === "UNAUTHENTICATED") redirect("/login");
    if (error instanceof ApiError && error.code === "NO_ACTIVE_SAVE") redirect("/");
    throw error;
  }

  return (
    // Keyed by run: starting a new game from the end screen must not keep the old run's state.
    <GameProvider key={run.runId} runId={run.runId} initialGame={run.game}>
      <GameScreen />
    </GameProvider>
  );
}
