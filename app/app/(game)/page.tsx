import type { Metadata } from "next";
import { Suspense } from "react";
import type { AuthResponse, RunResponse } from "@/contracts/api";
import GameButton from "@/components/GameButton";
import Icon from "@/components/Icon";
import LogoutButton from "@/components/LogoutButton";
import NewGameButton from "@/components/NewGameButton";
import Panel from "@/components/Panel";
import ScreenShell from "@/components/ScreenShell";
import { ApiError } from "@/lib/api";
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
          <p className="text-muted">Defend your city for 20 days against waves of monsters.</p>
          <GameButton href="/login" variant="primary">
            Play
          </GameButton>
        </div>
      </Panel>
    );
  }

  const save = me.user.hasActiveSave ? await loadOrNull<RunResponse>("/api/runs/current", "NO_ACTIVE_SAVE") : null;
  const state = save?.game.state;

  return (
    <Panel title={`Welcome, ${me.user.username}`}>
      <div className="flex flex-col gap-3">
        {state && (
          <>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-sm border-2 border-frame/60 bg-ink/40 px-3 py-2">
              <span className="font-semibold">Saved run</span>
              <span className="text-muted">Day {state.day}</span>
              <span className="flex items-center gap-1.5">
                <Icon name="cityHp" className="size-5" />
                {state.cityHp} / {state.cityMaxHp}
              </span>
              <span className="flex items-center gap-1.5 text-gold">
                <Icon name="gold" className="size-5" />
                {state.gold}
              </span>
            </div>
            <GameButton href="/play" variant="primary">
              Continue
            </GameButton>
          </>
        )}

        <NewGameButton saveDay={state?.day ?? null} />
        <LogoutButton />
      </div>
    </Panel>
  );
}
