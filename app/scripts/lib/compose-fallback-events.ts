import { packageById, seedKeyFor, type FallbackEventSource, type FallbackKind } from "./fallback-catalog";
import { CONSEQUENCE_SLOTS, SCHEDULED_SLOTS } from "./fallback-catalog";
import { FALLBACK_SCENES } from "./fallback-scenes";

const DAY_CLAUSE: Record<number, string> = {
  3: "while the dawn watch is still thin",
  4: "before the market fully wakes",
  5: "as smoke stains the lower streets",
  6: "under a pale and watchful sky",
  7: "with rumors already at the gate",
  8: "after a sleepless night on the walls",
  9: "on the eve of the first assault",
  12: "as caravans crowd the south road",
  13: "while guild banners argue in the square",
  14: "beneath a hard afternoon sun",
  15: "as omens stir the chapel yard",
  16: "with the second watch changing",
  17: "before dusk closes the gates",
  18: "as torches are counted for the night",
  23: "in the uneasy quiet after the last battle",
  26: "while merchants test your patience",
  33: "as the mid-campaign roads grow bold",
  34: "with unrest moving through the stalls",
  35: "as raiders probe the outer farms",
  36: "when every bargain carries a hook",
  43: "with the horizon darkening toward the wyvern days",
  44: "as the city grumbles under short rations",
  45: "while scouts report fresh tracks",
  46: "as the market splits into factions",
  53: "deep in the long campaign",
  56: "while captains and merchants quarrel",
  63: "as late-war fear reaches the walls",
  64: "with the streets one insult from riot",
  65: "as night raids grow more daring",
  66: "when favor is bought with promises",
  73: "under the shadow of the demon marches",
  74: "as the last loyal districts grow thin",
  75: "while the outer watch burns low",
  83: "as the finale road comes into view",
  84: "with the city holding its breath",
  85: "as the last raiders circle wide",
  86: "while the final markets hoard their goods",
  93: "on the last stretch before the king of demons",
  94: "as even loyal voices turn sharp",
  95: "with the final assault almost upon us",
};

function sceneFor(packageId: string) {
  const scene = FALLBACK_SCENES[packageId];
  if (!scene) throw new Error(`Missing fallback scene for ${packageId}`);
  return scene;
}

export function composeFallbackEvents(): FallbackEventSource[] {
  const slots: Array<{ packageId: string; day: number; kind: FallbackKind }> = [
    ...SCHEDULED_SLOTS.flatMap((slot) => slot.days.map((day) => ({ ...slot, day, kind: "scheduled" as const }))),
    ...CONSEQUENCE_SLOTS.flatMap((slot) => slot.days.map((day) => ({ ...slot, day, kind: "consequence" as const }))),
  ];

  return slots.map((slot) => {
    const pkg = packageById(slot.packageId);
    if (!pkg) throw new Error(`Missing package ${slot.packageId}`);
    const scene = sceneFor(slot.packageId);
    const when = DAY_CLAUSE[slot.day] ?? "while the city waits";
    const body = scene.description.replace(/^My lord,\s*/i, "");
    const sentence = body.charAt(0).toUpperCase() + body.slice(1);
    const missing = pkg.choices.filter((choice) => !scene.choices[choice.id]);
    if (missing.length > 0) {
      throw new Error(`Scene ${slot.packageId} missing choices: ${missing.map((choice) => choice.id).join(", ")}`);
    }
    return {
      seedKey: seedKeyFor(slot.packageId, slot.day),
      packageId: slot.packageId,
      day: slot.day,
      kind: slot.kind,
      narrative: {
        title: `${scene.title}, ${when}`.slice(0, 120),
        description: `My lord, ${when}. ${sentence}`,
        choices: pkg.choices.map((choice) => ({
          id: choice.id,
          label: scene.choices[choice.id]!,
        })),
      },
    };
  });
}
