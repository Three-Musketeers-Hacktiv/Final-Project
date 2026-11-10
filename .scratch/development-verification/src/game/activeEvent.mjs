import { scaleEventGoldCost } from "./difficulty.mjs";
export function validateChoiceList(pkg) {
    const count = pkg.choices.length;
    if (count < 2 || count > 4)
        return false;
    const ids = new Set(pkg.choices.map((choice) => choice.id));
    if (ids.size !== pkg.choices.length)
        return false;
    return pkg.choices.some((choice) => choice.goldCost === 0);
}
/** Fill trusted `{goldCost}` placeholders with the already-scaled cost. */
export function materializeChoiceLabel(label, goldCost) {
    if (!label.includes("{goldCost}"))
        return label;
    return label.replaceAll("{goldCost}", String(goldCost));
}
/** Map trusted package choices into active-event choices with difficulty-scaled goldCost. */
export function scaleChoicesForDifficulty(choices, difficulty) {
    return choices.map((choice) => {
        const goldCost = scaleEventGoldCost(choice.goldCost, difficulty);
        return {
            ...choice,
            effects: [...choice.effects],
            goldCost,
            label: materializeChoiceLabel(choice.label, goldCost),
        };
    });
}
export function toActiveEvent(pkg, source = "local", day, difficulty = "normal") {
    return {
        eventId: pkg.eventId,
        packageId: pkg.packageId,
        day: day ?? 0,
        title: pkg.title,
        description: pkg.description,
        choices: scaleChoicesForDifficulty(pkg.choices, difficulty),
        source,
    };
}
export function toConsequenceActiveEvent(pkg, pending, day, source = "local", difficulty = "normal") {
    return {
        ...toActiveEvent(pkg, source, day, difficulty),
        eventId: pending.id,
        packageId: pending.packageId,
        isConsequence: true,
        originEventId: pending.originEventId,
        originChoiceId: pending.originChoiceId,
    };
}
