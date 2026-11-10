import { describe, expect, it, vi } from "vitest";

const { generateContent, clientOptions } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  clientOptions: { current: undefined as { httpOptions?: { retryOptions?: { httpStatusCodes?: number[] } } } | undefined },
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    constructor(options: { httpOptions?: { retryOptions?: { httpStatusCodes?: number[] } } }) {
      clientOptions.current = options;
    }
    models = { generateContent };
  },
}));

import { createInitialState, endPreparationDay } from "../../../src/game";
import { resetServerEnv } from "@/server/config/env";
import { packageSchemaProbes, probeFollowUp } from "./event-package.probes";
import {
  acceptGeminiPackageText,
  canonicalizeEventPackage,
  fingerprintPackage,
  generateEventPackage,
  generatedEventPackageJsonSchema,
  generatedEventPackageSchema,
  GeminiEventPackageGenerator,
  GEMINI_RETRY_HTTP_STATUS_CODES,
  PACKAGE_FALLBACK_REASONS,
  PackageGenerationError,
  buildPackageGenerationInput,
  parseGeminiPackageText,
  preferCommittedSnapshot,
  type EventPackageGenerator,
  type GeneratedEventPackageDraft,
} from "./event-package";

function openedState() {
  let state = createInitialState({ runId: "pkg-gen" });
  for (let step = 0; step < 20 && !state.activeEvent; step += 1) {
    const ended = endPreparationDay(state);
    if (!ended.ok) throw new Error(ended.error.message);
    state = ended.state;
  }
  return state;
}

const draft = {
  title: "The mill is burning",
  description: "Villagers shout from the yard while the fire spreads.",
  choices: [
    {
      id: "Bucket line",
      label: "Form a bucket line",
      goldCost: 0,
      effects: [{ type: "healCity", amount: 8 }],
    },
    {
      id: "Pay carriers",
      label: "Send paid carriers",
      goldCost: 15,
      effects: [{ type: "grantGold", amount: 0 }],
      consequence: {
        minDelayDays: 1,
        maxDelayDays: 2,
        targetWave: 1,
        fallbackPackage: {
          title: "The carriers come back",
          description: "They finished the work and wait at the gate.",
          choices: [
            { id: "thank", label: "Thank them", goldCost: 0, effects: [] },
            { id: "bonus", label: "Promise extra pay", goldCost: 5, effects: [{ type: "damageCity", amount: 0 }] },
          ],
        },
      },
    },
  ],
};

describe("event package generator", () => {
  it("sends Gemini a complete consequence and effect schema", async () => {
    const previousKey = process.env.GEMINI_API_KEY;
    const previousModel = process.env.GEMINI_MODEL;
    try {
      process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/test";
      process.env.JWT_SECRET ??= "x".repeat(32);
      process.env.APP_ORIGIN ??= "http://localhost:3000";
      process.env.GEMINI_API_KEY = "test-key";
      process.env.GEMINI_MODEL = "test-model";
      resetServerEnv();
      generateContent.mockResolvedValueOnce({ text: JSON.stringify(draft) });
      const state = openedState();
      const result = await new GeminiEventPackageGenerator().generate(
        buildPackageGenerationInput(state, state.activeEvent!),
      );
      expect(result).toEqual(draft);
      const config = generateContent.mock.lastCall![0].config;
      expect(config.responseMimeType).toBe("application/json");
      expect(config.responseJsonSchema).toBe(generatedEventPackageJsonSchema);
      expect(config.maxOutputTokens).toBeGreaterThan(0);
      expect(config).not.toHaveProperty("temperature");
      const retryCodes = clientOptions.current?.httpOptions?.retryOptions?.httpStatusCodes ?? [];
      expect(retryCodes).toEqual([...GEMINI_RETRY_HTTP_STATUS_CODES]);
      expect(retryCodes).not.toContain(400);
      const schema = config.responseJsonSchema;
      const choice = schema.properties.choices.items;
      expect(choice.properties.consequence).toMatchObject({
        required: expect.arrayContaining(["minDelayDays", "maxDelayDays", "fallbackPackage"]),
        properties: {
          minDelayDays: { type: "integer" },
          maxDelayDays: { type: "integer" },
          fallbackPackage: {
            required: expect.arrayContaining(["title", "description", "choices"]),
          },
        },
      });
      expect(choice.properties.effects.items).not.toHaveProperty("anyOf");
      expect(choice.properties.effects.items.properties.type.enum).toHaveLength(6);
      const followChoice = choice.properties.consequence.properties.fallbackPackage.properties.choices.items;
      expect(followChoice.required).toEqual(expect.arrayContaining(["id", "label", "goldCost", "effects"]));
      expect(followChoice.properties.effects.items).toEqual(choice.properties.effects.items);
      expect(followChoice.properties).not.toHaveProperty("consequence");
    } finally {
      if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = previousKey;
      if (previousModel === undefined) delete process.env.GEMINI_MODEL;
      else process.env.GEMINI_MODEL = previousModel;
      resetServerEnv();
      generateContent.mockReset();
    }
  });

  it("canonicalizes model output without trusting its event identity", () => {
    const state = openedState();
    const event = state.activeEvent!;
    const pkg = canonicalizeEventPackage(generatedEventPackageSchema.parse(draft), {
      eventId: event.eventId,
      day: event.day,
      isConsequence: false,
    });
    expect(pkg.eventId).toBe(event.eventId);
    expect(pkg.packageId).toBe(`ai:${event.eventId}`);
    expect(pkg.choices[1]?.consequence?.fallbackPackage?.choices.every((choice) => !choice.consequence)).toBe(true);
    expect(fingerprintPackage(pkg)).toBe(fingerprintPackage(pkg));
  });

  it("uses a throwing provider as fallback and keeps a committed snapshot", async () => {
    resetServerEnv();
    process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/test";
    process.env.JWT_SECRET ??= "x".repeat(32);
    process.env.APP_ORIGIN ??= "http://localhost:3000";
    const state = openedState();
    const before = JSON.stringify(state);
    const generator: EventPackageGenerator = {
      provider: "gemini",
      model: "test",
      generate: async () => {
        throw new Error("timeout");
      },
    };
    const result = await generateEventPackage(state, state.activeEvent!, generator);
    expect(result.source).toBe("fallback");
    expect(result.pkg).toBeNull();
    expect(result.fallbackReason).toBe(PACKAGE_FALLBACK_REASONS.providerError);
    expect(JSON.stringify(state)).toBe(before);
    const committed = { packageId: "snap" };
    expect(preferCommittedSnapshot(committed, { packageId: "late" })).toBe(committed);
  });

  it("rejects unknown effects in the provider schema", () => {
    const parsed = generatedEventPackageSchema.safeParse({
      ...draft,
      choices: [
        draft.choices[0],
        { id: "bad", label: "Do a spell", goldCost: 0, effects: [{ type: "castSpell", amount: 1 }] },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

function withoutConsequence() {
  return {
    title: draft.title,
    description: draft.description,
    choices: [
      draft.choices[0],
      { id: "leave", label: "Leave the mill", goldCost: 0, effects: [] },
    ],
  };
}

function withPatchedConsequence(patch: Record<string, unknown> | null) {
  const paid = draft.choices[1]!;
  return {
    ...draft,
    choices: [
      draft.choices[0],
      { ...paid, consequence: patch },
    ],
  };
}

describe("structural schema contract", () => {
  it("matches required and optional keys without claiming domain parity", () => {
    const root = generatedEventPackageJsonSchema;
    expect(root.required).toEqual(["title", "description", "choices"]);
    expect(root.propertyOrdering).toEqual(Object.keys(root.properties));
    expect(root).not.toHaveProperty("additionalProperties");

    const choice = root.properties.choices.items;
    expect(choice.required).toEqual(["id", "label", "goldCost", "effects"]);
    expect(Object.keys(choice.properties)).toEqual(["id", "label", "goldCost", "effects", "consequence"]);
    expect(choice.propertyOrdering).toEqual(Object.keys(choice.properties));

    const consequence = choice.properties.consequence;
    expect(consequence.required).toEqual(["minDelayDays", "maxDelayDays", "fallbackPackage"]);
    expect(Object.keys(consequence.properties)).toEqual([
      "minDelayDays",
      "maxDelayDays",
      "targetWave",
      "fallbackPackage",
    ]);
    expect(consequence.properties.minDelayDays).toEqual({ type: "integer" });
    expect(consequence.properties.minDelayDays).not.toHaveProperty("minimum");
    expect(consequence.properties.maxDelayDays).not.toHaveProperty("maximum");

    const fallback = consequence.properties.fallbackPackage;
    expect(fallback.required).toEqual(["title", "description", "choices"]);
    const follow = fallback.properties.choices.items;
    expect(follow.required).toEqual(["id", "label", "goldCost", "effects"]);
    expect(follow.properties).not.toHaveProperty("consequence");
    expect(follow.propertyOrdering).toEqual(["id", "label", "goldCost", "effects"]);
    expect(follow.properties.effects.items).not.toHaveProperty("anyOf");
    expect(follow.properties.effects.items.required).toEqual(["type"]);
    expect(follow.properties.effects.items.properties.type.enum).toEqual([
      "grantGold",
      "damageCity",
      "healCity",
      "maxHpBonus",
      "nextWaveDefense",
      "upgradeDiscount",
    ]);

    const effect = choice.properties.effects.items;
    expect(effect).not.toHaveProperty("anyOf");
    expect(effect.required).toEqual(["type"]);
    expect(effect.properties.type.enum).toEqual([
      "grantGold",
      "damageCity",
      "healCity",
      "maxHpBonus",
      "nextWaveDefense",
      "upgradeDiscount",
    ]);
    expect(effect.propertyOrdering).toEqual(["type", "amount", "wave", "rate", "untilWave"]);
    expect(JSON.stringify(effect)).not.toContain("additionalProperties");
    expect(JSON.stringify(root)).not.toContain("anyOf");
    expect(JSON.stringify(root)).not.toContain("minItems");
    expect(JSON.stringify(root)).not.toContain("maxItems");
  });
});

describe("draft rejection", () => {
  const cases: Array<[string, unknown]> = [
    ["empty consequence", withPatchedConsequence({})],
    ["null consequence", withPatchedConsequence(null)],
    ["missing minDelayDays", withPatchedConsequence({ maxDelayDays: 2, fallbackPackage: draft.choices[1]!.consequence!.fallbackPackage })],
    ["missing maxDelayDays", withPatchedConsequence({ minDelayDays: 1, fallbackPackage: draft.choices[1]!.consequence!.fallbackPackage })],
    ["missing fallbackPackage", withPatchedConsequence({ minDelayDays: 1, maxDelayDays: 2 })],
    ["incomplete fallbackPackage", withPatchedConsequence({
      minDelayDays: 1,
      maxDelayDays: 2,
      fallbackPackage: { title: "Only a title" },
    })],
    ["nested consequence", withPatchedConsequence({
      minDelayDays: 1,
      maxDelayDays: 2,
      fallbackPackage: {
        title: "Again",
        description: "Another gate.",
        choices: [
          { id: "free", label: "Wait", goldCost: 0, effects: [], consequence: { minDelayDays: 1, maxDelayDays: 1, fallbackPackage: { title: "x", description: "y", choices: [] } } },
          { id: "paid", label: "Pay", goldCost: 1, effects: [] },
        ],
      },
    })],
    ["unknown effect", {
      ...draft,
      choices: [draft.choices[0], { id: "bad", label: "Cast", goldCost: 0, effects: [{ type: "castSpell", amount: 1 }] }],
    }],
    ["unknown effect field", {
      ...draft,
      choices: [draft.choices[0], { id: "bad", label: "Cast", goldCost: 0, effects: [{ type: "healCity", amount: 1, mana: 2 }] }],
    }],
    ["wrong numeric type", withPatchedConsequence({
      minDelayDays: "1",
      maxDelayDays: 2,
      fallbackPackage: draft.choices[1]!.consequence!.fallbackPackage,
    })],
    ["delay out of range", withPatchedConsequence({
      minDelayDays: 0,
      maxDelayDays: 2,
      fallbackPackage: draft.choices[1]!.consequence!.fallbackPackage,
    })],
    ["delay order reversed", withPatchedConsequence({
      minDelayDays: 4,
      maxDelayDays: 1,
      fallbackPackage: draft.choices[1]!.consequence!.fallbackPackage,
    })],
    ["no free choice", {
      ...draft,
      choices: draft.choices.map((choice) => ({ ...choice, goldCost: 10 })),
    }],
  ];

  it.each(cases)("rejects %s and falls back without changing state", async (_name, value) => {
    expect(generatedEventPackageSchema.safeParse(value).success).toBe(false);
    const state = openedState();
    const before = JSON.stringify(state);
    const generator: EventPackageGenerator = {
      provider: "gemini",
      model: "test",
      generate: async () => value as GeneratedEventPackageDraft,
    };
    const result = await generateEventPackage(state, state.activeEvent!, generator);
    expect(result.source).toBe("fallback");
    expect(result.pkg).toBeNull();
    expect(result.fallbackReason).toBe(PACKAGE_FALLBACK_REASONS.schemaMismatch);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("keeps the two-to-four choice bound in Zod", () => {
    const extra = draft.choices[0]!;
    expect(generatedEventPackageSchema.safeParse({
      ...draft,
      choices: [...draft.choices, extra, extra, extra],
    }).success).toBe(false);
  });

  it("accepts a package with no consequence", () => {
    expect(generatedEventPackageSchema.safeParse(withoutConsequence()).success).toBe(true);
  });

  it("accepts every supported effect field set", () => {
    const parsed = generatedEventPackageSchema.safeParse({
      title: "Fields",
      description: "Each effect is complete.",
      choices: [
        { id: "free", label: "Wait", goldCost: 0, effects: [{ type: "grantGold", amount: 1 }] },
        { id: "hurt", label: "Hold", goldCost: 1, effects: [{ type: "damageCity", amount: 2 }, { type: "healCity", amount: 3 }, { type: "maxHpBonus", amount: 4 }] },
        { id: "wall", label: "Brace", goldCost: 2, effects: [{ type: "nextWaveDefense", amount: 5, wave: 1 }] },
        { id: "sale", label: "Bargain", goldCost: 3, effects: [{ type: "upgradeDiscount", rate: 0.25, untilWave: 1 }] },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("provider failure classes", () => {
  function withGeminiEnv() {
    process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/test";
    process.env.JWT_SECRET ??= "x".repeat(32);
    process.env.APP_ORIGIN ??= "http://localhost:3000";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "test-model";
    resetServerEnv();
  }

  it.each([
    ["truncated even when JSON parses", { text: JSON.stringify(draft), candidates: [{ finishReason: "MAX_TOKENS" }] }, PACKAGE_FALLBACK_REASONS.outputTruncated],
    ["empty text", { text: "", candidates: [{ finishReason: "STOP" }] }, PACKAGE_FALLBACK_REASONS.emptyResponse],
    ["invalid JSON", { text: "{", candidates: [{ finishReason: "STOP" }] }, PACKAGE_FALLBACK_REASONS.invalidJson],
    ["schema mismatch", { text: JSON.stringify({ title: "x" }), candidates: [{ finishReason: "STOP" }] }, PACKAGE_FALLBACK_REASONS.schemaMismatch],
    ["safety finish reason", { text: JSON.stringify(draft), candidates: [{ finishReason: "SAFETY" }] }, PACKAGE_FALLBACK_REASONS.safetyBlock],
    ["prompt block", { text: JSON.stringify(draft), promptFeedback: { blockReason: "SAFETY" } }, PACKAGE_FALLBACK_REASONS.safetyBlock],
  ])("classifies %s", async (_name, response, reason) => {
    withGeminiEnv();
    generateContent.mockResolvedValueOnce(response);
    const state = openedState();
    const before = JSON.stringify(state);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await generateEventPackage(state, state.activeEvent!, new GeminiEventPackageGenerator());
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe(reason);
    expect(JSON.stringify(state)).toBe(before);
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain("test-key");
    expect(logged).not.toContain(PACKAGE_SYSTEM_INSTRUCTION_MARKER);
    warn.mockRestore();
    generateContent.mockReset();
  });

  it("classifies HTTP 400 as an invalid argument and does not retry that status", async () => {
    withGeminiEnv();
    const rejected = new Error("Request contains an invalid argument.");
    Object.assign(rejected, { status: 400, name: "ApiError" });
    generateContent.mockRejectedValueOnce(rejected);
    const state = openedState();
    const before = JSON.stringify(state);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await generateEventPackage(state, state.activeEvent!, new GeminiEventPackageGenerator());
    expect(result.source).toBe("fallback");
    expect(result.pkg).toBeNull();
    expect(result.fallbackReason).toBe(PACKAGE_FALLBACK_REASONS.providerInvalidArgument);
    expect(JSON.stringify(state)).toBe(before);
    expect(generateContent).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain("provider-invalid-argument");
    expect(logged).toContain("\"httpStatus\":400");
    expect(logged).toContain("test-model");
    expect(logged).toContain("event-package-en-v2");
    expect(logged).not.toContain("test-key");
    expect(logged).not.toContain(PACKAGE_SYSTEM_INSTRUCTION_MARKER);
    expect(logged).not.toContain("\"hp\"");
    const retryCodes = clientOptions.current?.httpOptions?.retryOptions?.httpStatusCodes ?? [];
    expect(retryCodes).not.toContain(400);
    warn.mockRestore();
    generateContent.mockReset();
  });

  it("keeps HTTP 429 on the generic provider-error path", async () => {
    withGeminiEnv();
    const rejected = new Error("rate limit");
    Object.assign(rejected, { status: 429, name: "ApiError" });
    generateContent.mockRejectedValueOnce(rejected);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const state = openedState();
    const result = await generateEventPackage(state, state.activeEvent!, new GeminiEventPackageGenerator());
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe(PACKAGE_FALLBACK_REASONS.providerError);
    expect(JSON.stringify(warn.mock.calls)).toContain("\"httpStatus\":429");
    warn.mockRestore();
    generateContent.mockReset();
  });

  it("classifies a thrown provider error without recording the prompt", async () => {
    withGeminiEnv();
    generateContent.mockRejectedValueOnce(new Error("socket hang up"));
    const state = openedState();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await generateEventPackage(state, state.activeEvent!, new GeminiEventPackageGenerator());
    expect(result.fallbackReason).toBe(PACKAGE_FALLBACK_REASONS.providerError);
    expect(JSON.stringify(warn.mock.calls)).not.toContain("test-key");
    warn.mockRestore();
    generateContent.mockReset();
  });

  it("rejects a dominated package through the engine validator", async () => {
    const state = openedState();
    const before = JSON.stringify(state);
    const dominated = {
      title: draft.title,
      description: draft.description,
      choices: [
        { id: "free", label: "Wait", goldCost: 0, effects: [{ type: "healCity", amount: 1 }] },
        { id: "paid", label: "Pay for the same", goldCost: 10, effects: [{ type: "healCity", amount: 1 }] },
      ],
    };
    expect(generatedEventPackageSchema.safeParse(dominated).success).toBe(true);
    const result = await generateEventPackage(state, state.activeEvent!, {
      provider: "gemini",
      model: "test",
      generate: async () => dominated as GeneratedEventPackageDraft,
    });
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe(PACKAGE_FALLBACK_REASONS.packageRejected);
    expect(result.pkg).toBeNull();
    expect(JSON.stringify(state)).toBe(before);
  });

  it("accepts a valid package as ai without applying cost or effects", async () => {
    const state = openedState();
    const before = JSON.stringify(state);
    const result = await generateEventPackage(state, state.activeEvent!, {
      provider: "gemini",
      model: "test",
      generate: async () => draft as GeneratedEventPackageDraft,
    });
    expect(result.source).toBe("ai");
    expect(result.pkg?.choices.some((choice) => choice.goldCost === 0)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });
});

const PACKAGE_SYSTEM_INSTRUCTION_MARKER = "You create one playable city-defense event package as JSON.";

describe("schema probe ladder", () => {
  it("changes one schema variable per step and flips only tokens on follow-up", () => {
    const steps = packageSchemaProbes();
    expect(steps.map((step) => step.id)).toEqual(["A", "B", "C", "D1", "D2", "E1", "E2"]);
    expect(steps[0]).not.toHaveProperty("responseJsonSchema");
    expect(JSON.stringify(steps[1]!.responseJsonSchema)).not.toContain("anyOf");
    expect(JSON.stringify(steps[3]!.responseJsonSchema)).toContain("anyOf");
    expect(JSON.stringify(steps[4]!.responseJsonSchema)).not.toContain("anyOf");
    const e1 = steps[5]!.responseJsonSchema as {
      properties: { choices: { items: { properties: { consequence: { properties: { fallbackPackage: { properties: { choices: { items: { properties: Record<string, unknown> } } } } } } } } } };
    };
    const fallbackChoice = e1.properties.choices.items.properties.consequence.properties.fallbackPackage.properties.choices.items;
    expect(fallbackChoice.properties).not.toHaveProperty("effects");
    expect(fallbackChoice.properties).toHaveProperty("label");
    expect(steps[6]!.responseJsonSchema).toBe(generatedEventPackageJsonSchema);
    const follow = probeFollowUp(steps[3]!);
    expect(follow.id).toBe("F");
    expect(follow.responseJsonSchema).toBe(steps[3]!.responseJsonSchema);
    expect(follow.maxOutputTokens).toBe(2500);
    expect(steps[3]!.maxOutputTokens).toBe(800);
  });
});

describe("gemini response gates", () => {
  it("rejects truncated text before parsing", () => {
    expect(() => acceptGeminiPackageText({
      text: JSON.stringify(draft),
      candidates: [{ finishReason: "MAX_TOKENS" }],
    })).toThrow(PackageGenerationError);
    expect(() => parseGeminiPackageText("{")).toThrow(PackageGenerationError);
  });
});
