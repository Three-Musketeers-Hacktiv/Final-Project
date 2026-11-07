import { describe, expect, it } from "vitest";

import { hashPayload } from "./hash";

describe("hashPayload", () => {
  it("is stable across object key order", () => {
    expect(hashPayload({ type: "upgradeWall", payload: {} })).toBe(
      hashPayload({ payload: {}, type: "upgradeWall" }),
    );
  });

  it("changes when a payload changes", () => {
    expect(hashPayload({ replaceActiveSave: false })).not.toBe(
      hashPayload({ replaceActiveSave: true }),
    );
  });
});
