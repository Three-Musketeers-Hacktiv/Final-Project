import type { Effect, EventChoice } from "../../../src/game/types";
import { packageById, seedKeyFor, type FallbackEventSource, type FallbackKind } from "./fallback-catalog";
import { CONSEQUENCE_SLOTS, SCHEDULED_SLOTS } from "./fallback-catalog";

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

function has(choice: EventChoice, type: Effect["type"]): boolean {
  return choice.effects.some((effect) => effect.type === type);
}

function baseLabel(choice: EventChoice): string {
  if (has(choice, "nextWaveDefense")) return "Brace the defenses before the next assault";
  if (has(choice, "upgradeDiscount")) return "Secure cheaper works until the coming battle";
  if (has(choice, "maxHpBonus")) return "Raise the city's lasting endurance";
  if (has(choice, "healCity")) return "Tend the wounded and restore strength";
  if (has(choice, "grantGold") && choice.consequence) return "Take the surplus now, knowing the slight may return";
  if (has(choice, "grantGold")) return "Accept the surplus offered today";
  if (has(choice, "damageCity") && choice.goldCost === 0) return "Endure the harm rather than spend now";
  if (choice.goldCost > 0 && choice.effects.length === 0) return "Settle the matter cleanly before it spreads";
  if (choice.goldCost > 0) return "Pay the levy and take the firmer path";
  if (choice.consequence) return "Let it pass, though trouble may return before the next assault";
  return "Hold your answer and keep the city as it stands";
}

function labelFor(choice: EventChoice, day: number, index: number): string {
  const clause = DAY_CLAUSE[day] ?? "while the city waits";
  const steer = index === 0 ? "I advise this first" : index === 1 ? "This is the sterner counsel" : "This is the quieter counsel";
  return `${baseLabel(choice)}, ${clause}. ${steer}.`;
}

function titleFor(packageTitle: string, day: number, kind: FallbackKind): string {
  const cleaned = packageTitle.replace(/\d+/g, "").replace(/\s+/g, " ").trim();
  const when = DAY_CLAUSE[day] ?? "while the city waits";
  const prefix = kind === "consequence" ? "Consequence" : "Counsel";
  return `${prefix}: ${cleaned}, ${when}`.slice(0, 120);
}

function descriptionFor(packageDescription: string, day: number): string {
  const cleaned = packageDescription
    .replace(/\b(?:gold|coins?|treasury|gp)\b/gi, "resources")
    .replace(/\d+/g, "")
    .replace(/\{[^}]+\}/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
  const when = DAY_CLAUSE[day] ?? "while the city waits";
  return `My lord, ${when}, a matter demands your word. ${cleaned} I will not invent new powers; only these trusted paths remain.`;
}

export function composeFallbackEvents(): FallbackEventSource[] {
  const slots: Array<{ packageId: string; day: number; kind: FallbackKind }> = [
    ...SCHEDULED_SLOTS.flatMap((slot) => slot.days.map((day) => ({ ...slot, day, kind: "scheduled" as const }))),
    ...CONSEQUENCE_SLOTS.flatMap((slot) => slot.days.map((day) => ({ ...slot, day, kind: "consequence" as const }))),
  ].map(({ packageId, day, kind }) => ({ packageId, day, kind }));

  return slots.map((slot) => {
    const pkg = packageById(slot.packageId);
    if (!pkg) throw new Error(`Missing package ${slot.packageId}`);
    return {
      seedKey: seedKeyFor(slot.packageId, slot.day),
      packageId: slot.packageId,
      day: slot.day,
      kind: slot.kind,
      narrative: {
        title: titleFor(pkg.title, slot.day, slot.kind),
        description: descriptionFor(pkg.description, slot.day),
        choices: pkg.choices.map((choice, index) => ({
          id: choice.id,
          label: labelFor(choice, slot.day, index),
        })),
      },
    };
  });
}
