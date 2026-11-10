import { describe, expect, it } from "vitest";
import {
  chooseEventOption,
  chooseReward,
  continueFromReport,
  createInitialState,
  endPreparationDay,
  repairCity,
  startBattle,
  surrender,
  upgradeWall,
} from "../../../src/game/index";
import { expectError, callWithoutMutating } from "../helpers/assertions";
import { play } from "../helpers/campaignPlayer";
import { avoidDamageChoice, scoredEventChoice } from "../helpers/policies";
import { mustOk } from "../helpers/mustOk";
import { roundTrip } from "../helpers/roundTrip";
import { RUN } from "../fixtures/runIds";

describe("transisi dan state", () => {
  it("STA-01 aksi di fase yang salah ditolak dan state asal tidak berubah", () => {
    const state = createInitialState({ runId: RUN.economy });
    expectError(callWithoutMutating(state, (current) => startBattle(current)), "INVALID_PHASE");
    expectError(callWithoutMutating(state, (current) => continueFromReport(current)), "INVALID_PHASE");
    expectError(callWithoutMutating(state, (current) => chooseReward(current, "w1-gold")), "INVALID_PHASE");

    const spent = mustOk(upgradeWall(state));
    expect(state.gold).toBe(128);
    expect(state.wallLevel).toBe(0);
    expect(state.revision).toBe(0);
    expect(spent.revision).toBe(1);
    expect(spent.wallLevel).toBe(1);
  });

  it("STA-02 event wajib diselesaikan sebelum belanja atau lanjut hari", () => {
    const eventDay = play(createInitialState({ runId: RUN.event }), {
      spend: "skip",
      eventChoice: avoidDamageChoice,
      stop: (state) => state.phase === "event",
    }).state;
    expectError(callWithoutMutating(eventDay, (current) => upgradeWall(current)), "EVENT_REQUIRED");
    expectError(callWithoutMutating(eventDay, (current) => endPreparationDay(current)), "EVENT_REQUIRED");
    expectError(callWithoutMutating(eventDay, (current) => repairCity(current)), "EVENT_REQUIRED");
  });

  it("STA-03 laporan wave 1 menuju reward, lalu pilihan menaikkan revision sekali", () => {
    const report = play(createInitialState({ runId: RUN.reward, difficulty: "easy" }), {
      spend: "knownWin",
      eventChoice: scoredEventChoice,
      stop: (state) => state.phase === "battleReport",
    }).state;
    expect(report.battleResult?.won).toBe(true);
    expect(report.cityHp).toBe(report.battleResult?.cityHpAfter);
    const reward = mustOk(continueFromReport(report));
    expect(reward.phase).toBe("reward");
    expect(reward.revision).toBe(report.revision + 1);

    const loaded = roundTrip(reward);
    const chosen = mustOk(chooseReward(loaded, "w1-gold"));
    expect(chosen.rewardsChosenByWave["1"]).toBe("w1-gold");
    expect(chosen.revision).toBe(loaded.revision + 1);
  });

  it("STA-04 kalah battle menghasilkan gameOver dan fase akhir menolak aksi", () => {
    const ready = play(createInitialState({ runId: RUN.defeat }), {
      spend: "skip",
      eventChoice: avoidDamageChoice,
      stop: (state) => state.phase === "battleReady" || state.phase === "gameOver",
    }).state;
    expect(ready.phase).toBe("battleReady");
    const lost = mustOk(startBattle(ready));
    expect(lost.phase).toBe("gameOver");
    expect(lost.cityHp).toBe(0);
    expect(lost.battleResult?.won).toBe(false);

    expectError(upgradeWall(lost), "GAME_ENDED");
    expectError(endPreparationDay(lost), "GAME_ENDED");
    expectError(startBattle(lost), "GAME_ENDED");
    expectError(surrender(lost), "GAME_ENDED");
  });

  it("STA-05 round-trip pada event tetap bisa memilih, revision gagal tidak naik", () => {
    const eventDay = play(createInitialState({ runId: RUN.event }), {
      spend: "skip",
      eventChoice: avoidDamageChoice,
      stop: (state) => state.phase === "event" && state.activeEvent != null,
    }).state;
    const loaded = roundTrip(eventDay);
    const free = loaded.activeEvent!.choices.find((choice) => choice.goldCost === 0)!;
    const before = loaded.revision;
    const denied = callWithoutMutating(loaded, (current) => chooseEventOption(current, "tidak-ada"));
    expectError(denied, "INVALID_CHOICE");
    expect(loaded.revision).toBe(before);
    const chosen = mustOk(chooseEventOption(loaded, free.id));
    expect(chosen.revision).toBe(before + 1);
  });

  it("STA-06 snapshot lama tidak ditolak engine dan bisa menerapkan income kedua kali", () => {
    const start = createInitialState({ runId: RUN.calendar });
    const first = mustOk(endPreparationDay(start));
    const second = mustOk(endPreparationDay(start));
    expect(first.day).toBe(2);
    expect(second.day).toBe(2);
    expect(first.gold).toBe(second.gold);
    expect(first.revision).toBe(1);
    expect(second.revision).toBe(1);
    expect(start.revision).toBe(0);
  });
});
