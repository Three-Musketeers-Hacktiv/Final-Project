import {
  endPreparationDay,
  upgradeCity,
  upgradeTroops,
  upgradeWall,
  type ActionResult,
  type GameState,
} from "../game/index";

export const AUTO_INTERVAL_MS = 5000;

export type AutoPauseReason =
  | "event"
  | "battle"
  | "report"
  | "reward"
  | "ended"
  | "hidden"
  | "rejected";

export type AutoSnapshot = {
  mode: "manual" | "auto";
  running: boolean;
  pauseReason: AutoPauseReason | null;
  remainingMs: number;
  actionStillAvailable: boolean;
  autoUpgrade: boolean;
};

type Clock = {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
};

const browserClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number,
  clearTimeout: (id) => globalThis.clearTimeout(id),
};

export function pauseReasonFor(state: GameState): AutoPauseReason | null {
  if (state.phase === "event" || state.activeEvent) return "event";
  if (state.phase === "battleReady") return "battle";
  if (state.phase === "battleReport") return "report";
  if (state.phase === "reward") return "reward";
  if (state.phase === "gameOver" || state.phase === "victory") return "ended";
  if (state.phase !== "preparation") return "ended";
  return null;
}

export function createAutoRun(options: {
  getState: () => GameState;
  applyAdvance: () => ActionResult;
  applyUpgrade?: () => ActionResult;
  onChange: () => void;
  isHidden?: () => boolean;
  clock?: Clock;
}) {
  const clock = options.clock ?? browserClock;
  const isHidden = options.isHidden ?? (() => false);
  let mode: AutoSnapshot["mode"] = "manual";
  let autoUpgrade = false;
  let running = false;
  let pauseReason: AutoPauseReason | null = null;
  let deadline = 0;
  let timer: number | null = null;
  let generation = 0;

  function clearTimer(): void {
    if (timer != null) clock.clearTimeout(timer);
    timer = null;
    generation += 1;
  }

  function snapshot(): AutoSnapshot {
    const state = options.getState();
    return {
      mode,
      running,
      pauseReason,
      remainingMs: running ? Math.max(0, deadline - clock.now()) : 0,
      actionStillAvailable: running && state.phase === "preparation" && !state.actionUsedToday,
      autoUpgrade,
    };
  }

  function spendUpgradeIfEnabled(): void {
    if (!autoUpgrade || !options.applyUpgrade) return;
    const state = options.getState();
    if (state.phase !== "preparation" || state.actionUsedToday) return;
    options.applyUpgrade();
  }

  function pause(reason: AutoPauseReason): void {
    clearTimer();
    running = false;
    pauseReason = reason;
    deadline = 0;
    options.onChange();
  }

  function schedule(): void {
    const state = options.getState();
    const blocked = isHidden() ? "hidden" : pauseReasonFor(state);
    if (blocked) {
      pause(blocked);
      return;
    }
    clearTimer();
    const token = generation;
    const runId = state.runId;
    running = true;
    pauseReason = null;
    spendUpgradeIfEnabled();
    deadline = clock.now() + AUTO_INTERVAL_MS;
    timer = clock.setTimeout(() => tick(token, runId), AUTO_INTERVAL_MS);
    options.onChange();
  }

  function tick(token: number, runId: string): void {
    if (token !== generation) return;
    timer = null;
    const state = options.getState();
    if (state.runId !== runId) {
      running = false;
      deadline = 0;
      options.onChange();
      return;
    }
    if (mode !== "auto") return;
    if (isHidden()) {
      pause("hidden");
      return;
    }
    const blocked = pauseReasonFor(state);
    if (blocked) {
      pause(blocked);
      return;
    }
    const result = options.applyAdvance();
    if (!result.ok) {
      pause("rejected");
      return;
    }
    const nextBlock = isHidden() ? "hidden" : pauseReasonFor(options.getState());
    if (mode !== "auto") return;
    if (nextBlock) {
      pause(nextBlock);
      return;
    }
    schedule();
  }

  return {
    snapshot,
    enable() {
      mode = "auto";
      schedule();
    },
    setAutoUpgrade(enabled: boolean) {
      if (mode !== "auto") return;
      autoUpgrade = enabled;
      if (enabled) spendUpgradeIfEnabled();
      options.onChange();
    },
    resume() {
      if (mode !== "auto") return;
      schedule();
    },
    toManual() {
      mode = "manual";
      autoUpgrade = false;
      running = false;
      pauseReason = null;
      deadline = 0;
      clearTimer();
      options.onChange();
    },
    afterUserAction(previous: GameState) {
      if (mode !== "auto") return;
      const state = options.getState();
      const blocked = isHidden() ? "hidden" : pauseReasonFor(state);
      if (blocked) {
        pause(blocked);
        return;
      }
      if (running && (previous.day !== state.day || previous.phase !== state.phase)) schedule();
    },
    onHidden() {
      if (mode === "auto" && running) pause("hidden");
    },
  };
}

/** Shared with the manual Lanjut hari button. */
export function advanceDay(state: GameState): ActionResult {
  return endPreparationDay(state);
}

/** One economic spend: troops, then wall, then city. Failures do not consume the slot. */
export function applyPreferredUpgrade(state: GameState): ActionResult {
  const attempts = [upgradeTroops, upgradeWall, upgradeCity];
  let last = attempts[0](state);
  for (const attempt of attempts) {
    const result = attempt(state);
    if (result.ok) return result;
    last = result;
    if (result.error.code !== "INSUFFICIENT_GOLD" && result.error.code !== "MAX_UPGRADE") return result;
  }
  return last;
}
