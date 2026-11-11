import type { Difficulty } from "./types";

export type DifficultyModifiers = {
  monsterHp: number;
  monsterAttack: number;
  upgradeCost: number;
  dailyIncome: number;
  repairCost: number;
  eventGoldCost: number;
};

const TABLE: Record<Difficulty, DifficultyModifiers> = {
  easy: {
    monsterHp: 0.75,
    monsterAttack: 0.8,
    upgradeCost: 0.85,
    dailyIncome: 1.15,
    repairCost: 0.9,
    eventGoldCost: 0.85,
  },
  normal: {
    monsterHp: 1,
    monsterAttack: 1,
    upgradeCost: 1,
    dailyIncome: 1,
    repairCost: 1,
    eventGoldCost: 1,
  },
  hard: {
    // Slightly softer than 1.08/1.06 so consequence-heavy seeds (e.g. holdout-hard)
    // stay winnable after paid consequence defenses were added.
    monsterHp: 1.05,
    monsterAttack: 1.03,
    upgradeCost: 1.08,
    dailyIncome: 0.95,
    repairCost: 1.05,
    eventGoldCost: 1.08,
  },
};

export function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "normal" || value === "hard";
}

export function getDifficultyModifiers(difficulty: Difficulty): DifficultyModifiers {
  return TABLE[difficulty];
}

export function scaleMonsterStat(base: number, multiplier: number): number {
  return Math.max(1, Math.round(base * multiplier));
}

export function scaleEconomyCost(base: number, multiplier: number): number {
  return Math.max(1, Math.ceil(base * multiplier));
}

export function scaleIncome(base: number, multiplier: number): number {
  return Math.max(0, Math.round(base * multiplier));
}

export function scaleEventGoldCost(base: number, difficulty: Difficulty): number {
  if (base <= 0) return 0;
  const mods = getDifficultyModifiers(difficulty);
  return scaleEconomyCost(base, mods.eventGoldCost);
}
