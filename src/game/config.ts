import type { EventPackage, RewardOption } from "./types";

/** Playtest income is 25 (AGENTS table listed 15). One source of truth. */
export const gameConfig = {
  startingDay: 1,
  startingGold: 100,
  dailyIncome: 25,
  cityMaxHp: 150,
  baseAttack: 10,
  baseDefense: 2,
  upgradeBaseCost: 50,
  upgradeCostStep: 20,
  maxTrackLevel: 5,
  wallDefenseBonus: 2,
  troopAttackBonus: 5,
  cityMaxHpBonus: 20,
  /** +3 could not fund separate ATK and DEF tracks through wave 2. */
  cityIncomeBonus: 8,
  repairCost: 30,
  repairHeal: 30,
  lastDay: 20,
  battleDays: [10, 20] as const,
  waves: [
    { wave: 1 as const, day: 10, name: "Goblin Horde", hp: 150, attack: 22 },
    { wave: 2 as const, day: 20, name: "Orc Host", hp: 260, attack: 34 },
  ],
  rewards: [
    { id: "reward-gold", label: "Royal subsidy", kind: "grantGold", amount: 40 },
    { id: "reward-income", label: "Trade routes", kind: "prepIncomeBonus", amount: 6 },
    { id: "reward-discount", label: "City logistics", kind: "upgradeDiscount", amount: 0.25 },
  ] satisfies RewardOption[],
  /**
   * Trusted event pools. Multiple packages may share a day; each run picks one
   * package per day via `pickEventPlan`. AI may rewrite title/description/labels only.
   */
  events: [
    {
      packageId: "event-day-3-scouts",
      eventId: "event-day-3-scouts",
      day: 3,
      title: "Scouts at the gate",
      description:
        "My lord, enemy scouts have been sighted beyond the gate. I advise posting extra guards before the first wave, or letting them pass so the city's gold stays intact.",
      choices: [
        {
          id: "day3-scouts-pay",
          label: "Reinforce the gate: pay 20 gold, defense +4 for the first wave",
          goldCost: 20,
          effects: [{ type: "nextWaveDefense", amount: 4, wave: 1 }],
        },
        {
          id: "day3-scouts-skip",
          label: "Let them pass. No immediate consequence.",
          goldCost: 0,
          effects: [],
        },
      ],
    },
    {
      packageId: "event-day-3-envoy",
      eventId: "event-day-3-envoy",
      day: 3,
      title: "Nervous border envoy",
      description:
        "My lord, a border envoy begs for escort coin before the first wave. Paying them hardens our walls; refusing costs nothing today.",
      choices: [
        {
          id: "day3-envoy-pay",
          label: "Fund the escort: pay 20 gold, defense +4 for the first wave",
          goldCost: 20,
          effects: [{ type: "nextWaveDefense", amount: 4, wave: 1 }],
        },
        {
          id: "day3-envoy-skip",
          label: "Send them away empty-handed. No immediate consequence.",
          goldCost: 0,
          effects: [],
        },
      ],
    },
    {
      packageId: "event-day-7-supplies",
      eventId: "event-day-7-supplies",
      day: 7,
      title: "Supply dilemma",
      description:
        "The stores are running low, my lord. We can buy supplies now, or refuse the offer and accept damage to the city.",
      choices: [
        {
          id: "day7-supplies-pay",
          label: "Buy supplies: pay 15 gold.",
          goldCost: 15,
          effects: [],
        },
        {
          id: "day7-supplies-hurt",
          label: "Refuse the offer. The city loses 10 HP.",
          goldCost: 0,
          effects: [{ type: "damageCity", amount: 10 }],
        },
      ],
    },
    {
      packageId: "event-day-7-labor",
      eventId: "event-day-7-labor",
      day: 7,
      title: "Exhausted work crews",
      description:
        "The labor crews are spent, my lord. A wage now keeps the walls sound; refusing means the city takes the strain.",
      choices: [
        {
          id: "day7-labor-pay",
          label: "Pay the crews: pay 15 gold.",
          goldCost: 15,
          effects: [],
        },
        {
          id: "day7-labor-hurt",
          label: "Order them onward unpaid. The city loses 10 HP.",
          goldCost: 0,
          effects: [{ type: "damageCity", amount: 10 }],
        },
      ],
    },
    {
      packageId: "event-day-13-caravan",
      eventId: "event-day-13-caravan",
      day: 13,
      title: "Trade opportunity",
      description:
        "A merchant caravan offers two paths, my lord: gold you can spend today, or cheaper building costs until the second wave.",
      choices: [
        {
          id: "day13-caravan-gold",
          label: "Accept the caravan gold: gold +20.",
          goldCost: 0,
          effects: [{ type: "grantGold", amount: 20 }],
        },
        {
          id: "day13-caravan-discount",
          label: "Secure material prices: 25% upgrade discount until the second wave.",
          goldCost: 0,
          effects: [{ type: "upgradeDiscount", rate: 0.25, untilWave: 2 }],
        },
      ],
    },
    {
      packageId: "event-day-13-guild",
      eventId: "event-day-13-guild",
      day: 13,
      title: "Guild bargain",
      description:
        "The builders' guild opens its ledgers, my lord: a purse of gold now, or discounted upgrades until the second wave.",
      choices: [
        {
          id: "day13-guild-gold",
          label: "Take the guild purse: gold +20.",
          goldCost: 0,
          effects: [{ type: "grantGold", amount: 20 }],
        },
        {
          id: "day13-guild-discount",
          label: "Lock guild rates: 25% upgrade discount until the second wave.",
          goldCost: 0,
          effects: [{ type: "upgradeDiscount", rate: 0.25, untilWave: 2 }],
        },
      ],
    },
    {
      packageId: "event-day-17-barricades",
      eventId: "event-day-17-barricades",
      day: 17,
      title: "Final barricades",
      description:
        "The second wave draws near, my lord. I advise raising extra barricades now, or saving the gold for the days that remain.",
      choices: [
        {
          id: "day17-barricades-pay",
          label: "Raise barricades: pay 20 gold, defense +4 for the second wave",
          goldCost: 20,
          effects: [{ type: "nextWaveDefense", amount: 4, wave: 2 }],
        },
        {
          id: "day17-barricades-skip",
          label: "Keep the gold. No immediate consequence.",
          goldCost: 0,
          effects: [],
        },
      ],
    },
    {
      packageId: "event-day-17-watchfires",
      eventId: "event-day-17-watchfires",
      day: 17,
      title: "Watchfires on the ridge",
      description:
        "Ridgeline watchfires could blind the second wave, my lord. Lighting them costs gold now; leaving them dark saves coin.",
      choices: [
        {
          id: "day17-watchfires-pay",
          label: "Light the watchfires: pay 20 gold, defense +4 for the second wave",
          goldCost: 20,
          effects: [{ type: "nextWaveDefense", amount: 4, wave: 2 }],
        },
        {
          id: "day17-watchfires-skip",
          label: "Leave the ridge dark. No immediate consequence.",
          goldCost: 0,
          effects: [],
        },
      ],
    },
  ] satisfies EventPackage[],
};

export function scheduledEventDays(): number[] {
  return [...new Set(gameConfig.events.map((event) => event.day))].sort((a, b) => a - b);
}

export function eventPackagesForDay(day: number): EventPackage[] {
  return gameConfig.events.filter((event) => event.day === day);
}

export function eventPackageById(packageId: string): EventPackage | undefined {
  return gameConfig.events.find((event) => event.packageId === packageId);
}

/** Default package for a day (first in the pool). Prefer `resolveEventPackage` with a run plan. */
export function eventPackageForDay(day: number): EventPackage | undefined {
  return eventPackagesForDay(day)[0];
}

export function rewardById(id: string): RewardOption | undefined {
  return gameConfig.rewards.find((reward) => reward.id === id);
}
