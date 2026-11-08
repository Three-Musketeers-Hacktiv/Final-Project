import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import { createGameState, getEngineRulesetMetadata } from "@/server/game-engine/adapter";
import type { GameRulesetDocument, GameRunDocument } from "@/server/game/types";
import { ApiError } from "@/server/http/api-error";
import { assertLoadableRun } from "./load";

function fixture() {
  const runId = new ObjectId();
  const rulesetId = new ObjectId();
  const now = new Date();
  const metadata = getEngineRulesetMetadata();
  const ruleset: GameRulesetDocument = {
    _id: rulesetId,
    ...metadata,
    status: "active",
    createdAt: now,
  };
  const run: GameRunDocument = {
    _id: runId,
    userId: new ObjectId(),
    gameRulesetId: rulesetId,
    startRequestId: crypto.randomUUID(),
    startRequestPayloadHash: "hash",
    state: createGameState(runId.toHexString()),
    timeline: [],
    createdAt: now,
    updatedAt: now,
    endedAt: null,
  };
  const pointer = {
    gameRunId: runId,
    savedRevision: run.state.revision,
    savedAt: now,
  };
  return { run, ruleset, pointer };
}

function expectCode(callback: () => void, code: string) {
  try {
    callback();
    throw new Error("Expected validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(code);
  }
}

describe("assertLoadableRun", () => {
  it("accepts a consistent patched run and pointer", () => {
    const { run, ruleset, pointer } = fixture();
    expect(() => assertLoadableRun(run, ruleset, pointer)).not.toThrow();
  });

  it("rejects an unsupported state version", () => {
    const { run, ruleset } = fixture();
    const invalid = {
      ...run,
      state: { ...run.state, version: 2 },
    } as unknown as GameRunDocument;
    expectCode(() => assertLoadableRun(invalid, ruleset), "UNSUPPORTED_STATE_VERSION");
  });

  it("rejects run id and patched event-plan drift", () => {
    const { run, ruleset } = fixture();
    const wrongRunId = { ...run, state: { ...run.state, runId: new ObjectId().toHexString() } };
    expectCode(() => assertLoadableRun(wrongRunId, ruleset), "RUN_INTEGRITY_ERROR");

    const legacy = {
      ...run,
      state: { ...run.state, eventPlan: undefined },
    } as unknown as GameRunDocument;
    expectCode(() => assertLoadableRun(legacy, ruleset), "RUN_INTEGRITY_ERROR");
  });

  it("rejects an incompatible ruleset fingerprint", () => {
    const { run, ruleset } = fixture();
    expectCode(
      () => assertLoadableRun(run, { ...ruleset, configFingerprint: "stale" }),
      "RUN_INTEGRITY_ERROR",
    );
  });

  it("rejects current-save pointer drift", () => {
    const { run, ruleset, pointer } = fixture();
    expectCode(
      () => assertLoadableRun(run, { ...ruleset }, { ...pointer, savedRevision: 99 }),
      "SAVE_POINTER_MISMATCH",
    );
    expectCode(
      () => assertLoadableRun(run, ruleset, { ...pointer, gameRunId: new ObjectId() }),
      "SAVE_POINTER_MISMATCH",
    );
  });
});
