import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { AuthResponse, RunResponse } from "@/contracts/api";
import GameProvider from "@/components/GameProvider";
import GameScreen from "@/components/GameScreen";
import { ApiError } from "@/lib/api";
import { isUnloadableSave } from "@/lib/errorMessages";
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

/** Loads the player's current run (and who they are, for the City Record) and hands it to the game. */
async function LoadedGame() {
  let run: RunResponse;
  let me: AuthResponse;
  try {
    [run, me] = await Promise.all([
      serverApiRequest<RunResponse>("/api/runs/current"),
      serverApiRequest<AuthResponse>("/api/auth/me"),
    ]);
  } catch (error) {
    // proxy.ts only checks the cookie exists; an expired session lands here as 401.
    if (error instanceof ApiError && error.code === "UNAUTHENTICATED") redirect("/login");
    // No save, or one the server can't load: the home screen explains it and offers a new game.
    if (error instanceof ApiError && (error.code === "NO_ACTIVE_SAVE" || isUnloadableSave(error.code))) redirect("/");
    throw error;
  }

  return (
    // Keyed by run: starting a new game from the end screen must not keep the old run's state.
    <GameProvider key={run.runId} runId={run.runId} initialGame={run.game}>
      <GameScreen lord={me.user.username} />
    </GameProvider>
  );
}
