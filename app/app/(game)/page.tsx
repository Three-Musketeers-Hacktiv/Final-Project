import type { Metadata } from "next";
import { Suspense } from "react";
import type { AuthResponse, RunResponse } from "@/contracts/api";
import GameButton from "@/components/GameButton";
import LogoutButton from "@/components/LogoutButton";
import NewGameButton from "@/components/NewGameButton";
import Panel from "@/components/Panel";
import RunSummary from "@/components/RunSummary";
import ScreenShell from "@/components/ScreenShell";
import { ApiError } from "@/lib/api";
import { gameConfig } from "../../../src/game/config";
import { errorMessage, isUnloadableSave } from "@/lib/errorMessages";
import { serverApiRequest } from "@/lib/serverApi";

export const metadata: Metadata = {
  title: "Main Menu",
};

export default function MenuPage() {
  return (
    <ScreenShell>
      <Suspense
        fallback={
          <Panel title="Loading…">
            <p className="text-muted">Checking your save…</p>
          </Panel>
        }
      >
        <Menu />
      </Suspense>
    </ScreenShell>
  );
}

/** Loads null instead of throwing when the API answers with one of the `expected` codes. */
async function loadOrNull<T>(path: string, expected: string): Promise<T | null> {
  try {
    return await serverApiRequest<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.code === expected) return null;
    throw error;
  }
}

/** The active save, or the error code when the server can't load it (e.g. made by older game rules). */
async function loadSave(): Promise<RunResponse | { unloadable: string } | null> {
  try {
    return await serverApiRequest<RunResponse>("/api/runs/current");
  } catch (error) {
    if (error instanceof ApiError && error.code === "NO_ACTIVE_SAVE") return null;
    if (error instanceof ApiError && isUnloadableSave(error.code)) return { unloadable: error.code };
    throw error;
  }
}

/**
 * Home screen. Logged out (no session, or an expired one): a Play button that leads to login, which
 * comes back here. Logged in: the main menu, where "Continue" only shows with an active save.
 */
async function Menu() {
  const me = await loadOrNull<AuthResponse>("/api/auth/me", "UNAUTHENTICATED");
  if (!me) {
    return (
      <Panel title="Welcome, Lord">
        <div className="flex flex-col gap-3">
          <p className="text-muted">
            Defend your city for {gameConfig.lastDay} days against {gameConfig.waves.length} waves of monsters.
          </p>
          <GameButton href="/login" variant="primary">
            Play
          </GameButton>
        </div>
      </Panel>
    );
  }

  const save = me.user.hasActiveSave ? await loadSave() : null;
  const state = save && "game" in save ? save.game.state : null;

  return (
    <Panel title={`Welcome, ${me.user.username}`}>
      <div className="flex flex-col gap-3">
        {state && (
          <>
            <RunSummary label="Saved run" day={state.day} cityHp={state.cityHp} cityMaxHp={state.cityMaxHp} gold={state.gold} difficulty={state.difficulty} />
            <GameButton href="/play" variant="primary">
              Continue
            </GameButton>
          </>
        )}

        {/* A save the server can't load: the player can only start over (New Game replaces it). */}
        {save && "unloadable" in save && (
          <p role="alert" className="rounded-sm border-2 border-crimson/70 px-3 py-2">
            {errorMessage(save.unloadable)}
          </p>
        )}

        <NewGameButton saveDay={state?.day ?? null} hasSave={me.user.hasActiveSave} />
        <LogoutButton />
      </div>
    </Panel>
  );
}
