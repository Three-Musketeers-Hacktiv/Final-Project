import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { getServerEnv } from "@/server/config/env";
import type { GameState } from "@/server/game-engine/adapter";
import { trustedChoiceLabel } from "../../../src/game/narrative";

type ActiveEvent = NonNullable<GameState["activeEvent"]>;

export const generatedEventNarrativeSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1200),
  choices: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1).max(240),
  }).strict()).min(2).max(4),
}).strict();

const generatedEventNarrativeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "choices"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 120 },
    description: { type: "string", minLength: 1, maxLength: 1200 },
    choices: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label"],
        properties: {
          id: { type: "string", minLength: 1 },
          label: { type: "string", minLength: 1, maxLength: 240 },
        },
      },
    },
  },
} as const;

export type GeneratedEventNarrative = z.infer<typeof generatedEventNarrativeSchema>;
export type NarrativeResult = {
  narrative: GeneratedEventNarrative;
  source: "ai" | "fallback" | "mock";
  provider: string | null;
  model: string | null;
  promptVersion: string;
};

export interface EventNarrativeGenerator {
  generate(event: ActiveEvent): Promise<GeneratedEventNarrative>;
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
        timeout: env.AI_TIMEOUT_MS,
        retryOptions: {
          attempts: env.AI_MAX_RETRIES + 1,
          httpStatusCodes: [408, 429, 500, 502, 503, 504],
        },
      },
    });
  }

  async generate(event: ActiveEvent): Promise<GeneratedEventNarrative> {
    const env = getServerEnv();
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: JSON.stringify({
        locale: "en-US",
        day: event.day,
        eventId: event.eventId,
        packageId: event.packageId,
        isConsequence: event.isConsequence ?? false,
        originEventId: event.originEventId ?? null,
        originChoiceId: event.originChoiceId ?? null,
        originalTitle: event.title,
        originalDescription: event.description,
        trustedChoices: event.choices.map((choice) => ({
          id: choice.id,
          goldCost: choice.goldCost,
          effects: choice.effects,
        })),
      }),
      config: {
        systemInstruction:
          "Provide the narrative and choices as if a loyal city advisor is recommending options to his lord, using English. Address the player as \"my lord\". Preserve every supplied choice id exactly. Do not invent choices, change gold costs, invent effects, or invent gameplay rules. Choice labels may be rephrased, but do not state a gold amount in the label. The effective cost is trustedChoices[].goldCost and is shown separately by the client.",
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
): Promise<NarrativeResult> {
  const promptVersion = getServerEnv().AI_PROMPT_VERSION;
  if (generator) {
    try {
      const narrative = generatedEventNarrativeSchema.parse(await generator.generate(event));
      validateTrustedChoiceIds(event, narrative);
      return {
        narrative,
        source: "ai",
        provider: generator.provider,
        model: generator.model,
        promptVersion,
      };
    } catch (error) {
      console.warn("Event narrative generation failed; using fallback", {
        eventId: event.eventId,
        provider: generator.provider,
        model: generator.model,
        error: error instanceof Error ? error.name : "UnknownError",
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
