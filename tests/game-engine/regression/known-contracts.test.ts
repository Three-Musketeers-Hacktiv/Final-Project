import { describe, expect, it } from "vitest";
import * as engine from "../../../src/game/index";
import { createInitialState, isTrustedConsequencePackage, scheduledEventDays } from "../../../src/game/index";

describe("regresi kontrak yang sudah terdokumentasi", () => {
  it("REG-01 versi 4, enterCalendarDay tidak diekspor, hari event lama kosong", () => {
    expect(engine.GAME_STATE_VERSION).toBe(4);
    expect(createInitialState({ runId: "reg-01" }).version).toBe(4);
    expect("enterCalendarDay" in engine).toBe(false);
    expect(scheduledEventDays()).toEqual([]);
  });

  it("REG-02 rantai consequence tidak menerima arah terbalik", () => {
    expect(isTrustedConsequencePackage("c-unrest-wave1", "c-unrest-mid")).toBe(true);
    expect(isTrustedConsequencePackage("c-unrest-mid", "c-unrest-wave1")).toBe(false);
    expect(isTrustedConsequencePackage("c-shortage-wave2", "c-unrest-finale")).toBe(true);
    expect(isTrustedConsequencePackage("c-shortage-wave2", "c-raid-wave1")).toBe(false);
  });
});
