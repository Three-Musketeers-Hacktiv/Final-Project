"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { GameView, RunResponse, SubmitActionRequest, SubmitActionResponse } from "@/contracts/api";
import { ApiError, apiRequest } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessages";
import { describeAction, type TimelineEntry } from "@/lib/timeline";

type ActionType = SubmitActionRequest["type"];
type PayloadOf<T extends ActionType> = Extract<SubmitActionRequest, { type: T }>["payload"];

type GameContextValue = {
  runId: string;
  /** The last GameView the server sent: the only source of game numbers on the client. */
  game: GameView;
  /** True while an action request is in flight; every game button is disabled meanwhile. */
  pending: boolean;
  /** Player-facing message for the last failed action, if any. */
  error: string | null;
  dismissError: () => void;
  /** What happened this session, newest first. The API has no history endpoint yet. */
  timeline: TimelineEntry[];
  /** Sends one gameplay action. Resolves true when the server applied it. */
  act: <T extends ActionType>(type: T, payload: PayloadOf<T>) => Promise<boolean>;
};

const GameContext = createContext<GameContextValue | null>(null);

const NETWORK_RETRIES = 2;

type GameProviderProps = {
  runId: string;
  initialGame: GameView;
  children: ReactNode;
};

/**
 * Holds the current run on /play. Loaded on the server, then replaced by every API response:
 * the client never computes game state itself (app/docs/API_CONTRACT.md §9).
 */
export default function GameProvider({ runId, initialGame, children }: GameProviderProps) {
  const router = useRouter();
  const [game, setGame] = useState(initialGame);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  // Refs so act() always sees the latest state, and a double click can't start a second request.
  const gameRef = useRef(initialGame);
  const busyRef = useRef(false);

  const applyGame = useCallback((next: GameView) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  const reload = useCallback(async () => {
    const run = await apiRequest<RunResponse>(`/api/runs/${runId}`);
    applyGame(run.game);
  }, [runId, applyGame]);

  const act = useCallback(
    async <T extends ActionType>(type: T, payload: PayloadOf<T>) => {
      if (busyRef.current) return false;
      busyRef.current = true;
      setPending(true);
      setError(null);

      const before = gameRef.current;
      // One actionId per click; retries after a network error resend the identical request.
      const request = {
        actionId: crypto.randomUUID(),
        expectedRevision: before.state.revision,
        type,
        payload,
      } as SubmitActionRequest;

      try {
        for (let attempt = 0; ; attempt++) {
          try {
            const result = await apiRequest<SubmitActionResponse>(`/api/runs/${runId}/actions`, {
              method: "POST",
              body: request,
            });
            applyGame(result.game);
            setTimeline((entries) => [...describeAction(request, before, result.game).reverse(), ...entries]);
            return true;
          } catch (err) {
            if (err instanceof ApiError && err.code === "NETWORK_ERROR" && attempt < NETWORK_RETRIES) continue;
            throw err;
          }
        }
      } catch (err) {
        const code = err instanceof ApiError ? err.code : "INTERNAL_ERROR";
        if (code === "UNAUTHENTICATED") {
          router.replace("/login");
        } else if (code === "DUPLICATE_ACTION" || code === "STALE_REVISION") {
          // Our earlier attempt landed, or another tab moved the game on: take the server's state.
          await reload().catch(() => setError(errorMessage("NETWORK_ERROR")));
          if (code === "STALE_REVISION") setError(errorMessage(code));
        } else {
          setError(errorMessage(code));
        }
        return false;
      } finally {
        busyRef.current = false;
        setPending(false);
      }
    },
    [runId, router, applyGame, reload],
  );

  const dismissError = useCallback(() => setError(null), []);

  return (
    <GameContext value={{ runId, game, pending, error, dismissError, timeline, act }}>{children}</GameContext>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used inside <GameProvider>");
  return context;
}
