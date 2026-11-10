import { describe, expect, it } from "vitest";
import {
  chooseEventOption,
  createInitialState,
  isPreparationDay,
  isTrustedConsequencePackage,
  pickEventPlan,
  shiftPlanEntryDay,
} from "../../../src/game/index";
import { play } from "../helpers/campaignPlayer";
import { avoidDamageChoice } from "../helpers/policies";
import { mustOk } from "../helpers/mustOk";
import { RUN } from "../fixtures/runIds";

function openFirstSkippable(runId: string) {
  return play(createInitialState({ runId }), {
    spend: "skip",
    eventChoice: avoidDamageChoice,
    stop: (state) => Boolean(state.activeEvent?.choices.some((choice) => choice.consequence)),
  }).state;
}

describe("consequence", () => {
  it("CON-01 jadwal consequence deterministik untuk runId yang sama", () => {
    const first = openFirstSkippable(RUN.consequence);
    const choice = first.activeEvent!.choices.find((entry) => entry.consequence)!;
    const scheduled = mustOk(chooseEventOption(first, choice.id));
    expect(scheduled.pendingConsequences.length).toBeGreaterThan(0);

    const second = openFirstSkippable(RUN.consequence);
    const again = mustOk(chooseEventOption(second, choice.id));
    expect(again.pendingConsequences).toEqual(scheduled.pendingConsequences);
  });

  it("CON-02 trigger jatuh pada hari persiapan dan tetap ada saat hari itu dimasuki", () => {
    const opened = openFirstSkippable(RUN.consequence);
    const choice = opened.activeEvent!.choices.find((entry) => entry.consequence)!;
    const scheduled = mustOk(chooseEventOption(opened, choice.id));
    const pending = scheduled.pendingConsequences[0]!;
    expect(isPreparationDay(pending.triggerDay)).toBe(true);
    expect(pending.triggerDay).toBeGreaterThan(opened.day);

    const arrived = play(scheduled, {
      spend: "skip",
      eventChoice: avoidDamageChoice,
      stop: (state) => state.day === pending.triggerDay && state.phase === "event",
    }).state;
    expect(arrived.day).toBe(pending.triggerDay);
    expect(arrived.phase).toBe("event");
    expect(arrived.activeEvent?.isConsequence).toBe(true);
    expect(arrived.activeEvent?.packageId).toBe(pending.packageId);
  });

  it("CON-03 pergeseran hari rencana tidak menghapus entri", () => {
    const plan = pickEventPlan(RUN.shift);
    const fromDay = plan[0]!.day;
    const occupied = new Set(plan.map((entry) => entry.day));
    const shifted = shiftPlanEntryDay(plan, fromDay, occupied);
    expect(shifted).toHaveLength(plan.length);
    expect(plan.find((entry) => entry.day === fromDay)).toBeTruthy();
    const moved = shifted.find((entry) => entry.packageId === plan[0]!.packageId && entry.eventId === plan[0]!.eventId);
    expect(moved).toBeTruthy();
    expect(moved!.day).not.toBe(fromDay);
    expect(isPreparationDay(moved!.day)).toBe(true);
  });

  it("CON-04 dua consequence tercatat dengan id berbeda", () => {
    const opened = openFirstSkippable("qa-two-consequences");
    const firstChoice = opened.activeEvent!.choices.find((entry) => entry.consequence)!;
    let state = mustOk(chooseEventOption(opened, firstChoice.id));
    expect(state.pendingConsequences).toHaveLength(1);

    const next = play(state, {
      spend: "skip",
      eventChoice: avoidDamageChoice,
      stop: (current) =>
        Boolean(current.activeEvent?.choices.some((choice) => choice.consequence)) &&
        current.activeEvent?.eventId !== opened.activeEvent?.eventId,
    }).state;
    const secondChoice = next.activeEvent!.choices.find((entry) => entry.consequence)!;
    state = mustOk(chooseEventOption(next, secondChoice.id));
    expect(state.pendingConsequences).toHaveLength(2);
    expect(state.pendingConsequences[0]!.id).not.toBe(state.pendingConsequences[1]!.id);
    expect(state.pendingConsequences.every((entry) => isPreparationDay(entry.triggerDay))).toBe(true);
  });

  it("CON-05 successor hanya dipercaya ke arah depan", () => {
    expect(isTrustedConsequencePackage("c-raid-wave1", "c-raid-wave1")).toBe(true);
    expect(isTrustedConsequencePackage("c-raid-wave1", "c-raid-wave2")).toBe(true);
    expect(isTrustedConsequencePackage("c-raid-wave1", "c-raid-finale")).toBe(true);
    expect(isTrustedConsequencePackage("c-raid-wave2", "c-raid-wave1")).toBe(false);
    expect(isTrustedConsequencePackage("c-raid-wave1", "c-unrest-wave1")).toBe(false);
    expect(isTrustedConsequencePackage("paket-asing", "c-raid-wave1")).toBe(false);
  });
});
