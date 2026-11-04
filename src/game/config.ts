import type { EventPackage, RewardOption, WaveId } from "./types";

export const GAME_CONFIG = {
  startingDay: 1,
  goldBeforeDay1Income: 100,
  // playtest: AGENTS table used 15; 25 is required for a fair lv5 + repair path to wave 2
  dailyIncome: 25,
  cityMaxHp: 150,
  baseAttack: 10,
  baseDefense: 2,
  firstUpgradeCost: 50,
  upgradeCostStep: 20,
  upgradeAttackBonus: 5,
  upgradeDefenseBonus: 2,
  maxUpgradeLevel: 5,
  repairCost: 30,
  repairAmount: 30,
  totalDays: 20,
  battleDays: [10, 20] as const,
  eventDays: [3, 7, 13, 17] as const,
  stateVersion: 1 as const,
} as const;

export const WAVES: Record<
  WaveId,
  { day: number; name: string; hp: number; attack: number }
> = {
  1: { day: 10, name: "Gerombolan Goblin", hp: 150, attack: 22 },
  2: { day: 20, name: "Pasukan Orc", hp: 260, attack: 34 },
};

/** Trusted event effect packages — AI / mock only supplies narrative labels. */
export const EVENT_PACKAGES: EventPackage[] = [
  {
    id: "event-day-3",
    day: 3,
    title: "Scout Report",
    description: "Scouts return with a costly defense tip.",
    choices: [
      {
        id: "event-day-3-a",
        label: "Pay for fortifications",
        goldCost: 20,
        effects: [{ type: "defense_bonus", amount: 4, wave: 1 }],
      },
      {
        id: "event-day-3-b",
        label: "Ignore the tip",
        goldCost: 0,
        effects: [],
      },
    ],
  },
  {
    id: "event-day-7",
    day: 7,
    title: "Supply Shortage",
    description: "A merchant demands payment or the city suffers.",
    choices: [
      {
        id: "event-day-7-a",
        label: "Pay the merchant",
        goldCost: 15,
        effects: [],
      },
      {
        id: "event-day-7-b",
        label: "Refuse and endure",
        goldCost: 0,
        effects: [{ type: "city_hp_loss", amount: 10 }],
      },
    ],
  },
  {
    id: "event-day-13",
    day: 13,
    title: "Trade Caravan",
    description: "A caravan offers aid after the first wave.",
    choices: [
      {
        id: "event-day-13-a",
        label: "Accept a gold gift",
        goldCost: 0,
        effects: [{ type: "gold_gain", amount: 20 }],
      },
      {
        id: "event-day-13-b",
        label: "Accept builder discount",
        goldCost: 0,
        effects: [{ type: "upgrade_discount", rate: 0.25, untilWave: 2 }],
      },
    ],
  },
  {
    id: "event-day-17",
    day: 17,
    title: "Wall Reinforcement Offer",
    description: "Engineers propose a last-minute defense boost.",
    choices: [
      {
        id: "event-day-17-a",
        label: "Hire the engineers",
        goldCost: 20,
        effects: [{ type: "defense_bonus", amount: 4, wave: 2 }],
      },
      {
        id: "event-day-17-b",
        label: "Save the gold",
        goldCost: 0,
        effects: [],
      },
    ],
  },
];

export const REWARD_OPTIONS: RewardOption[] = [
  {
    id: "reward-gold",
    label: "Gold +40",
    kind: "gold",
    amount: 40,
  },
  {
    id: "reward-income",
    label: "Income +6 on days 11–19",
    kind: "income_bonus",
    amount: 6,
  },
  {
    id: "reward-discount",
    label: "Upgrade discount 25% on days 11–19",
    kind: "upgrade_discount",
    amount: 0.25,
  },
];

export function eventPackageById(id: string): EventPackage | undefined {
  return EVENT_PACKAGES.find((p) => p.id === id);
}

export function eventPackageForDay(day: number): EventPackage | undefined {
  return EVENT_PACKAGES.find((p) => p.day === day);
}

export function waveForDay(day: number): WaveId | null {
  if (day === 10) return 1;
  if (day === 20) return 2;
  return null;
}

export function nextWaveId(stateWavesCleared: number): WaveId {
  return stateWavesCleared >= 1 ? 2 : 1;
}
