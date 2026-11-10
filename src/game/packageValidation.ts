import { eventPackageById, gameConfig } from "./config";
import type { ChoiceConsequence, Effect, EventChoice, EventPackage } from "./types";

/** Anti-overflow bounds. They are not theme or catalog limits. */
export const PACKAGE_LIMITS = {
  maxGoldCost: 10_000,
  maxEffectAmount: 10_000,
  minDelayDays: 1,
  maxDelayDays: 30,
  maxIdLength: 120,
  maxTitleLength: 160,
  maxDescriptionLength: 2_000,
  maxLabelLength: 240,
} as const;

export type PackageValidationContext = {
  day: number;
  wavesCleared: number;
  /** Scheduled packages may declare one follow-up. Consequence packages may not. */
  allowConsequence: boolean;
  /** Reject a strictly more expensive choice with the same effects and consequence. */
  checkDominance?: boolean;
  /** Reject wave targets that are already in the past relative to this day. */
  enforceWaveTiming?: boolean;
  /** When false, decade is only range-checked. Shifted slots may outlive the original decade. */
  enforceDecade?: boolean;
};

export type PackageValidationResult =
  | { ok: true; pkg: EventPackage }
  | { ok: false; message: string };

const EFFECT_TYPES = new Set([
  "grantGold",
  "damageCity",
  "healCity",
  "maxHpBonus",
  "nextWaveDefense",
  "upgradeDiscount",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function nonEmpty(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > max) return null;
  return trimmed;
}

function battleDayForWave(wave: number): number | null {
  return gameConfig.waves.find((entry) => entry.wave === wave)?.day ?? null;
}

function upcomingWave(wavesCleared: number): number {
  return Math.min(wavesCleared + 1, gameConfig.waves.length);
}

export function validateEffect(
  value: unknown,
  ctx: PackageValidationContext,
): { ok: true; effect: Effect } | { ok: false; message: string } {
  if (!isRecord(value) || typeof value.type !== "string" || !EFFECT_TYPES.has(value.type)) {
    return { ok: false, message: "Effect type is not supported" };
  }
  const keys = Object.keys(value);
  if (value.type === "upgradeDiscount") {
    if (keys.some((key) => key !== "type" && key !== "rate" && key !== "untilWave")) {
      return { ok: false, message: "upgradeDiscount has unknown fields" };
    }
    if (typeof value.rate !== "number" || !Number.isFinite(value.rate) || value.rate <= 0 || value.rate > 1) {
      return { ok: false, message: "upgradeDiscount rate must be in (0, 1]" };
    }
    const untilWave = finiteInt(value.untilWave, 1, gameConfig.waves.length);
    if (untilWave == null) return { ok: false, message: "upgradeDiscount untilWave is invalid" };
    if (ctx.enforceWaveTiming && untilWave < upcomingWave(ctx.wavesCleared)) {
      return { ok: false, message: "upgradeDiscount untilWave is already past" };
    }
    return { ok: true, effect: { type: "upgradeDiscount", rate: value.rate, untilWave } };
  }
  if (value.type === "nextWaveDefense") {
    if (keys.some((key) => key !== "type" && key !== "amount" && key !== "wave")) {
      return { ok: false, message: "nextWaveDefense has unknown fields" };
    }
    const amount = finiteInt(value.amount, 0, PACKAGE_LIMITS.maxEffectAmount);
    const wave = finiteInt(value.wave, 1, gameConfig.waves.length);
    if (amount == null || wave == null) return { ok: false, message: "nextWaveDefense values are invalid" };
    if (ctx.enforceWaveTiming && wave < upcomingWave(ctx.wavesCleared)) {
      return { ok: false, message: "nextWaveDefense wave is already past" };
    }
    return { ok: true, effect: { type: "nextWaveDefense", amount, wave } };
  }
  if (keys.some((key) => key !== "type" && key !== "amount")) {
    return { ok: false, message: "Effect has unknown fields" };
  }
  const amount = finiteInt(value.amount, 0, PACKAGE_LIMITS.maxEffectAmount);
  if (amount == null) return { ok: false, message: "Effect amount is invalid" };
  return { ok: true, effect: { type: value.type, amount } as Effect };
}

function validateConsequence(
  value: unknown,
  ctx: PackageValidationContext,
): { ok: true; consequence?: ChoiceConsequence } | { ok: false; message: string } {
  if (value == null) return { ok: true };
  if (!ctx.allowConsequence) return { ok: false, message: "Consequence packages cannot schedule another consequence" };
  if (!isRecord(value)) return { ok: false, message: "Consequence is invalid" };
  const packageId = nonEmpty(value.packageId, PACKAGE_LIMITS.maxIdLength);
  const minDelayDays = finiteInt(value.minDelayDays, PACKAGE_LIMITS.minDelayDays, PACKAGE_LIMITS.maxDelayDays);
  const maxDelayDays = finiteInt(value.maxDelayDays, PACKAGE_LIMITS.minDelayDays, PACKAGE_LIMITS.maxDelayDays);
  if (!packageId || minDelayDays == null || maxDelayDays == null || minDelayDays > maxDelayDays) {
    return { ok: false, message: "Consequence delay or package id is invalid" };
  }
  let targetWave: number | undefined;
  if (value.targetWave != null) {
    const wave = finiteInt(value.targetWave, 1, gameConfig.waves.length);
    if (wave == null) return { ok: false, message: "Consequence targetWave is invalid" };
    const deadline = battleDayForWave(wave);
    if (ctx.enforceWaveTiming && (deadline == null || ctx.day >= deadline)) {
      return { ok: false, message: "Consequence target wave is already past" };
    }
    targetWave = wave;
  }
  const catalog = eventPackageById(packageId);
  if (value.fallbackPackage == null) {
    if (!catalog) return { ok: false, message: "Consequence package is not executable" };
    return {
      ok: true,
      consequence: { packageId, minDelayDays, maxDelayDays, ...(targetWave != null ? { targetWave } : {}) },
    };
  }
  const nested = validateEventPackage(value.fallbackPackage, {
    ...ctx,
    allowConsequence: false,
    checkDominance: ctx.checkDominance,
  });
  if (!nested.ok) return nested;
  if (nested.pkg.packageId !== packageId) {
    return { ok: false, message: "Consequence fallback packageId does not match the reference" };
  }
  return {
    ok: true,
    consequence: {
      packageId,
      minDelayDays,
      maxDelayDays,
      ...(targetWave != null ? { targetWave } : {}),
      fallbackPackage: nested.pkg,
    },
  };
}

function effectSignature(effects: Effect[]): string {
  return effects
    .map((effect) => {
      if (effect.type === "upgradeDiscount") return `upgradeDiscount:${effect.rate}:${effect.untilWave}`;
      if (effect.type === "nextWaveDefense") return `nextWaveDefense:${effect.amount}:${effect.wave}`;
      return `${effect.type}:${effect.amount}`;
    })
    .sort()
    .join("|");
}

function consequenceSignature(consequence: ChoiceConsequence | undefined): string {
  if (!consequence) return "";
  return [
    consequence.packageId,
    consequence.minDelayDays,
    consequence.maxDelayDays,
    consequence.targetWave ?? "",
  ].join(":");
}

function hasDominatedChoice(choices: EventChoice[]): boolean {
  for (let i = 0; i < choices.length; i += 1) {
    for (let j = 0; j < choices.length; j += 1) {
      if (i === j) continue;
      const left = choices[i]!;
      const right = choices[j]!;
      if (left.goldCost <= right.goldCost) continue;
      if (effectSignature(left.effects) !== effectSignature(right.effects)) continue;
      if (consequenceSignature(left.consequence) !== consequenceSignature(right.consequence)) continue;
      return true;
    }
  }
  return false;
}

export function validateEventPackage(
  value: unknown,
  ctx: PackageValidationContext,
): PackageValidationResult {
  if (!isRecord(value)) return { ok: false, message: "Event package is not an object" };
  const packageId = nonEmpty(value.packageId, PACKAGE_LIMITS.maxIdLength);
  const eventId = nonEmpty(value.eventId, PACKAGE_LIMITS.maxIdLength);
  const title = nonEmpty(value.title, PACKAGE_LIMITS.maxTitleLength);
  const description = nonEmpty(value.description, PACKAGE_LIMITS.maxDescriptionLength);
  const decade = finiteInt(value.decade, 1, gameConfig.waves.length);
  if (!packageId || !eventId || !title || !description || decade == null) {
    return { ok: false, message: "Event package identity or text is invalid" };
  }
  const expectedDecade = Math.max(1, Math.ceil(ctx.day / 10));
  if (ctx.enforceDecade !== false && decade !== expectedDecade) {
    return { ok: false, message: "Event package decade does not match the slot day" };
  }
  if (!Array.isArray(value.choices)) return { ok: false, message: "Event package choices are missing" };
  const choices: EventChoice[] = [];
  const ids = new Set<string>();
  for (const raw of value.choices) {
    if (!isRecord(raw)) return { ok: false, message: "Event choice is invalid" };
    const id = nonEmpty(raw.id, PACKAGE_LIMITS.maxIdLength);
    const label = nonEmpty(raw.label, PACKAGE_LIMITS.maxLabelLength);
    const goldCost = finiteInt(raw.goldCost, 0, PACKAGE_LIMITS.maxGoldCost);
    if (!id || !label || goldCost == null) return { ok: false, message: "Event choice fields are invalid" };
    if (ids.has(id)) return { ok: false, message: "Event choice ids must be unique" };
    ids.add(id);
    if (!Array.isArray(raw.effects)) return { ok: false, message: "Event choice effects are missing" };
    const effects: Effect[] = [];
    for (const effect of raw.effects) {
      const parsed = validateEffect(effect, ctx);
      if (!parsed.ok) return parsed;
      effects.push(parsed.effect);
    }
    const consequence = validateConsequence(raw.consequence, ctx);
    if (!consequence.ok) return consequence;
    choices.push({
      id,
      label,
      goldCost,
      effects,
      ...(consequence.consequence ? { consequence: consequence.consequence } : {}),
    });
  }
  if (choices.length < 2 || choices.length > 4) {
    return { ok: false, message: "Event package must contain 2 to 4 choices" };
  }
  if (!choices.some((choice) => choice.goldCost === 0)) {
    return { ok: false, message: "Event package must include one free choice" };
  }
  if (ctx.checkDominance && hasDominatedChoice(choices)) {
    return { ok: false, message: "A paid choice is strictly dominated by a cheaper choice" };
  }
  return {
    ok: true,
    pkg: { packageId, eventId, decade, title, description, choices },
  };
}
