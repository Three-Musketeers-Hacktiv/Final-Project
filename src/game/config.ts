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
    { wave: 1 as const, day: 10, name: "Gerombolan Goblin", hp: 150, attack: 22 },
    { wave: 2 as const, day: 20, name: "Pasukan Orc", hp: 260, attack: 34 },
  ],
  rewards: [
    { id: "reward-gold", label: "Bantuan kerajaan", kind: "grantGold", amount: 40 },
    { id: "reward-income", label: "Jalur perdagangan", kind: "prepIncomeBonus", amount: 6 },
    { id: "reward-discount", label: "Logistik kota", kind: "upgradeDiscount", amount: 0.25 },
  ] satisfies RewardOption[],
  events: [
    {
      packageId: "event-day-3",
      eventId: "event-day-3",
      day: 3,
      title: "Pengintai di gerbang",
      description: "Bayar untuk memperkuat pertahanan wave pertama, atau biarkan lewat.",
      choices: [
        {
          id: "day3-pay",
          label: "Bayar 20 gold, defense +4 wave pertama",
          goldCost: 20,
          effects: [{ type: "nextWaveDefense", amount: 4, wave: 1 }],
        },
        {
          id: "day3-skip",
          label: "Lewati tanpa efek",
          goldCost: 0,
          effects: [],
        },
      ],
    },
    {
      packageId: "event-day-7",
      eventId: "event-day-7",
      day: 7,
      title: "Dilema perbekalan",
      description: "Bayar untuk menghindari kerusakan, atau terima luka pada kota.",
      choices: [
        {
          id: "day7-pay",
          label: "Bayar 15 gold",
          goldCost: 15,
          effects: [],
        },
        {
          id: "day7-hurt",
          label: "Gratis, HP kota -10",
          goldCost: 0,
          effects: [{ type: "damageCity", amount: 10 }],
        },
      ],
    },
    {
      packageId: "event-day-13",
      eventId: "event-day-13",
      day: 13,
      title: "Kesempatan dagang",
      description: "Terima emas atau diskon upgrade sampai wave kedua.",
      choices: [
        {
          id: "day13-gold",
          label: "Gratis, gold +20",
          goldCost: 0,
          effects: [{ type: "grantGold", amount: 20 }],
        },
        {
          id: "day13-discount",
          label: "Gratis, diskon upgrade 25% sampai wave kedua",
          goldCost: 0,
          effects: [{ type: "upgradeDiscount", rate: 0.25, untilWave: 2 }],
        },
      ],
    },
    {
      packageId: "event-day-17",
      eventId: "event-day-17",
      day: 17,
      title: "Barikade terakhir",
      description: "Bayar untuk defense wave kedua, atau lewatkan.",
      choices: [
        {
          id: "day17-pay",
          label: "Bayar 20 gold, defense +4 wave kedua",
          goldCost: 20,
          effects: [{ type: "nextWaveDefense", amount: 4, wave: 2 }],
        },
        {
          id: "day17-skip",
          label: "Lewati tanpa efek",
          goldCost: 0,
          effects: [],
        },
      ],
    },
  ] satisfies EventPackage[],
};

export function eventPackageForDay(day: number): EventPackage | undefined {
  return gameConfig.events.find((event) => event.day === day);
}

export function rewardById(id: string): RewardOption | undefined {
  return gameConfig.rewards.find((reward) => reward.id === id);
}
