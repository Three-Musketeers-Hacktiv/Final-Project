import { CONSEQUENCE_PACKAGES, SCHEDULED_EVENT_PACKAGES } from "./eventPackages";
import type { EventPackage, WaveDefinition, WaveRewardSet } from "./types";

export const GAME_STATE_VERSION = 4 as const;

export const gameConfig = {
  startingDay: 1,
  lastDay: 100,
  startingGold: 100,
  dailyIncome: 28,
  cityMaxHp: 150,
  baseAttack: 10,
  baseDefense: 2,
  upgradeBaseCost: 45,
  upgradeCostStep: 30,
  maxTrackLevel: 18,
  wallDefenseBonus: 3,
  troopAttackBonus: 5,
  cityMaxHpBonus: 35,
  cityIncomeBonus: 5,
  repairCost: 25,
  repairHeal: 60,
  eventsPerDecade: 2,
  minEventGapDays: 2,
  battleDays: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const,
  waves: [
    { wave: 1, day: 10, name: "Goblin Horde", role: "tutorial", hp: 150, attack: 22 },
    { wave: 2, day: 20, name: "Orc Host", role: "check", hp: 200, attack: 28 },
    { wave: 3, day: 30, name: "Great Wolf", role: "spike", hp: 240, attack: 34 },
    { wave: 4, day: 40, name: "Cyclops", role: "tank", hp: 290, attack: 36 },
    { wave: 5, day: 50, name: "Wyvern", role: "midboss", hp: 340, attack: 40 },
    { wave: 6, day: 60, name: "Lich", role: "attrition", hp: 390, attack: 44 },
    { wave: 7, day: 70, name: "Lesser Demon", role: "spike", hp: 440, attack: 48 },
    { wave: 8, day: 80, name: "Demon", role: "tank", hp: 490, attack: 54 },
    { wave: 9, day: 90, name: "Dragon", role: "spike", hp: 540, attack: 58 },
    { wave: 10, day: 100, name: "Demon King", role: "finale", hp: 600, attack: 64 },
  ] satisfies WaveDefinition[],
  waveRewards: [
    {
      afterWave: 1,
      options: [
        {
          id: "w1-income",
          label: "Trade routes (+6 prep income until next battle)",
          kind: "prepIncomeBonus",
          amount: 6,
        },
        {
          id: "w1-discount",
          label: "Merchant favor (25% upgrade discount until next wave)",
          kind: "upgradeDiscount",
          amount: 0,
          rate: 0.25,
          untilWave: 2,
        },
        { id: "w1-gold", label: "Treasury haul (+35 gold)", kind: "grantGold", amount: 35 },
      ],
    },
    {
      afterWave: 2,
      options: [
        { id: "w2-gold", label: "Spoils (+60 gold)", kind: "grantGold", amount: 60 },
        { id: "w2-heal", label: "Field medics (heal 35 HP)", kind: "healCity", amount: 35 },
        {
          id: "w2-def",
          label: "Barricades (+5 defense next wave)",
          kind: "nextWaveDefense",
          amount: 5,
          wave: 3,
        },
      ],
    },
    {
      afterWave: 3,
      options: [
        {
          id: "w3-income",
          label: "Tax reform (+8 prep income until next battle)",
          kind: "prepIncomeBonus",
          amount: 8,
        },
        { id: "w3-maxhp", label: "Reinforce walls (+20 Max HP)", kind: "maxHpBonus", amount: 20 },
        { id: "w3-heal", label: "Surgeons (heal 45 HP)", kind: "healCity", amount: 45 },
      ],
    },
    {
      afterWave: 4,
      options: [
        {
          id: "w4-discount",
          label: "Guild charter (30% upgrade discount until next wave)",
          kind: "upgradeDiscount",
          amount: 0,
          rate: 0.3,
          untilWave: 5,
        },
        { id: "w4-gold", label: "Booty (+80 gold)", kind: "grantGold", amount: 80 },
        { id: "w4-heal", label: "Rest tents (heal 40 HP)", kind: "healCity", amount: 40 },
      ],
    },
    {
      afterWave: 5,
      options: [
        { id: "w5-gold", label: "Royal grant (+110 gold)", kind: "grantGold", amount: 110 },
        {
          id: "w5-def",
          label: "Watchtowers (+6 defense next wave)",
          kind: "nextWaveDefense",
          amount: 6,
          wave: 6,
        },
        {
          id: "w5-income",
          label: "Caravan pact (+10 prep income until next battle)",
          kind: "prepIncomeBonus",
          amount: 10,
        },
      ],
    },
    {
      afterWave: 6,
      options: [
        { id: "w6-maxhp", label: "Stoneworks (+25 Max HP)", kind: "maxHpBonus", amount: 25 },
        { id: "w6-heal", label: "Hospital tents (heal 55 HP)", kind: "healCity", amount: 55 },
        {
          id: "w6-discount",
          label: "Blacksmith deals (30% upgrade discount until next wave)",
          kind: "upgradeDiscount",
          amount: 0,
          rate: 0.3,
          untilWave: 7,
        },
      ],
    },
    {
      afterWave: 7,
      options: [
        { id: "w7-gold", label: "War chest (+130 gold)", kind: "grantGold", amount: 130 },
        { id: "w7-heal", label: "Priests of light (heal 50 HP)", kind: "healCity", amount: 50 },
        {
          id: "w7-def",
          label: "Iron plating (+8 defense next wave)",
          kind: "nextWaveDefense",
          amount: 8,
          wave: 8,
        },
      ],
    },
    {
      afterWave: 8,
      options: [
        {
          id: "w8-income",
          label: "Tribute lines (+12 prep income until next battle)",
          kind: "prepIncomeBonus",
          amount: 12,
        },
        { id: "w8-maxhp", label: "Citadel expansion (+30 Max HP)", kind: "maxHpBonus", amount: 30 },
        { id: "w8-gold", label: "Loot (+150 gold)", kind: "grantGold", amount: 150 },
      ],
    },
    {
      afterWave: 9,
      options: [
        {
          id: "w9-discount",
          label: "Siege contracts (35% upgrade discount until Demon King)",
          kind: "upgradeDiscount",
          amount: 0,
          rate: 0.35,
          untilWave: 10,
        },
        {
          id: "w9-combo",
          label: "Last stand prep (heal 40 and +6 defense final wave)",
          kind: "combo",
          amount: 0,
          effects: [
            { type: "healCity", amount: 40 },
            { type: "nextWaveDefense", amount: 6, wave: 10 },
          ],
        },
        { id: "w9-gold", label: "Final war chest (+170 gold)", kind: "grantGold", amount: 170 },
      ],
    },
  ] satisfies WaveRewardSet[],
} as const;

export const EVENT_PACKAGES: EventPackage[] = [
  ...SCHEDULED_EVENT_PACKAGES,
  ...CONSEQUENCE_PACKAGES,
];

export function scheduledEventDays(): number[] {
  // Legacy helper name: actual days come from each run's eventPlan.
  return [];
}

export function eventPackagesForDecade(decade: number): EventPackage[] {
  return SCHEDULED_EVENT_PACKAGES.filter((pkg) => pkg.decade === decade);
}

export function eventPackagesForDay(_day: number): EventPackage[] {
  return [];
}

export function eventPackageById(packageId: string): EventPackage | undefined {
  return EVENT_PACKAGES.find((pkg) => pkg.packageId === packageId);
}

export function eventPackageForDay(day: number, planPackageId?: string): EventPackage | undefined {
  if (planPackageId) return eventPackageById(planPackageId);
  return undefined;
}

export function rewardsForWave(wave: number): WaveRewardSet | undefined {
  return gameConfig.waveRewards.find((entry) => entry.afterWave === wave);
}

export function rewardById(rewardId: string) {
  for (const set of gameConfig.waveRewards) {
    const found = set.options.find((option) => option.id === rewardId);
    if (found) return { ...found, afterWave: set.afterWave };
  }
  return undefined;
}

export function getWaveByDay(day: number): WaveDefinition | undefined {
  return gameConfig.waves.find((wave) => wave.day === day);
}

export function getWaveByNumber(wave: number): WaveDefinition | undefined {
  return gameConfig.waves.find((entry) => entry.wave === wave);
}

export function lastWaveNumber(): number {
  return gameConfig.waves[gameConfig.waves.length - 1]!.wave;
}
