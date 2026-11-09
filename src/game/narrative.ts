import type { ActiveEvent, GameState } from "./types";

export type EventNarrativeOverlay = {
  title: string;
  description: string;
  choices: Array<{ id: string; label: string }>;
  source: ActiveEvent["source"];
};

const CURRENCY_WORD = "(?:gold|coins?|treasury|gp)";
const DIGIT_THEN_CURRENCY = new RegExp(`\\d+\\s*[+:\\-]?\\s*${CURRENCY_WORD}\\b`, "i");
const CURRENCY_THEN_DIGIT = new RegExp(`\\b${CURRENCY_WORD}\\b\\s*[+:\\-]?\\s*\\d+`, "i");

const WRITTEN_AMOUNTS = new Set([
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty", "sixty", "seventy",
  "eighty", "ninety", "hundred",
]);

/** True when an overlay label states a currency amount (any order, digits, or written number). */
export function labelStatesCurrencyAmount(label: string): boolean {
  if (DIGIT_THEN_CURRENCY.test(label) || CURRENCY_THEN_DIGIT.test(label)) return true;
  const tokens = label.toLowerCase().replace(/-/g, " ").split(/[^a-z]+/).filter(Boolean);
  for (let index = 0; index < tokens.length; index += 1) {
    if (!/^(gold|coin|coins|treasury|gp)$/.test(tokens[index]!)) continue;
    const start = Math.max(0, index - 4);
    const end = Math.min(tokens.length, index + 5);
    for (let near = start; near < end; near += 1) {
      if (near !== index && WRITTEN_AMOUNTS.has(tokens[near]!)) return true;
    }
  }
  return false;
}

/**
 * Overlay labels must not state a currency amount. The client shows `goldCost`.
 * `goldCost` is unused for matching: a matching number is still a price claim.
 */
export function choiceLabelRespectsGoldCost(label: string, _goldCost: number): boolean {
  return !labelStatesCurrencyAmount(label);
}

export function trustedChoiceLabel(engineLabel: string, overlayLabel: string | undefined, goldCost: number): string {
  if (!overlayLabel) return engineLabel;
  return choiceLabelRespectsGoldCost(overlayLabel, goldCost) ? overlayLabel : engineLabel;
}

/** Apply trusted narrative overlay onto the active event without touching costs/effects. */
export function decorateActiveEvent(
  state: GameState,
  overlay: EventNarrativeOverlay,
): GameState {
  const event = state.activeEvent;
  if (!event) return state;
  const labels = new Map(overlay.choices.map((choice) => [choice.id, choice.label]));
  return {
    ...state,
    activeEvent: {
      ...event,
      title: overlay.title,
      description: overlay.description,
      choices: event.choices.map((choice) => ({
        ...choice,
        label: trustedChoiceLabel(choice.label, labels.get(choice.id), choice.goldCost),
      })),
      source: overlay.source,
    },
  };
}

export function narrativeChoiceIdsMatch(state: GameState, overlay: EventNarrativeOverlay): boolean {
  const event = state.activeEvent;
  if (!event) return false;
  if (overlay.choices.length < 2 || overlay.choices.length > 4) return false;
  if (overlay.choices.length !== event.choices.length) return false;
  const overlayIds = new Set(overlay.choices.map((choice) => choice.id));
  return event.choices.every((choice) => overlayIds.has(choice.id));
}
