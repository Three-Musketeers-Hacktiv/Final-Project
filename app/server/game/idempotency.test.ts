import { describe, expect, it } from "vitest";

import { ApiError } from "@/server/http/api-error";
import { assertActionIdempotency } from "./idempotency";

function captureCode(callback: () => never) {
  try {
    callback();
    throw new Error("Expected idempotency check to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
}

describe("assertActionIdempotency", () => {
  it("reports a duplicate for the same payload hash", () => {
    const error = captureCode(() =>
      assertActionIdempotency({ payloadHash: "same", revisionAfter: 4 }, "same", 7),
    );

    expect(error.code).toBe("DUPLICATE_ACTION");
    expect(error.fields).toEqual({ currentRevision: "7" });
  });

  it("reports a conflict when an action id is reused with another payload", () => {
    const error = captureCode(() =>
      assertActionIdempotency({ payloadHash: "first", revisionAfter: 4 }, "second", 7),
    );

    expect(error.code).toBe("ACTION_PAYLOAD_CONFLICT");
    expect(error.fields).toEqual({ currentRevision: "7" });
  });
});
