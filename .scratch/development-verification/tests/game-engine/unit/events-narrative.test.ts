import { describe, expect, it } from "vitest";
import {
  attachActiveEvent,
  chooseEventOption,
  createInitialState,
  decorateActiveEvent,
  eventPackageById,
  narrativeChoiceIdsMatch,
  pickEventPlan,
  scaleEventGoldCost,
} from "../../../src/game/index";
import { expectError, callWithoutMutating } from "../helpers/assertions";
import { play } from "../helpers/campaignPlayer";
import { avoidDamageChoice } from "../helpers/policies";
import { mustOk } from "../helpers/mustOk";
import { asBoundary } from "../fixtures/boundaryStates";
import { findRunId, RUN } from "../fixtures/runIds";

const scoutsRun = findRunId((plan) => plan.some((entry) => entry.packageId === "d1-scouts-a"));
const suppliesRun = findRunId((plan) => plan.some((entry) => entry.packageId === "d1-supplies-a"));

function reachPackage(runId: string, packageId: string, difficulty: "normal" | "hard" = "normal") {
  return play(createInitialState({ runId, difficulty }), {
    spend: "skip",
    eventChoice: avoidDamageChoice,
    stop: (state) => state.activeEvent?.packageId === packageId,
  }).state;
}

describe("event dan narasi", () => {
  it("EVT-01 rencana stabil, 2 sampai 4 pilihan, dan ada pilihan gratis", () => {
    const plan = pickEventPlan(RUN.event);
    expect(pickEventPlan(RUN.event)).toEqual(plan);
    expect(plan).toHaveLength(20);
    for (const entry of plan) {
      const pkg = eventPackageById(entry.packageId);
      expect(pkg).toBeTruthy();
      expect(pkg!.choices.length).toBeGreaterThanOrEqual(2);
      expect(pkg!.choices.length).toBeLessThanOrEqual(4);
      expect(pkg!.choices.some((choice) => choice.goldCost === 0)).toBe(true);
    }
  });

  it("EVT-02 pilihan asing, event tidak aktif, dan paket palsu ditolak", () => {
    const idle = createInitialState({ runId: RUN.event });
    expectError(callWithoutMutating(idle, (state) => chooseEventOption(state, "d1-scouts-a-skip")), "INVALID_PHASE");

    const scouts = reachPackage(scoutsRun, "d1-scouts-a");
    expect(scouts.activeEvent?.packageId).toBe("d1-scouts-a");
    expectError(
      callWithoutMutating(scouts, (state) => chooseEventOption(state, "bukan-pilihan")),
      "INVALID_CHOICE",
    );

    const foreign = callWithoutMutating(scouts, (state) =>
      attachActiveEvent(state, {
        eventId: "palsu",
        packageId: "palsu",
        day: state.day,
        title: "Narasi terlambat",
        description: "Efek ini tidak boleh masuk",
        choices: [
          { id: "a", label: "A", goldCost: 0, effects: [{ type: "grantGold", amount: 999 }] },
          { id: "b", label: "B", goldCost: 0, effects: [] },
        ],
        source: "ai",
      }),
    );
    expectError(foreign, "INVALID_CHOICE");
  });

  it("EVT-03 biaya event mengikuti difficulty satu kali", () => {
    const hard = reachPackage(scoutsRun, "d1-scouts-a", "hard");
    const pay = hard.activeEvent!.choices.find((choice) => choice.id === "d1-scouts-a-pay-def");
    expect(pay).toBeTruthy();
    expect(eventPackageById("d1-scouts-a")!.choices.find((choice) => choice.id === pay!.id)!.goldCost).toBe(20);
    expect(pay!.goldCost).toBe(22);
    expect(pay!.goldCost).toBe(scaleEventGoldCost(20, "hard"));

    const overlay = decorateActiveEvent(hard, {
      title: "Judul AI",
      description: "Deskripsi AI",
      source: "ai",
      choices: hard.activeEvent!.choices.map((choice) => ({
        id: choice.id,
        label: `Bayar ${choice.goldCost} gold sekarang`,
      })),
    });
    const overlaid = overlay.activeEvent!.choices.find((choice) => choice.id === pay!.id)!;
    expect(overlaid.goldCost).toBe(22);
    expect(overlaid.effects).toEqual(pay!.effects);
    expect(overlaid.label).toBe(pay!.label);
    expect(overlay.revision).toBe(hard.revision);
  });

  it("EVT-04 biaya dan efek atomik, pilihan ulang tidak menambah gold", () => {
    const supplies = reachPackage(suppliesRun, "d1-supplies-a");
    const before = supplies.gold;
    const chosen = mustOk(chooseEventOption(supplies, "d1-supplies-a-gold"));
    expect(chosen.gold).toBe(before + 12);
    expect(chosen.completedEventIds).toContain("d1-supplies-a");

    const again = callWithoutMutating(chosen, (state) => chooseEventOption(state, "d1-supplies-a-gold"));
    expect(again.ok).toBe(false);
    expect(chosen.gold).toBe(before + 12);
  });

  it("EVT-05 HP fatal dari pilihan gratis langsung gameOver", () => {
    const supplies = reachPackage(suppliesRun, "d1-supplies-a");
    const dying = asBoundary(supplies, "HP sama dengan damage pilihan", { cityHp: 10 });
    const dead = mustOk(chooseEventOption(dying, "d1-supplies-a-hurt"));
    expect(dead.phase).toBe("gameOver");
    expect(dead.cityHp).toBe(0);
    expectError(chooseEventOption(dead, "d1-supplies-a-hurt"), "GAME_ENDED");
    expect(dead.cityHp).toBe(0);
  });

  it("EVT-06 label AI yang menyebut gold diabaikan, label tanpa mata uang dipakai", () => {
    const scouts = reachPackage(scoutsRun, "d1-scouts-a");
    const clean = decorateActiveEvent(scouts, {
      title: "Gerbang",
      description: "Para pengintai menunggu.",
      source: "mock",
      choices: scouts.activeEvent!.choices.map((choice) => ({ id: choice.id, label: "Biarkan lewat" })),
    });
    expect(clean.activeEvent!.title).toBe("Gerbang");
    expect(clean.activeEvent!.choices.every((choice) => choice.label === "Biarkan lewat")).toBe(true);
    expect(clean.activeEvent!.choices.map((choice) => choice.id)).toEqual(
      scouts.activeEvent!.choices.map((choice) => choice.id),
    );

    const mismatched = {
      title: "Salah",
      description: "ID tidak sama",
      source: "ai" as const,
      choices: [
        { id: "lain", label: "Lain" },
        { id: "lain-2", label: "Lain dua" },
      ],
    };
    expect(narrativeChoiceIdsMatch(scouts, mismatched)).toBe(false);
    const kept = decorateActiveEvent(scouts, mismatched);
    expect(kept.activeEvent!.eventId).toBe(scouts.activeEvent!.eventId);
    expect(kept.activeEvent!.packageId).toBe(scouts.activeEvent!.packageId);
    expect(kept.activeEvent!.choices.map((choice) => choice.effects)).toEqual(
      scouts.activeEvent!.choices.map((choice) => choice.effects),
    );
  });

  it("EVT-07 event yang sama tidak menaikkan revision, identitas lain tidak mengganti paket", () => {
    const scouts = reachPackage(scoutsRun, "d1-scouts-a");
    const same = mustOk(attachActiveEvent(scouts, scouts.activeEvent!));
    expect(same.revision).toBe(scouts.revision);
    expect(same.activeEvent).toBe(scouts.activeEvent);

    const renamed = asBoundary(scouts, "identitas event diganti di luar paket", {
      activeEvent: {
        ...scouts.activeEvent!,
        packageId: "paket-lain",
        eventId: "event-lain",
      },
    });
    const rejected = callWithoutMutating(renamed, (state) =>
      chooseEventOption(state, scouts.activeEvent!.choices[0]!.id),
    );
    expectError(rejected, "INVALID_CHOICE");
  });
});