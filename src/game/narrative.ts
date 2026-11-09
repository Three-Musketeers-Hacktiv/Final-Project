import type { ActiveEvent, GameState } from "./types";

export type EventNarrativeOverlay = {
  title: string;
  description: string;
  choices: Array<{ id: string; label: string }>;
  source: ActiveEvent["source"];
};

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
        label: labels.get(choice.id) ?? choice.label,
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
