import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { GameState } from "@/server/game-engine/adapter";
import { getServerEnv } from "@/server/config/env";

type ActiveEvent = NonNullable<GameState["activeEvent"]>;

export const generatedEventNarrativeSchema = z.object({
  title: z.string(),
  description: z.string(),
  choices: z.tuple([
    z.object({ id: z.string(), label: z.string() }),
    z.object({ id: z.string(), label: z.string() }),
  ]),
});

export type GeneratedEventNarrative = z.infer<typeof generatedEventNarrativeSchema>;
export type NarrativeResult = {
  narrative: GeneratedEventNarrative;
  source: "ai" | "fallback";
  model: string | null;
  promptVersion: string;
};

export interface EventNarrativeGenerator {
  generate(event: ActiveEvent): Promise<GeneratedEventNarrative>;
  readonly model: string | null;
}

class OpenAiEventNarrativeGenerator implements EventNarrativeGenerator {
  readonly model: string;
  private readonly client: OpenAI;

  constructor() {
    const env = getServerEnv();
    if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) throw new Error("OpenAI event runtime is not configured");
    this.model = env.OPENAI_MODEL;
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: env.OPENAI_TIMEOUT_MS,
      maxRetries: env.OPENAI_MAX_RETRIES,
    });
  }

  async generate(event: ActiveEvent): Promise<GeneratedEventNarrative> {
    const env = getServerEnv();
    const trustedChoices = event.choices.map((choice) => ({
      id: choice.id,
      goldCost: choice.goldCost,
      effects: choice.effects,
    }));
    const response = await this.client.responses.parse({
      model: this.model,
      max_output_tokens: env.OPENAI_MAX_OUTPUT_TOKENS,
      input: [
        {
          role: "system",
          content:
            "Write a concise Indonesian fantasy city-defense event. Preserve every supplied choice id exactly. Do not add choices, costs, effects, or gameplay rules.",
        },
        {
          role: "user",
          content: JSON.stringify({
            locale: "id-ID",
            day: event.day,
            eventId: event.eventId,
            originalTitle: event.title,
            originalDescription: event.description,
            trustedChoices,
          }),
        },
      ],
      text: { format: zodTextFormat(generatedEventNarrativeSchema, "event_narrative") },
    });

    if (!response.output_parsed) throw new Error("OpenAI response did not contain parsed event output");
    return response.output_parsed;
  }
}

function fallbackNarrative(event: ActiveEvent): GeneratedEventNarrative {
  return {
    title: event.title,
    description: event.description,
    choices: [
      { id: event.choices[0].id, label: event.choices[0].label },
      { id: event.choices[1].id, label: event.choices[1].label },
    ],
  };
}

function validateTrustedChoiceIds(event: ActiveEvent, narrative: GeneratedEventNarrative): void {
  const trusted = new Set(event.choices.map((choice) => choice.id));
  const generated = narrative.choices.map((choice) => choice.id);
  if (new Set(generated).size !== 2 || generated.some((id) => !trusted.has(id))) {
    throw new Error("Generated event contains untrusted choice ids");
  }
}

function defaultGenerator(): EventNarrativeGenerator | null {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) return null;
  return new OpenAiEventNarrativeGenerator();
}

export async function generateEventNarrative(
  event: ActiveEvent,
  generator: EventNarrativeGenerator | null = defaultGenerator(),
): Promise<NarrativeResult> {
  const promptVersion = getServerEnv().OPENAI_PROMPT_VERSION;
  if (generator) {
    try {
      const narrative = generatedEventNarrativeSchema.parse(await generator.generate(event));
      validateTrustedChoiceIds(event, narrative);
      return { narrative, source: "ai", model: generator.model, promptVersion };
    } catch (error) {
      console.warn("Event narrative generation failed; using fallback", {
        eventId: event.eventId,
        error: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  return { narrative: fallbackNarrative(event), source: "fallback", model: null, promptVersion };
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
      choices: [
        { ...event.choices[0], label: labels.get(event.choices[0].id) ?? event.choices[0].label },
        { ...event.choices[1], label: labels.get(event.choices[1].id) ?? event.choices[1].label },
      ],
      source: result.source,
    },
  };
}
