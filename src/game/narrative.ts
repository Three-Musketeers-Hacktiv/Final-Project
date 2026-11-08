import type { ActiveEvent, GameState } from "./types";

export type EventNarrativeOverlay = {
  title: string;
  description: string;
  choices: [{ id: string; label: string }, { id: string; label: string }];
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
      choices: [
        { ...event.choices[0], label: labels.get(event.choices[0].id) ?? event.choices[0].label },
        { ...event.choices[1], label: labels.get(event.choices[1].id) ?? event.choices[1].label },
      ],
      source: overlay.source,
    },
  };
}
