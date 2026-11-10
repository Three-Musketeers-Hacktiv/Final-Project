import { generatedEventPackageJsonSchema } from "./event-package";

/**
 * Synthetic schema ladder for one opt-in Gemini call per step.
 * Each step changes a single request variable relative to the previous schema step.
 * These objects are not the production contract.
 */

const flatEffectJsonSchema = {
  type: "object",
  required: ["type"],
  propertyOrdering: ["type", "amount", "wave", "rate", "untilWave"],
  properties: {
    type: {
      type: "string",
      enum: ["grantGold", "damageCity", "healCity", "maxHpBonus", "nextWaveDefense", "upgradeDiscount"],
    },
    amount: { type: "number" },
    wave: { type: "number" },
    rate: { type: "number" },
    untilWave: { type: "number" },
  },
};

function choiceSchema(effectsItems: unknown) {
  return {
    type: "object",
    required: ["id", "label", "goldCost", "effects"],
    propertyOrdering: ["id", "label", "goldCost", "effects"],
    properties: {
      id: { type: "string" },
      label: { type: "string" },
      goldCost: { type: "number" },
      effects: { type: "array", items: effectsItems },
    },
  };
}

const anyOfEffectJsonSchema = {
  anyOf: [
    ["grantGold", "amount"],
    ["damageCity", "amount"],
    ["healCity", "amount"],
    ["maxHpBonus", "amount"],
    ["nextWaveDefense", "amount", "wave"],
    ["upgradeDiscount", "rate", "untilWave"],
  ].map(([type, ...fields]) => ({
    type: "object",
    required: ["type", ...fields],
    propertyOrdering: ["type", ...fields],
    properties: {
      type: { type: "string", enum: [type] },
      ...Object.fromEntries(fields.map((field) => [field, { type: "number" }])),
    },
  })),
};

const choiceWithAnyOf = choiceSchema(anyOfEffectJsonSchema);
const choiceWithFlatEffect = choiceSchema(flatEffectJsonSchema);

const labelChoice = {
  type: "object",
  required: ["id", "label"],
  propertyOrdering: ["id", "label"],
  properties: {
    id: { type: "string" },
    label: { type: "string" },
  },
};

const consequenceWithoutEffects = {
  type: "object",
  required: ["minDelayDays", "maxDelayDays", "fallbackPackage"],
  propertyOrdering: ["minDelayDays", "maxDelayDays", "targetWave", "fallbackPackage"],
  properties: {
    minDelayDays: { type: "integer" },
    maxDelayDays: { type: "integer" },
    targetWave: { type: "integer" },
    fallbackPackage: {
      type: "object",
      required: ["title", "description", "choices"],
      propertyOrdering: ["title", "description", "choices"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        choices: { type: "array", minItems: 2, maxItems: 4, items: labelChoice },
      },
    },
  },
};

const choiceWithConsequenceLabels = {
  ...choiceWithAnyOf,
  propertyOrdering: ["id", "label", "goldCost", "effects", "consequence"],
  properties: {
    ...choiceWithAnyOf.properties,
    consequence: consequenceWithoutEffects,
  },
};

function packageSchema(choiceItems: unknown) {
  return {
    type: "object",
    required: ["title", "description", "choices"],
    propertyOrdering: ["title", "description", "choices"],
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      choices: { type: "array", minItems: 2, maxItems: 4, items: choiceItems },
    },
  };
}

export type PackageSchemaProbe = {
  id: "A" | "B" | "C" | "D1" | "D2" | "E1" | "E2";
  /** Absent means JSON mime type without a schema. */
  responseJsonSchema?: unknown;
  maxOutputTokens: number;
};

const PROBE_TOKENS = 800;

export function packageSchemaProbes(): PackageSchemaProbe[] {
  return [
    { id: "A", maxOutputTokens: PROBE_TOKENS },
    {
      id: "B",
      maxOutputTokens: PROBE_TOKENS,
      responseJsonSchema: {
        type: "object",
        required: ["ok"],
        propertyOrdering: ["ok"],
        properties: { ok: { type: "string" } },
      },
    },
    {
      id: "C",
      maxOutputTokens: PROBE_TOKENS,
      responseJsonSchema: packageSchema(labelChoice),
    },
    { id: "D1", maxOutputTokens: PROBE_TOKENS, responseJsonSchema: packageSchema(choiceWithAnyOf) },
    { id: "D2", maxOutputTokens: PROBE_TOKENS, responseJsonSchema: packageSchema(choiceWithFlatEffect) },
    { id: "E1", maxOutputTokens: PROBE_TOKENS, responseJsonSchema: packageSchema(choiceWithConsequenceLabels) },
    { id: "E2", maxOutputTokens: PROBE_TOKENS, responseJsonSchema: generatedEventPackageJsonSchema },
  ];
}

export function probeFollowUp(
  failed: PackageSchemaProbe,
): PackageSchemaProbe & { id: "F" } {
  return {
    id: "F",
    responseJsonSchema: failed.responseJsonSchema,
    maxOutputTokens: failed.maxOutputTokens === 800 ? 2500 : 800,
  };
}
