import { describe, expect, it } from "vitest";
import { createInitialState, gameConfig, type GameState } from "../game/index";
import { AUTO_INTERVAL_MS, advanceDay, applyPreferredUpgrade, createAutoRun } from "./autoRun";

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers: { id: number; at: number; fn: () => void }[] = [];
  return {
    now: () => now,
    setTimeout(fn: () => void, ms: number) {
      const id = nextId++;
      timers.push({ id, at: now + ms, fn });
      return id;
    },
    clearTimeout(id: number) {
      const index = timers.findIndex((timer) => timer.id === id);
      if (index >= 0) timers.splice(index, 1);
    },
    flush(ms: number) {
      now += ms;
      const due = timers.filter((timer) => timer.at <= now).sort((a, b) => a.at - b.at);
      for (const timer of due) {
        const index = timers.indexOf(timer);
        if (index < 0) continue;
        timers.splice(index, 1);
        timer.fn();
      }
    },
  };
}

function harness(options?: { hidden?: boolean; runId?: string }) {
  const clock = fakeClock();
  let state = createInitialState({ runId: options?.runId ?? "run-auto" });
  let hidden = options?.hidden ?? false;
  const auto = createAutoRun({
    getState: () => state,
    applyAdvance: () => {
      const result = advanceDay(state);
      if (result.ok) state = result.state;
      return result;
    },
    applyUpgrade: () => {
      const result = applyPreferredUpgrade(state);
      if (result.ok) state = result.state;
      return result;
    },
    onChange: () => undefined,
    isHidden: () => hidden,
    clock,
  });
  return {
    clock,
    auto,
    get state() {
      return state;
    },
    setState(next: GameState) {
      state = next;
    },
    hide() {
      hidden = true;
    },
  };
}

describe("auto run controller", () => {
  it("does not advance before five seconds and advances once at the boundary", () => {
    const ui = harness();
    const day = ui.state.day;
    ui.auto.enable();
    ui.clock.flush(AUTO_INTERVAL_MS - 1);
    expect(ui.state.day).toBe(day);
    ui.clock.flush(1);
    expect(ui.state.day).toBe(day + 1);
    if (ui.state.phase === "event") {
      expect(ui.auto.snapshot().running).toBe(false);
      expect(ui.auto.snapshot().pauseReason).toBe("event");
    } else {
      expect(ui.auto.snapshot().running).toBe(true);
    }
  });

  it("pauses when the next day is an event and does not resume by itself", () => {
    const ui = harness();
    const eventDay = ui.state.eventPlan.map((entry) => entry.day).sort((a, b) => a - b)[0]!;
    ui.setState({
      ...ui.state,
      day: eventDay - 1,
      phase: "preparation",
      activeEvent: null,
      incomeGrantedDays: Array.from({ length: eventDay - 1 }, (_, i) => i + 1),
    });
    ui.auto.enable();
    ui.clock.flush(AUTO_INTERVAL_MS);
    expect(ui.state.day).toBe(eventDay);
    expect(ui.state.phase).toBe("event");
    expect(ui.auto.snapshot().running).toBe(false);
    expect(ui.auto.snapshot().pauseReason).toBe("event");
    expect(ui.auto.snapshot().mode).toBe("auto");
    ui.clock.flush(AUTO_INTERVAL_MS * 3);
    expect(ui.state.day).toBe(eventDay);
  });

  it("manual mode ignores time and switching to manual cancels a pending tick", () => {
    const ui = harness();
    ui.clock.flush(AUTO_INTERVAL_MS);
    expect(ui.state.day).toBe(1);
    ui.auto.enable();
    ui.auto.toManual();
    ui.clock.flush(AUTO_INTERVAL_MS);
    expect(ui.state.day).toBe(1);
    expect(ui.auto.snapshot().mode).toBe("manual");
  });

  it("stops when advance is rejected and keeps the city state", () => {
    const ui = harness();
    const eventDay = ui.state.eventPlan.map((entry) => entry.day).sort((a, b) => a - b)[0]!;
    ui.setState({
      ...ui.state,
      day: eventDay,
      phase: "preparation",
      activeEvent: null,
      completedEventIds: [],
    });
    const before = ui.state.gold;
    ui.auto.enable();
    ui.clock.flush(AUTO_INTERVAL_MS);
    expect(ui.auto.snapshot().pauseReason).toBe("rejected");
    expect(ui.state.gold).toBe(before);
    expect(ui.state.day).toBe(eventDay);
  });

  it("pauses while the tab is hidden and a stale run tick does nothing", () => {
    const ui = harness();
    ui.auto.enable();
    ui.hide();
    ui.auto.onHidden();
    expect(ui.auto.snapshot().pauseReason).toBe("hidden");
    ui.clock.flush(AUTO_INTERVAL_MS * 2);
    expect(ui.state.day).toBe(1);

    ui.auto.toManual();
    ui.auto.enable();
    ui.setState(createInitialState({ runId: "other-run" }));
    ui.clock.flush(AUTO_INTERVAL_MS);
    expect(ui.state.runId).toBe("other-run");
    expect(ui.state.day).toBe(1);
  });

  it("flags an unused economic action while auto is running", () => {
    const ui = harness();
    // Ensure day 1 is not an event day for this run.
    expect(ui.state.phase).toBe("preparation");
    ui.auto.enable();
    expect(ui.auto.snapshot().actionStillAvailable).toBe(true);
    expect(ui.auto.snapshot().autoUpgrade).toBe(false);
  });

  it("buys one upgrade per preparation day when auto upgrade is checked", () => {
    const ui = harness();
    const startGold = ui.state.gold;
    const firstCost = gameConfig.upgradeBaseCost;
    ui.auto.enable();
    ui.auto.setAutoUpgrade(true);
    expect(ui.state.troopLevel).toBe(1);
    expect(ui.state.wallLevel).toBe(0);
    expect(ui.state.gold).toBe(startGold - firstCost);
    expect(ui.state.actionUsedToday).toBe(true);
    expect(ui.state.day).toBe(1);
    ui.clock.flush(AUTO_INTERVAL_MS);
    expect(ui.state.day).toBe(2);
    if (ui.state.phase === "event") {
      expect(ui.auto.snapshot().pauseReason).toBe("event");
    } else {
      expect(ui.state.troopLevel).toBe(2);
      expect(ui.auto.snapshot().running).toBe(true);
    }
  });

  it("buys the wall when troops are too expensive and the wall is not", () => {
    const ui = harness();
    const wallCost = gameConfig.upgradeBaseCost;
    ui.setState({ ...ui.state, troopLevel: 4, gold: wallCost });
    ui.auto.enable();
    ui.auto.setAutoUpgrade(true);
    expect(ui.state.troopLevel).toBe(4);
    expect(ui.state.wallLevel).toBe(1);
    expect(ui.state.cityLevel).toBe(0);
    expect(ui.state.gold).toBe(0);
    expect(ui.state.actionUsedToday).toBe(true);
  });

  it("keeps advancing when auto upgrade cannot afford the next level", () => {
    const ui = harness();
    ui.setState({ ...ui.state, gold: 0 });
    ui.auto.enable();
    ui.auto.setAutoUpgrade(true);
    expect(ui.state.troopLevel).toBe(0);
    expect(ui.state.wallLevel).toBe(0);
    expect(ui.state.cityLevel).toBe(0);
    expect(ui.state.gold).toBe(0);
    ui.clock.flush(AUTO_INTERVAL_MS);
    expect(ui.state.day).toBe(2);
    if (ui.state.phase === "event") {
      expect(ui.auto.snapshot().pauseReason).toBe("event");
    } else {
      expect(ui.auto.snapshot().pauseReason).toBe(null);
    }
    ui.auto.toManual();
    expect(ui.auto.snapshot().autoUpgrade).toBe(false);
  });
});
