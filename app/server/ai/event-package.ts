import { createHash } from "node:crypto";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { getServerEnv } from "@/server/config/env";
import type { PackageSnapshotDocument } from "@/server/game/types";
import {
  canScheduleConsequence,
  CONSEQUENCE_REQUIRED_MESSAGE,
  gameConfig,
  getEffectiveStats,
  nextBattleDay,
  resolveIncomingConsequencePolicy,
  UNSCHEDULABLE_CONSEQUENCE_MESSAGE,
  validateEventPackage,
  type ActiveEvent,
  type Effect,
  type EventPackage,
  type GameState,
  type IncomingConsequencePolicy,
} from "../../../src/game";

export const PACKAGE_PROMPT_VERSION = "event-package-en-v3";
const GEMINI_MIN_DEADLINE_MS = 10_000;

/** HTTP 400 is not listed. Identical invalid-argument requests must not be retried. */
export const GEMINI_RETRY_HTTP_STATUS_CODES = [408, 429, 500, 502, 503, 504] as const;

/** Stable fallback categories. Domain bounds stay in the engine, not in these labels. */
export const PACKAGE_FALLBACK_REASONS = {
  outputTruncated: "output-truncated",
  emptyResponse: "empty-response",
  invalidJson: "invalid-json",
  schemaMismatch: "schema-mismatch",
  safetyBlock: "safety-block",
  providerInvalidArgument: "provider-invalid-argument",
  providerError: "provider-error",
  providerUnconfigured: "provider-unconfigured",
  packageRejected: "package-rejected",
  consequencePolicyFailed: "consequence-policy-failed",
} as const;

export type PackageFallbackReason = (typeof PACKAGE_FALLBACK_REASONS)[keyof typeof PACKAGE_FALLBACK_REASONS];

const SAFETY_FINISH_REASONS = new Set([
  "SAFETY",
  "RECITATION",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "IMAGE_SAFETY",
]);

export class PackageGenerationError extends Error {
  readonly fallbackReason: PackageFallbackReason;

  constructor(fallbackReason: PackageFallbackReason, message: string) {
    super(message);
    this.name = "PackageGenerationError";
    this.fallbackReason = fallbackReason;
  }
}

const effectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("grantGold"), amount: z.number() }).strict(),
  z.object({ type: z.literal("damageCity"), amount: z.number() }).strict(),
  z.object({ type: z.literal("healCity"), amount: z.number() }).strict(),
  z.object({ type: z.literal("maxHpBonus"), amount: z.number() }).strict(),
  z.object({ type: z.literal("nextWaveDefense"), amount: z.number(), wave: z.number() }).strict(),
  z.object({ type: z.literal("upgradeDiscount"), rate: z.number(), untilWave: z.number() }).strict(),
]);

const draftChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  goldCost: z.number(),
  effects: z.array(effectSchema),
}).strict();

const delayDays = z.number().int().min(1).max(30);

function hasFreeChoice(value: { choices: Array<{ goldCost: number }> }): boolean {
  return value.choices.some((choice) => choice.goldCost === 0);
}

const draftFallbackSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  choices: z.array(draftChoiceSchema).min(2).max(4),
}).strict().refine(hasFreeChoice, { message: "fallback package needs one free choice" });

const consequenceSchema = z.object({
  minDelayDays: delayDays,
  maxDelayDays: delayDays,
  targetWave: z.number().int().min(1).optional(),
  fallbackPackage: draftFallbackSchema,
}).strict().refine((value) => value.minDelayDays <= value.maxDelayDays, {
  message: "minDelayDays must be <= maxDelayDays",
});

const draftChoiceWithConsequenceSchema = draftChoiceSchema.extend({
  // Absent means omit. null and {} are rejected; do not fill defaults.
  consequence: consequenceSchema.optional(),
}).strict();

export const generatedEventPackageSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  choices: z.array(draftChoiceWithConsequenceSchema).min(2).max(4),
}).strict().refine(hasFreeChoice, { message: "package needs one free choice" });

export type GeneratedEventPackageDraft = z.infer<typeof generatedEventPackageSchema>;

/**
 * One effect object, not a six-way anyOf, and no array length bounds.
 * On gemini-3.5-flash-lite the full anyOf package returned HTTP 400. The same
 * package with a flat effect object still returned HTTP 400 while minItems and
 * maxItems remained. Dropping those bounds, and keeping this flat effect
 * object, was accepted. Zod still enforces the effect union and 2–4 choices.
 */
export const generatedEffectJsonSchema = {
  type: "object" as const,
  required: ["type"],
  propertyOrdering: ["type", "amount", "wave", "rate", "untilWave"],
  properties: {
    type: {
      type: "string" as const,
      enum: ["grantGold", "damageCity", "healCity", "maxHpBonus", "nextWaveDefense", "upgradeDiscount"],
    },
    amount: { type: "number" as const },
    wave: { type: "number" as const },
    rate: { type: "number" as const },
    untilWave: { type: "number" as const },
  },
};

export const generatedChoiceJsonSchema = {
  type: "object",
  required: ["id", "label", "goldCost", "effects"],
  propertyOrdering: ["id", "label", "goldCost", "effects"],
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    goldCost: { type: "number" },
    effects: { type: "array", items: generatedEffectJsonSchema },
  },
};

const generatedFallbackJsonSchema = {
  type: "object",
  required: ["title", "description", "choices"],
  propertyOrdering: ["title", "description", "choices"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    choices: { type: "array", items: generatedChoiceJsonSchema },
  },
};

const generatedConsequenceJsonSchema = {
  type: "object",
  required: ["minDelayDays", "maxDelayDays", "fallbackPackage"],
  propertyOrdering: ["minDelayDays", "maxDelayDays", "targetWave", "fallbackPackage"],
  properties: {
    minDelayDays: { type: "integer" },
    maxDelayDays: { type: "integer" },
    targetWave: { type: "integer" },
    fallbackPackage: generatedFallbackJsonSchema,
  },
};

const generatedChoiceWithConsequenceJsonSchema = {
  type: "object",
  required: ["id", "label", "goldCost", "effects"],
  propertyOrdering: ["id", "label", "goldCost", "effects", "consequence"],
  properties: {
    ...generatedChoiceJsonSchema.properties,
    consequence: generatedConsequenceJsonSchema,
  },
};

/**
 * Provider schema is structural only. Delay bounds, free-choice, dominance, and
 * package identity are enforced by Zod and validateEventPackage, not here.
 * Avoid additionalProperties, minLength, maxLength, minItems, and maxItems.
 * Gemini rejected this package when array bounds were present.
 */
export const generatedEventPackageJsonSchema = {
  type: "object",
  required: ["title", "description", "choices"],
  propertyOrdering: ["title", "description", "choices"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    choices: {
      type: "array",
      items: generatedChoiceWithConsequenceJsonSchema,
    },
  },
};

const PACKAGE_SYSTEM_RULES = [
  "You create one playable city-defense event package as JSON.",
  "Write a scene that is happening now. Each choice is a concrete action in that scene.",
  "goldCost is the base cost before difficulty scaling. Use 0 for at least one choice.",
  "Effects may only use grantGold, damageCity, healCity, maxHpBonus, nextWaveDefense, or upgradeDiscount.",
  "A paid choice must not duplicate a cheaper choice with the same effects.",
  "Each effect needs type and its fields: grantGold/damageCity/healCity/maxHpBonus use amount; nextWaveDefense uses amount and wave; upgradeDiscount uses rate and untilWave. Omit numeric fields that do not belong to that type. Never send null.",
  "Do not invent mechanics outside the effect list. Do not emit code, expressions, or state patches.",
  "Do not set the run id, calendar day, or canonical event id. Choice ids must be unique.",
  "Address the lord in English. Do not mention gold, coin, coins, treasury, or gp in choice labels.",
];

function consequenceInstruction(policy: IncomingConsequencePolicy): string {
  if (policy === "required") {
    return [
      "This slot requires a consequence: at least one choice must include a complete depth-1 consequence whose follow-up clearly continues that choice.",
      "Other choices may omit consequence. Do not add a consequence to every choice.",
      "If present, consequence must include integer minDelayDays and maxDelayDays (1 <= minDelayDays <= maxDelayDays <= 30) and a complete fallbackPackage with title, description, and choices, including one free choice and no further consequence.",
      "targetWave is an optional integer. If a choice has no consequence, omit the field. Never return null or an empty object.",
    ].join(" ");
  }
  return [
    "A consequence is optional and depth-1: its fallbackPackage has 2-4 choices, one free, and no further consequence.",
    "If there is no consequence, omit the consequence field. Never return null or an empty object.",
    "If present, consequence must include integer minDelayDays and maxDelayDays (1 <= minDelayDays <= maxDelayDays <= 30) and a complete fallbackPackage with title, description, and choices. targetWave is an optional integer.",
  ].join(" ");
}

export function packageSystemInstruction(policy: IncomingConsequencePolicy = "optional"): string {
  return [...PACKAGE_SYSTEM_RULES, consequenceInstruction(policy)].join(" ");
}

/** Optional-policy instruction. Required slots use packageSystemInstruction. */
export const PACKAGE_SYSTEM_INSTRUCTION = packageSystemInstruction("optional");

export type PackageGenerationInput = {
  locale: "en-US";
  promptVersion: string;
  slot: {
    day: number;
    decade: number;
    difficulty: GameState["difficulty"];
    kind: "scheduled" | "consequence";
    originEventId?: string;
    originChoiceId?: string;
  };
  city: {
    hp: number;
    maxHp: number;
    gold: number;
    wallLevel: number;
    troopLevel: number;
    cityLevel: number;
    attack: number;
    defense: number;
  };
  threat: { nextWave: number | null; nextBattleDay: number | null; nextEnemyName: string | null };
  activeEffects: GameState["effects"];
  recentDecisions: Array<{ day: number; choiceId: string; choiceLabel: string }>;
  supportedEffects: string[];
  rules: {
    choiceCount: "2-4";
    requireFreeChoice: true;
    goldCostMeaning: "base-before-difficulty";
    consequencePolicy: IncomingConsequencePolicy;
    consequenceDepth: 1;
  };
};

export interface EventPackageGenerator {
  readonly provider: string;
  readonly model: string | null;
  generate(input: PackageGenerationInput): Promise<GeneratedEventPackageDraft>;
}

export class GeminiEventPackageGenerator implements EventPackageGenerator {
  readonly provider = "gemini";
  readonly model: string;
  private readonly client: GoogleGenAI;

  constructor() {
    const env = getServerEnv();
    if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) {
      throw new Error("Gemini event package runtime is not configured");
    }
    this.model = env.GEMINI_MODEL;
    this.client = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: {
        timeout: Math.max(env.AI_TIMEOUT_MS, GEMINI_MIN_DEADLINE_MS),
        retryOptions: {
          attempts: env.AI_MAX_RETRIES + 1,
          httpStatusCodes: [...GEMINI_RETRY_HTTP_STATUS_CODES],
        },
      },
    });
  }

  async generate(input: PackageGenerationInput): Promise<GeneratedEventPackageDraft> {
    const env = getServerEnv();
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: JSON.stringify(input),
      config: {
        systemInstruction: packageSystemInstruction(input.rules.consequencePolicy),
        responseMimeType: "application/json",
        responseJsonSchema: generatedEventPackageJsonSchema,
        maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS,
      },
    });
    return parseGeminiPackageText(acceptGeminiPackageText(response));
  }
}

type GeminiPackageResponse = {
  text?: string;
  candidates?: Array<{ finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
};

/** Reject truncated or blocked output before trusting a parseable fragment. */
export function acceptGeminiPackageText(response: GeminiPackageResponse): string {
  if (response.promptFeedback?.blockReason) {
    throw new PackageGenerationError(
      PACKAGE_FALLBACK_REASONS.safetyBlock,
      "Gemini blocked the package prompt",
    );
  }
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && SAFETY_FINISH_REASONS.has(finishReason)) {
    throw new PackageGenerationError(
      PACKAGE_FALLBACK_REASONS.safetyBlock,
      "Gemini stopped for a safety or policy reason",
    );
  }
  if (finishReason === "MAX_TOKENS") {
    throw new PackageGenerationError(
      PACKAGE_FALLBACK_REASONS.outputTruncated,
      "Gemini package output was truncated",
    );
  }
  if (!response.text) {
    throw new PackageGenerationError(
      PACKAGE_FALLBACK_REASONS.emptyResponse,
      "Gemini response did not contain an event package",
    );
  }
  return response.text;
}

export function parseGeminiPackageText(text: string): GeneratedEventPackageDraft {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new PackageGenerationError(
      PACKAGE_FALLBACK_REASONS.invalidJson,
      "Gemini package response was not valid JSON",
    );
  }
  const parsed = generatedEventPackageSchema.safeParse(json);
  if (!parsed.success) {
    throw new PackageGenerationError(
      PACKAGE_FALLBACK_REASONS.schemaMismatch,
      "Gemini package response did not match the draft schema",
    );
  }
  return parsed.data;
}

export function packagePromptVersion(): string {
  return `${PACKAGE_PROMPT_VERSION}|${getServerEnv().AI_PROMPT_VERSION}`;
}

export function buildPackageGenerationInput(
  state: GameState,
  event: ActiveEvent,
  recentDecisions: PackageGenerationInput["recentDecisions"] = [],
): PackageGenerationInput {
  const stats = getEffectiveStats(state);
  const battleDay = nextBattleDay(state.day);
  const nextWave = gameConfig.waves.find((wave) => wave.day === battleDay);
  return {
    locale: "en-US",
    promptVersion: packagePromptVersion(),
    slot: {
      day: state.day,
      decade: Math.max(1, Math.ceil(state.day / 10)),
      difficulty: state.difficulty,
      kind: event.isConsequence ? "consequence" : "scheduled",
      ...(event.originEventId ? { originEventId: event.originEventId } : {}),
      ...(event.originChoiceId ? { originChoiceId: event.originChoiceId } : {}),
    },
    city: {
      hp: state.cityHp,
      maxHp: state.cityMaxHp,
      gold: state.gold,
      wallLevel: state.wallLevel,
      troopLevel: state.troopLevel,
      cityLevel: state.cityLevel,
      attack: stats.attack,
      defense: stats.defense,
    },
    threat: {
      nextWave: nextWave?.wave ?? null,
      nextBattleDay: battleDay,
      nextEnemyName: nextWave?.name ?? null,
    },
    activeEffects: state.effects,
    recentDecisions,
    supportedEffects: [
      "grantGold",
      "damageCity",
      "healCity",
      "maxHpBonus",
      "nextWaveDefense",
      "upgradeDiscount",
    ],
    rules: {
      choiceCount: "2-4",
      requireFreeChoice: true,
      goldCostMeaning: "base-before-difficulty",
      consequencePolicy: resolveIncomingConsequencePolicy(state, event),
      consequenceDepth: 1,
    },
  };
}

export function overlayPackageNarrative(
  base: EventPackage,
  narrative: { title: string; description: string; choices: Array<{ id: string; label: string }> },
): EventPackage {
  return {
    ...base,
    title: narrative.title,
    description: narrative.description,
    choices: base.choices.map((choice) => ({
      ...choice,
      label: narrative.choices.find((entry) => entry.id === choice.id)?.label ?? choice.label,
    })),
  };
}

function choiceId(value: string, index: number): string {
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  return cleaned.slice(0, 80) || `choice-${index + 1}`;
}

export function canonicalizeEventPackage(
  draft: GeneratedEventPackageDraft,
  slot: { eventId: string; day: number; isConsequence: boolean },
): EventPackage {
  const decade = Math.max(1, Math.ceil(slot.day / 10));
  const packageId = slot.isConsequence ? `ai:cons:${slot.eventId}` : `ai:${slot.eventId}`;
  const seen = new Set<string>();
  const choices = draft.choices.map((choice, index) => {
    let id = choiceId(choice.id, index);
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    const effects = choice.effects as Effect[];
    if (!choice.consequence || slot.isConsequence) {
      return { id, label: choice.label, goldCost: choice.goldCost, effects };
    }
    const followId = `ai:cons:${slot.eventId}:${id}`;
    const followSeen = new Set<string>();
    const followChoices = choice.consequence.fallbackPackage.choices.map((follow, followIndex) => {
      let followChoiceId = choiceId(follow.id, followIndex);
      while (followSeen.has(followChoiceId)) followChoiceId = `${followChoiceId}-${followIndex + 1}`;
      followSeen.add(followChoiceId);
      return {
        id: followChoiceId,
        label: follow.label,
        goldCost: follow.goldCost,
        effects: follow.effects as Effect[],
      };
    });
    return {
      id,
      label: choice.label,
      goldCost: choice.goldCost,
      effects,
      consequence: {
        packageId: followId,
        minDelayDays: choice.consequence.minDelayDays,
        maxDelayDays: choice.consequence.maxDelayDays,
        ...(choice.consequence.targetWave != null ? { targetWave: choice.consequence.targetWave } : {}),
        fallbackPackage: {
          packageId: followId,
          eventId: followId,
          decade,
          title: choice.consequence.fallbackPackage.title,
          description: choice.consequence.fallbackPackage.description,
          choices: followChoices,
        },
      },
    };
  });
  return {
    packageId,
    eventId: slot.eventId,
    decade,
    title: draft.title,
    description: draft.description,
    choices,
  };
}

export function fingerprintPackage(pkg: EventPackage): string {
  return createHash("sha256").update(JSON.stringify(pkg)).digest("hex");
}

export type PackageGenerationResult = {
  source: "ai" | "fallback";
  pkg: EventPackage | null;
  provider: string | null;
  model: string | null;
  promptVersion: string;
  fallbackReason?: string;
};

function defaultPackageGenerator(): EventPackageGenerator | null {
  const env = getServerEnv();
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL || env.AI_PROVIDER !== "gemini") return null;
  return new GeminiEventPackageGenerator();
}

export async function generateEventPackage(
  state: GameState,
  event: ActiveEvent,
  generator: EventPackageGenerator | null = defaultPackageGenerator(),
  recentDecisions: PackageGenerationInput["recentDecisions"] = [],
): Promise<PackageGenerationResult> {
  const promptVersion = packagePromptVersion();
  const input = buildPackageGenerationInput(state, event, recentDecisions);
  const policy = input.rules.consequencePolicy;
  console.info("Event package consequence policy", {
    eventId: event.eventId,
    day: event.day,
    isConsequence: Boolean(event.isConsequence),
    policy,
  });
  if (!generator) {
    return {
      source: "fallback",
      pkg: null,
      provider: null,
      model: null,
      promptVersion,
      fallbackReason: "provider-unconfigured",
    };
  }
  try {
    const draft = generatedEventPackageSchema.parse(await generator.generate(input));
    const canonical = canonicalizeEventPackage(draft, {
      eventId: event.eventId,
      day: event.day,
      isConsequence: Boolean(event.isConsequence),
    });
    const validated = validateEventPackage(canonical, {
      day: event.day,
      wavesCleared: state.wavesCleared,
      allowConsequence: !event.isConsequence,
      checkDominance: true,
      enforceWaveTiming: true,
      enforceDecade: true,
      requireAtLeastOneConsequence: policy === "required",
    });
    if (!validated.ok) {
      const policyFailure = validated.message === CONSEQUENCE_REQUIRED_MESSAGE;
      throw new PackageGenerationError(
        policyFailure ? PACKAGE_FALLBACK_REASONS.consequencePolicyFailed : PACKAGE_FALLBACK_REASONS.packageRejected,
        validated.message,
      );
    }
    const unschedulable = validated.pkg.choices.some(
      (choice) => choice.consequence != null && !canScheduleConsequence(state, choice.consequence),
    );
    if (unschedulable) {
      throw new PackageGenerationError(
        PACKAGE_FALLBACK_REASONS.consequencePolicyFailed,
        UNSCHEDULABLE_CONSEQUENCE_MESSAGE,
      );
    }
    console.info("Event package accepted", {
      eventId: event.eventId,
      day: event.day,
      isConsequence: Boolean(event.isConsequence),
      policy,
      consequenceChoiceCount: validated.pkg.choices.filter((choice) => choice.consequence).length,
      source: "ai",
    });
    return {
      source: "ai",
      pkg: validated.pkg,
      provider: generator.provider,
      model: generator.model,
      promptVersion,
    };
  } catch (error) {
    const fallbackReason = fallbackReasonFor(error);
    const httpStatus = providerHttpStatus(error);
    console.warn("Event package generation failed; using local package", {
      eventId: event.eventId,
      day: event.day,
      isConsequence: Boolean(event.isConsequence),
      policy,
      provider: generator.provider,
      model: generator.model,
      promptVersion,
      httpStatus: httpStatus ?? null,
      fallbackReason,
      error: error instanceof Error ? error.name : "UnknownError",
      message: sanitizeProviderMessage(error, getServerEnv().GEMINI_API_KEY),
    });
    return {
      source: "fallback",
      pkg: null,
      provider: generator.provider,
      model: generator.model,
      promptVersion,
      fallbackReason,
    };
  }
}

export function providerHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("status" in error)) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && Number.isFinite(status) ? status : undefined;
}

/** HTTP 400, or a status-less INVALID_ARGUMENT message. Other statuses stay provider-error. */
export function isProviderInvalidArgument(error: unknown): boolean {
  const status = providerHttpStatus(error);
  if (status != null) return status === 400;
  const message = error instanceof Error ? error.message : "";
  return /\bINVALID_ARGUMENT\b/.test(message);
}

export function sanitizeProviderMessage(error: unknown, secret?: string): string {
  const raw = error instanceof Error ? error.message : "";
  let text = raw.replace(/\s+/g, " ").trim().slice(0, 180);
  if (secret) text = text.split(secret).join("[redacted]");
  return text.replace(/AIza[0-9A-Za-z_-]{10,}/g, "[redacted]");
}

function fallbackReasonFor(error: unknown): PackageFallbackReason {
  if (error instanceof PackageGenerationError) return error.fallbackReason;
  if (error instanceof z.ZodError) return PACKAGE_FALLBACK_REASONS.schemaMismatch;
  if (isProviderInvalidArgument(error)) return PACKAGE_FALLBACK_REASONS.providerInvalidArgument;
  return PACKAGE_FALLBACK_REASONS.providerError;
}

export function packageSnapshotFrom(
  pkg: EventPackage,
  meta: Omit<PackageSnapshotDocument, "schemaVersion" | "package" | "contentFingerprint">,
): PackageSnapshotDocument {
  return {
    schemaVersion: 1,
    package: pkg,
    contentFingerprint: fingerprintPackage(pkg),
    ...meta,
  };
}

/** A committed snapshot wins over a later provider response. */
export function preferCommittedSnapshot<T>(committed: T | null | undefined, incoming: T): T {
  return committed ?? incoming;
}
