const CURRENCY_TERM = /\b(?:gold|coins?|treasury|gp)\b/i;
/**
 * True when an overlay label mentions a supported currency term.
 * Any mention falls back to the engine label; price stays on `goldCost`.
 */
export function labelStatesCurrencyAmount(label) {
    return CURRENCY_TERM.test(label);
}
/**
 * Overlay labels must not mention a supported currency term. The client shows `goldCost`.
 * `goldCost` is unused: a matching number is still not trusted inside the label.
 */
export function choiceLabelRespectsGoldCost(label, _goldCost) {
    return !labelStatesCurrencyAmount(label);
}
export function trustedChoiceLabel(engineLabel, overlayLabel, goldCost) {
    if (!overlayLabel)
        return engineLabel;
    return choiceLabelRespectsGoldCost(overlayLabel, goldCost) ? overlayLabel : engineLabel;
}
/** Apply trusted narrative overlay onto the active event without touching costs/effects. */
export function decorateActiveEvent(state, overlay) {
    const event = state.activeEvent;
    if (!event)
        return state;
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
export function narrativeChoiceIdsMatch(state, overlay) {
    const event = state.activeEvent;
    if (!event)
        return false;
    if (overlay.choices.length < 2 || overlay.choices.length > 4)
        return false;
    if (overlay.choices.length !== event.choices.length)
        return false;
    const overlayIds = new Set(overlay.choices.map((choice) => choice.id));
    return event.choices.every((choice) => overlayIds.has(choice.id));
}
