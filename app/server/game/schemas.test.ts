import { describe, expect, it } from "vitest";

import { createRunSchema, submitActionSchema } from "./schemas";

const actionId = "5a9d7be4-1c56-4bf4-99e0-12ca9e6efbb9";

describe("game request schemas", () => {
  it("defaults replaceActiveSave to false", () => {
    const input = createRunSchema.parse({ startRequestId: actionId });
    expect(input.replaceActiveSave).toBe(false);
  });

  it("accepts a trusted event choice command", () => {
    const input = submitActionSchema.parse({
      actionId,
      expectedRevision: 2,
      type: "chooseEventOption",
      payload: { choiceId: "day3-pay" },
    });
    expect(input.type).toBe("chooseEventOption");
  });

  it("rejects client-supplied fields in an empty payload", () => {
    expect(() => submitActionSchema.parse({
      actionId,
      expectedRevision: 0,
      type: "upgradeWall",
      payload: { cost: 1 },
    })).toThrow();
  });

  it("rejects a negative expected revision", () => {
    expect(() => submitActionSchema.parse({
      actionId,
      expectedRevision: -1,
      type: "repairCity",
      payload: {},
    })).toThrow();
  });
});
