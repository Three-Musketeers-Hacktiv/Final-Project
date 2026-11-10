import { describe, expect, it } from "vitest";
import {
  createInitialState,
  endPreparationDay,
  gameConfig,
  incomeAmountForDay,
  isBattleDay,
  isPreparationDay,
  upgradeWall,
  GAME_STATE_VERSION,
} from "../../../src/game/index";
import { expectError } from "../helpers/assertions";
import { play } from "../helpers/campaignPlayer";
import { avoidDamageChoice } from "../helpers/policies";
import { mustOk } from "../helpers/mustOk";
import { RUN } from "../fixtures/runIds";

describe("kalender dan state awal", () => {
  it("CAL-01 state awal versi 4, revision 0, dan 20 entri rencana event", () => {
    const state = createInitialState({ runId: RUN.calendar });
    expect(state.version).toBe(GAME_STATE_VERSION);
    expect(state.version).toBe(4);
    expect(state.revision).toBe(0);
    expect(state.day).toBe(1);
    expect(state.phase).toBe("preparation");
    expect(state.difficulty).toBe("normal");
    expect(state.cityHp).toBe(150);
    expect(state.cityMaxHp).toBe(150);
    expect(state.wallLevel).toBe(0);
    expect(state.troopLevel).toBe(0);
    expect(state.cityLevel).toBe(0);
    expect(state.actionUsedToday).toBe(false);
    expect(state.eventPlan).toHaveLength(20);
    expect(state.pendingConsequences).toEqual([]);
    expect(state.wavesCleared).toBe(0);
    expect(state.activeEvent).toBeNull();
  });

  it("CAL-02 income hari pertama normal tepat sekali", () => {
    const state = createInitialState({ runId: RUN.calendar });
    expect(state.gold).toBe(128);
    expect(state.incomeGrantedDays).toEqual([1]);
    expect(incomeAmountForDay(state, 1)).toBe(28);
  });

  it("CAL-03 income hari pertama mengikuti difficulty", () => {
    const easy = createInitialState({ runId: RUN.calendar, difficulty: "easy" });
    const hard = createInitialState({ runId: RUN.calendar, difficulty: "hard" });
    expect(easy.gold).toBe(132);
    expect(hard.gold).toBe(127);
    expect(incomeAmountForDay(easy, 1)).toBe(32);
    expect(incomeAmountForDay(hard, 1)).toBe(27);
  });

  it("CAL-04 sepuluh hari battle 10 sampai 100, income nol pada hari itu", () => {
    const state = createInitialState({ runId: RUN.calendar });
    expect(gameConfig.lastDay).toBe(100);
    expect([...gameConfig.battleDays]).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    for (let day = 1; day <= 100; day += 1) {
      if (day % 10 === 0) {
        expect(isBattleDay(day)).toBe(true);
        expect(isPreparationDay(day)).toBe(false);
        expect(incomeAmountForDay(state, day)).toBe(0);
      } else {
        expect(isPreparationDay(day)).toBe(true);
        expect(incomeAmountForDay(state, day)).toBe(28);
      }
    }
  });

  it("CAL-05 berjalan ke hari 10 tanpa belanja: income prep sekali, battle menolak belanja", () => {
    const ready = play(createInitialState({ runId: RUN.calendar }), {
      spend: "skip",
      eventChoice: avoidDamageChoice,
      stop: (state) => state.phase === "battleReady",
    }).state;

    expect(ready.day).toBe(10);
    expect(ready.phase).toBe("battleReady");
    expect(ready.incomeGrantedDays).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const blocked = upgradeWall(ready);
    expectError(blocked, "INVALID_PHASE");
    expect(ready.gold).toBe(blocked.ok ? ready.gold : ready.gold);
  });

  it("CAL-06 melewati hari tanpa belanja mengembalikan jatah aksi", () => {
    const start = createInitialState({ runId: RUN.calendar });
    const next = mustOk(endPreparationDay(start));
    expect(next.day).toBe(2);
    expect(next.actionUsedToday).toBe(false);
    expect(next.incomeGrantedDays).toEqual([1, 2]);
    expect(next.gold).toBe(start.gold + 28);
  });
});
