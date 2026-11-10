import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { getServerEnv } from "@/server/config/env";
import type { GameState } from "@/server/game-engine/adapter";
import { trustedChoiceLabel } from "../../../src/game/narrative";
import { SCENE_PROMPT_VERSION, type NarrativeContext } from "./narrative-context";

type ActiveEvent = NonNullable<GameState["activeEvent"]>;

export const generatedEventNarrativeSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1200),
  choices: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1).max(240),
  }).strict()).min(2).max(4),
}).strict();

/**
 * Gemini structured-output accepts a JSON Schema subset.
 * Avoid minLength/maxLength/additionalProperties — they cause 400 Bad Request.
 * Length and strict shape are enforced by Zod after the response.
 */
const generatedEventNarrativeJsonSchema = {
  type: "object",
  required: ["title", "description", "choices"],
  propertyOrdering: ["title", "description", "choices"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    choices: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        required: ["id", "label"],
        propertyOrdering: ["id", "label"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
        },
      },
    },
  },
} as const;

/** Gemini rejects manually set deadlines below 10s. */
const GEMINI_MIN_DEADLINE_MS = 10_000;

export type GeneratedEventNarrative = z.infer<typeof generatedEventNarrativeSchema>;
export type NarrativeResult = {
  narrative: GeneratedEventNarrative;
  source: "ai" | "fallback" | "mock";
  provider: string | null;
  model: string | null;
  promptVersion: string;
};

export const SCENE_SYSTEM_INSTRUCTION =
  "You are the city advisor speaking to the lord in English. Write the event as a scene happening now: who is involved, where, what is going wrong, and why a decision is needed today. Tie every choice label to that same scene as a concrete action the lord can order. Do not invent choices, costs, effects, or outcomes. Do not mention gold, coin, coins, treasury, or gp in labels; the cost is shown separately. Do not say \"wave\", \"upgrade discount\", \"Max HP\", \"consequence\", or \"choose carefully\". Describe the coming battle by nextEnemyName when provided. Use city.hpBand and city.goldBand only for tone, never invent numbers. For consequence events, refer only to the supplied origin decision. Preserve every event.trustedChoices id exactly. Prefer two to four short sentences. Address \"my lord\" at most once.";

export interface EventNarrativeGenerator {
  generate(event: ActiveEvent, context?: NarrativeContext): Promise<GeneratedEventNarrative>;
  readonly provider: string;
  readonly model: string | null;
}

export class GeminiEventNarrativeGenerator implements EventNarrativeGenerator {
  readonly provider = "gemini";
  readonly model: string;
  private readonly client: GoogleGenAI;

  constructor() {
    const env = getServerEnv();
    if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) {
      throw new Error("Gemini event runtime is not configured");
    }

    this.model = env.GEMINI_MODEL;
    this.client = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: {
        timeout: Math.max(env.AI_TIMEOUT_MS, GEMINI_MIN_DEADLINE_MS),
        retryOptions: {
          attempts: env.AI_MAX_RETRIES + 1,
          httpStatusCodes: [408, 429, 500, 502, 503, 504],
        },
      },
    });
  }

  async generate(event: ActiveEvent, context?: NarrativeContext): Promise<GeneratedEventNarrative> {
    const env = getServerEnv();
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: JSON.stringify(context ?? {
        locale: "en-US",
        promptVersion: SCENE_PROMPT_VERSION,
        event: {
          eventId: event.eventId,
          packageId: event.packageId,
          isConsequence: event.isConsequence ?? false,
          originalTitle: event.title,
          originalDescription: event.description,
          trustedChoices: event.choices.map((choice) => ({
            id: choice.id,
            goldCost: choice.goldCost,
            effects: choice.effects,
            engineLabel: choice.label,
          })),
        },
      }),
      config: {
        systemInstruction: SCENE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseJsonSchema: generatedEventNarrativeJsonSchema,
        maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS,
      },
    });

    if (!response.text) throw new Error("Gemini response did not contain event output");
    return generatedEventNarrativeSchema.parse(JSON.parse(response.text));
  }
}

function fallbackNarrative(event: ActiveEvent): GeneratedEventNarrative {
  return {
    title: event.title,
    description: event.description,
    choices: event.choices.map((choice) => ({ id: choice.id, label: choice.label })),
  };
}

function validateTrustedChoiceIds(event: ActiveEvent, narrative: GeneratedEventNarrative): void {
  const trusted = new Set(event.choices.map((choice) => choice.id));
  const generated = narrative.choices.map((choice) => choice.id);
  if (
    trusted.size !== generated.length ||
    new Set(generated).size !== generated.length ||
    generated.some((id) => !trusted.has(id))
  ) {
    throw new Error("Generated event contains untrusted choice ids");
  }
}

export function restoreEventNarrative(
  event: ActiveEvent,
  narrative: unknown,
  metadata: Omit<NarrativeResult, "narrative">,
): NarrativeResult {
  const parsed = generatedEventNarrativeSchema.parse(narrative);
  validateTrustedChoiceIds(event, parsed);
  return { narrative: parsed, ...metadata };
}

function defaultGenerator(): EventNarrativeGenerator | null {
  const env = getServerEnv();
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) return null;

  switch (env.AI_PROVIDER) {
    case "gemini":
      return new GeminiEventNarrativeGenerator();
  }
}

export async function generateEventNarrative(
  event: ActiveEvent,
  generator: EventNarrativeGenerator | null = defaultGenerator(),
  context?: NarrativeContext,
): Promise<NarrativeResult> {
  const promptVersion = SCENE_PROMPT_VERSION;
  if (generator) {
    try {
      const narrative = generatedEventNarrativeSchema.parse(await generator.generate(event, context));
      validateTrustedChoiceIds(event, narrative);
      return {
        narrative,
        source: "ai",
        provider: generator.provider,
        model: generator.model,
        promptVersion,
      };
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error
          ? (error as { status?: unknown }).status
          : undefined;
      console.warn("Event narrative generation failed; using fallback", {
        eventId: event.eventId,
        provider: generator.provider,
        model: generator.model,
        error: error instanceof Error ? error.name : "UnknownError",
        status,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    narrative: fallbackNarrative(event),
    source: "fallback",
    provider: null,
    model: null,
    promptVersion,
  };
}

export function decorateActiveEvent(state: GameState, result: NarrativeResult): GameState {
  const event = state.activeEvent;
  if (!event) return state;
  const labels = new Map(result.narrative.choices.map((choice) => [choice.id, choice.label]));
  return {
    ...state,
    activeEvent: {
      ...event,
      title: result.narrative.title,
      description: result.narrative.description,
      choices: event.choices.map((choice) => ({
        ...choice,
        label: trustedChoiceLabel(choice.label, labels.get(choice.id), choice.goldCost),
      })),
      source: result.source,
    },
  };
}
