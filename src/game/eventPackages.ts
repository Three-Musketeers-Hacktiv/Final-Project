import type { EventPackage } from "./types";

/** Pre-battle consequence window hint used by skip/refuse choices. */
const PRE_BATTLE = { minDelayDays: 1, maxDelayDays: 3 } as const;

function consec(packageId: string) {
  return { packageId, ...PRE_BATTLE };
}

/**
 * Scheduled packages are pooled by decade. Each run picks 2 prep days + packages.
 * At least one free choice per package. Skip/refuse choices may schedule consequences.
 */
export const SCHEDULED_EVENT_PACKAGES: EventPackage[] = [
  // Decade 1
  {
    packageId: "d1-scouts-a",
    eventId: "d1-scouts-a",
    decade: 1,
    title: "Scouts at the gate",
    description:
      "My lord, enemy scouts linger beyond the gate. We can harden the walls, pay for quiet rumors, or let them pass.",
    choices: [
      {
        id: "d1-scouts-a-pay-def",
        label: "Reinforce the gate: pay {goldCost} gold, defense +4 for wave 1",
        goldCost: 20,
        effects: [{ type: "nextWaveDefense", amount: 4, wave: 1 }],
      },
      {
        id: "d1-scouts-a-bribe",
        label: "Bribe the scouts: pay {goldCost} gold for quiet",
        goldCost: 10,
        effects: [],
      },
      {
        id: "d1-scouts-a-skip",
        label: "Let them pass. Save the gold for now.",
        goldCost: 0,
        effects: [],
        consequence: consec("c-raid-wave1"),
      },
    ],
  },
  {
    packageId: "d1-envoy-b",
    eventId: "d1-envoy-b",
    decade: 1,
    title: "Nervous border envoy",
    description:
      "A border envoy begs escort coin before the first wave. Paying hardens our walls; refusing costs nothing today.",
    choices: [
      {
        id: "d1-envoy-b-pay",
        label: "Fund the escort: pay {goldCost} gold, defense +4 for wave 1",
        goldCost: 20,
        effects: [{ type: "nextWaveDefense", amount: 4, wave: 1 }],
      },
      {
        id: "d1-envoy-b-heal",
        label: "Share rations instead: heal 10 HP",
        goldCost: 0,
        effects: [{ type: "healCity", amount: 10 }],
      },
      {
        id: "d1-envoy-b-skip",
        label: "Send them away empty-handed.",
        goldCost: 0,
        effects: [],
        consequence: consec("c-raid-wave1"),
      },
    ],
  },
  {
    packageId: "d1-supplies-a",
    eventId: "d1-supplies-a",
    decade: 1,
    title: "Supply dilemma",
    description:
      "The stores run low. Buy supplies, squeeze workers for gold, or refuse and risk later damage.",
    choices: [
      {
        id: "d1-supplies-a-pay",
        label: "Buy supplies: pay {goldCost} gold",
        goldCost: 15,
        effects: [],
      },
      {
        id: "d1-supplies-a-gold",
        label: "Tax the stalls: gold +12 now",
        goldCost: 0,
        effects: [{ type: "grantGold", amount: 12 }],
        consequence: consec("c-unrest-wave1"),
      },
      {
        id: "d1-supplies-a-hurt",
        label: "Refuse the offer. City loses 10 HP now.",
        goldCost: 0,
        effects: [{ type: "damageCity", amount: 10 }],
      },
      {
        id: "d1-supplies-a-skip",
        label: "Delay the decision. No immediate cost.",
        goldCost: 0,
        effects: [],
        consequence: consec("c-unrest-wave1"),
      },
    ],
  },
  {
    packageId: "d1-labor-b",
    eventId: "d1-labor-b",
    decade: 1,
    title: "Exhausted work crews",
    description: "Labor crews are spent. A wage keeps walls sound; unpaid work strains the city.",
    choices: [
      {
        id: "d1-labor-b-pay",
        label: "Pay the crews: pay {goldCost} gold",
        goldCost: 15,
        effects: [],
      },
      {
        id: "d1-labor-b-discount",
        label: "Promise cheaper stone later: 20% upgrade discount until wave 1",
        goldCost: 0,
        effects: [{ type: "upgradeDiscount", rate: 0.2, untilWave: 1 }],
        consequence: consec("c-unrest-wave1"),
      },
      {
        id: "d1-labor-b-hurt",
        label: "Order them onward unpaid. City loses 10 HP.",
        goldCost: 0,
        effects: [{ type: "damageCity", amount: 10 }],
      },
    ],
  },

  // Decade 2
  {
    packageId: "d2-caravan-a",
    eventId: "d2-caravan-a",
    decade: 2,
    title: "Trade opportunity",
    description: "A caravan offers gold now or cheaper building until the next wave.",
    choices: [
      {
        id: "d2-caravan-a-gold",
        label: "Take the gold: +20",
        goldCost: 0,
        effects: [{ type: "grantGold", amount: 20 }],
      },
      {
        id: "d2-caravan-a-discount",
        label: "Lock material prices: 25% upgrade discount until wave 2",
        goldCost: 0,
        effects: [{ type: "upgradeDiscount", rate: 0.25, untilWave: 2 }],
      },
      {
        id: "d2-caravan-a-skip",
        label: "Turn the caravan away.",
        goldCost: 0,
        effects: [],
        consequence: consec("c-shortage-wave2"),
      },
    ],
  },
  {
    packageId: "d2-guild-b",
    eventId: "d2-guild-b",
    decade: 2,
    title: "Builders' guild charter",
    description: "The guild wants a fee for preferred rates, or a risky free bargain.",
    choices: [
      {
        id: "d2-guild-b-pay",
        label: "Pay the guild fee: {goldCost} gold, 25% discount until wave 2",
        goldCost: 18,
        effects: [{ type: "upgradeDiscount", rate: 0.25, untilWave: 2 }],
      },
      {
        id: "d2-guild-b-gold",
        label: "Demand tribute instead: gold +15",
        goldCost: 0,
        effects: [{ type: "grantGold", amount: 15 }],
        consequence: consec("c-shortage-wave2"),
      },
      {
        id: "d2-guild-b-skip",
        label: "Ignore the guild.",
        goldCost: 0,
        effects: [],
        consequence: consec("c-shortage-wave2"),
      },
    ],
  },
  {
    packageId: "d2-patrol-a",
    eventId: "d2-patrol-a",
    decade: 2,
    title: "Night patrol request",
    description: "Captains ask for coin to double patrols before the orcs.",
    choices: [
      {
        id: "d2-patrol-a-pay",
        label: "Fund patrols: pay {goldCost} gold, defense +5 for wave 2",
        goldCost: 22,
        effects: [{ type: "nextWaveDefense", amount: 5, wave: 2 }],
      },
      {
        id: "d2-patrol-a-heal",
        label: "Rest the wounded instead: heal 15 HP",
        goldCost: 0,
        effects: [{ type: "healCity", amount: 15 }],
      },
      {
        id: "d2-patrol-a-skip",
        label: "Keep the night watch thin.",
        goldCost: 0,
        effects: [],
        consequence: consec("c-raid-wave2"),
      },
      {
        id: "d2-patrol-a-risk",
        label: "Press civilians into service: gold +10, city -8 HP",
        goldCost: 0,
        effects: [
          { type: "grantGold", amount: 10 },
          { type: "damageCity", amount: 8 },
        ],
      },
    ],
  },
  {
    packageId: "d2-omen-b",
    eventId: "d2-omen-b",
    decade: 2,
    title: "Ill omen at the shrine",
    description: "Priests warn of a raid unless offerings are made.",
    choices: [
      {
        id: "d2-omen-b-pay",
        label: "Offer gold: pay {goldCost} gold",
        goldCost: 16,
        effects: [],
      },
      {
        id: "d2-omen-b-maxhp",
        label: "Bless the walls: +15 Max HP",
        goldCost: 0,
        effects: [{ type: "maxHpBonus", amount: 15 }],
        consequence: consec("c-raid-wave2"),
      },
      {
        id: "d2-omen-b-skip",
        label: "Dismiss the omen.",
        goldCost: 0,
        effects: [],
        consequence: consec("c-raid-wave2"),
      },
    ],
  },

  // Decades 3–10: patterned packages (2 each minimum)
  ...buildLaterDecades(),
];

function buildLaterDecades(): EventPackage[] {
  const rows: Array<{
    decade: number;
    wave: number;
    titleA: string;
    threatScene: string;
    foe: string;
    titleB: string;
    marketScene: string;
    bargain: string;
    shelter: string;
    refuse: string;
    consecRaid: string;
    consecUnrest: string;
  }> = [
    {
      decade: 3,
      wave: 3,
      titleA: "Wolf howls beyond the treeline",
      foe: "the wolves",
      threatScene:
        "My lord, wolves are pacing the treeline and the night watch wants orders before they test the palisade.",
      titleB: "Hunters demand hazard pay",
      marketScene:
        "Hunters crowd the west gate and will not range the wolf woods until you answer their terms.",
      bargain: "Bargain cheaper timber from the hunting camps",
      shelter: "Raise extra lodges along the palisade",
      refuse: "Turn the hunters away from the gate",
      consecRaid: "c-raid-mid",
      consecUnrest: "c-unrest-mid",
    },
    {
      decade: 4,
      wave: 4,
      titleA: "Cyclops tracks in the mud",
      foe: "the cyclops",
      threatScene:
        "My lord, a cyclops has left fresh tracks in the mud beyond the north fields. The farmers will not stay in their houses unless you act.",
      titleB: "Quarry collapse rumor",
      marketScene:
        "Masons from the quarry say a gallery is cracking. They stand in the yard and will not keep cutting stone until you decide.",
      bargain: "Strike a cheaper stone contract with the masons",
      shelter: "Shore the quarry sheds and storehouses",
      refuse: "Send the masons back to the quarry unanswered",
      consecRaid: "c-raid-mid",
      consecUnrest: "c-unrest-mid",
    },
    {
      decade: 5,
      wave: 5,
      titleA: "Wyvern shadow over the spires",
      foe: "the wyvern",
      threatScene:
        "My lord, a wyvern's shadow crosses the spires. The tower watch is shouting for barricades, bandages, or leave to strip the racks.",
      titleB: "Alchemists sell fire oil",
      marketScene:
        "My lord, alchemists have wheeled casks of fire oil into the east market and will not leave until you speak. The watch is already arguing over the street.",
      bargain: "Strike a supply bargain for cheaper city works",
      shelter: "Claim casks to reinforce shelters and storehouses",
      refuse: "Send the alchemists away empty-handed",
      consecRaid: "c-raid-mid",
      consecUnrest: "c-unrest-mid",
    },
    {
      decade: 6,
      wave: 6,
      titleA: "Lich whispers in the crypt",
      foe: "the lich",
      threatScene:
        "My lord, a cold voice in the crypt district has the burial crews refusing the night shift. They wait at the stair for your word.",
      titleB: "Necromancer's bargain",
      marketScene:
        "A necromancer's agent waits at the crypt gate with a grim offer. The priests want you to answer before dusk.",
      bargain: "Accept warded tools that cheapen later works",
      shelter: "Seal extra crypt vaults into the city's bulk",
      refuse: "Dismiss the agent from the crypt gate",
      consecRaid: "c-raid-late",
      consecUnrest: "c-unrest-late",
    },
    {
      decade: 7,
      wave: 7,
      titleA: "Lesser demon sighted",
      foe: "the lesser demon",
      threatScene:
        "My lord, a lesser demon was seen on the ash road. The gate captain will not close the watch without your order.",
      titleB: "Hellgate cracks",
      marketScene:
        "A crack of hellfire has split the old chapel floor. Wardens and masons are in the nave, each demanding a different order.",
      bargain: "Buy warded stone so later works cost less",
      shelter: "Brace the chapel into a thicker refuge",
      refuse: "Leave the cracked chapel to the wardens",
      consecRaid: "c-raid-late",
      consecUnrest: "c-unrest-late",
    },
    {
      decade: 8,
      wave: 8,
      titleA: "Demon banners on the ridge",
      foe: "the demon host",
      threatScene:
        "My lord, demon banners stand on the ridge. The outer companies are formed in the yard and waiting.",
      titleB: "Iron levy demand",
      marketScene:
        "Armorers block the foundry doors. They will not keep the forges hot unless you answer the levy they demand.",
      bargain: "Lock a cheaper iron contract for city works",
      shelter: "Turn spare plate into thicker civic shelters",
      refuse: "Refuse the armorers and reopen the foundry by order",
      consecRaid: "c-raid-late",
      consecUnrest: "c-unrest-late",
    },
    {
      decade: 9,
      wave: 9,
      titleA: "Dragon smoke on the horizon",
      foe: "the dragon",
      threatScene:
        "My lord, dragon smoke stains the horizon. The roofs are clearing and the watch wants a decision before the next pass.",
      titleB: "Dragon cult emissaries",
      marketScene:
        "Dragon-cult emissaries have entered the high square with offerings and threats. The crowd will not disperse until you answer.",
      bargain: "Take their tribute terms for cheaper later works",
      shelter: "Convert their wagons into extra refuges",
      refuse: "Drive the emissaries out of the square",
      consecRaid: "c-raid-finale",
      consecUnrest: "c-unrest-finale",
    },
    {
      decade: 10,
      wave: 10,
      titleA: "Demon King envoys",
      foe: "the Demon King's envoys",
      threatScene:
        "My lord, envoys of the Demon King stand outside the final gate. The household is silent, waiting for your order.",
      titleB: "Final mustering call",
      marketScene:
        "Captains and stewards fill the muster yard. The last levy will not form until you say how the city spends this hour.",
      bargain: "Promise cheaper works in exchange for their labor",
      shelter: "Fold the muster wagons into the city's last refuge",
      refuse: "Dismiss the muster and keep the yard empty",
      consecRaid: "c-raid-finale",
      consecUnrest: "c-unrest-finale",
    },
  ];

  const packages: EventPackage[] = [];
  for (const row of rows) {
    const d = row.decade;
    const w = row.wave;
    packages.push({
      packageId: `d${d}-threat-a`,
      eventId: `d${d}-threat-a`,
      decade: d,
      title: row.titleA,
      description: row.threatScene,
      choices: [
        {
          id: `d${d}-threat-a-pay`,
          label: `Raise barricades against ${row.foe}: pay {goldCost} gold`,
          goldCost: 18 + d,
          effects: [{ type: "nextWaveDefense", amount: 3 + Math.floor(d / 3), wave: w }],
        },
        {
          id: `d${d}-threat-a-heal`,
          label: `Tend the wounded from the latest probes`,
          goldCost: 0,
          effects: [{ type: "healCity", amount: 12 + d }],
        },
        {
          id: `d${d}-threat-a-gold`,
          label: `Strip the spare racks for a quick surplus`,
          goldCost: 0,
          effects: [{ type: "grantGold", amount: 14 + d }],
          consequence: consec(row.consecUnrest),
        },
        {
          id: `d${d}-threat-a-skip`,
          label: `Leave ${row.foe} unanswered for now`,
          goldCost: 0,
          effects: [],
          consequence: consec(row.consecRaid),
        },
      ],
    });
    packages.push({
      packageId: `d${d}-market-b`,
      eventId: `d${d}-market-b`,
      decade: d,
      title: row.titleB,
      description: row.marketScene,
      choices: [
        {
          id: `d${d}-market-b-discount`,
          label: `${row.bargain}: pay {goldCost} gold`,
          goldCost: 15 + d,
          effects: [{ type: "upgradeDiscount", rate: 0.25, untilWave: w }],
        },
        {
          id: `d${d}-market-b-maxhp`,
          label: row.shelter,
          goldCost: 0,
          effects: [{ type: "maxHpBonus", amount: 15 + Math.floor(d / 2) }],
        },
        {
          id: `d${d}-market-b-skip`,
          label: row.refuse,
          goldCost: 0,
          effects: [],
          consequence: consec(row.consecUnrest),
        },
      ],
    });
  }
  return packages;
}

/**
 * Wave a consequence package is written for. Scheduling prefers a prep day
 * before that wave's battle; see CONSEQUENCE_SUCCESSOR when the window is full.
 */
export const CONSEQUENCE_TARGET_WAVE: Readonly<Record<string, number>> = {
  "c-raid-wave1": 1,
  "c-unrest-wave1": 1,
  "c-shortage-wave2": 2,
  "c-raid-wave2": 2,
  "c-raid-mid": 5,
  "c-unrest-mid": 5,
  "c-raid-late": 8,
  "c-unrest-late": 8,
  "c-raid-finale": 10,
  "c-unrest-finale": 10,
};

/**
 * True when `scheduledPackageId` is the origin package or a package reached by
 * walking `CONSEQUENCE_SUCCESSOR` forward from it. Does not accept unrelated packages.
 */
export function isTrustedConsequencePackage(
  originPackageId: string,
  scheduledPackageId: string,
): boolean {
  if (originPackageId === scheduledPackageId) return true;
  const seen = new Set<string>();
  let current = originPackageId;
  while (!seen.has(current)) {
    seen.add(current);
    const next = CONSEQUENCE_SUCCESSOR[current];
    if (!next) return false;
    if (next === scheduledPackageId) return true;
    current = next;
  }
  return false;
}

/** Trusted package to schedule when the original target wave can no longer be reached. */
export const CONSEQUENCE_SUCCESSOR: Readonly<Record<string, string>> = {
  "c-raid-wave1": "c-raid-wave2",
  "c-unrest-wave1": "c-unrest-mid",
  "c-shortage-wave2": "c-unrest-mid",
  "c-raid-wave2": "c-raid-mid",
  "c-raid-mid": "c-raid-late",
  "c-unrest-mid": "c-unrest-late",
  "c-raid-late": "c-raid-finale",
  "c-unrest-late": "c-unrest-finale",
};

/** Consequence packages resolved later; still 2–4 choices with ≥1 free. */
export const CONSEQUENCE_PACKAGES: EventPackage[] = [
  {
    packageId: "c-raid-wave1",
    eventId: "c-raid-wave1",
    decade: 0,
    title: "Night raid fallout",
    description:
      "Raiders are in the lower streets after an earlier refusal left the approach open. Blunt them, brace the barricades, or endure the night, my lord.",
    choices: [
      {
        id: "c-raid-wave1-pay",
        label: "Pay militia: {goldCost} gold to blunt the raid",
        goldCost: 20,
        effects: [],
      },
      {
        id: "c-raid-wave1-def",
        label: "Rush barricades: pay {goldCost} gold, defense +3 for wave 1",
        goldCost: 12,
        effects: [{ type: "nextWaveDefense", amount: 3, wave: 1 }],
      },
      {
        id: "c-raid-wave1-accept",
        label: "Endure the raid: city loses 18 HP",
        goldCost: 0,
        effects: [{ type: "damageCity", amount: 18 }],
      },
    ],
  },
  {
    packageId: "c-unrest-wave1",
    eventId: "c-unrest-wave1",
    decade: 0,
    title: "Market unrest",
    description: "A crowd from an earlier hard bargain is shouting in the market square.",
    choices: [
      {
        id: "c-unrest-wave1-pay",
        label: "Buy peace: pay {goldCost} gold",
        goldCost: 15,
        effects: [],
      },
      {
        id: "c-unrest-wave1-accept",
        label: "Let them riot: city loses 12 HP",
        goldCost: 0,
        effects: [{ type: "damageCity", amount: 12 }],
      },
    ],
  },
  {
    packageId: "c-shortage-wave2",
    eventId: "c-shortage-wave2",
    decade: 0,
    title: "Material shortage",
    description: "Builders are short of stone after an earlier caravan or guild was turned aside.",
    choices: [
      {
        id: "c-shortage-wave2-pay",
        label: "Import stone: pay {goldCost} gold",
        goldCost: 18,
        effects: [],
      },
      {
        id: "c-shortage-wave2-discount",
        label: "Accept inflated prices later: no gold now, lose discount chance",
        goldCost: 0,
        effects: [],
      },
      {
        id: "c-shortage-wave2-hurt",
        label: "Push unfinished walls: city loses 14 HP",
        goldCost: 0,
        effects: [{ type: "damageCity", amount: 14 }],
      },
    ],
  },
  {
    packageId: "c-raid-wave2",
    eventId: "c-raid-wave2",
    decade: 0,
    title: "Orc probing raid",
    description: "A probing raid is testing the walls after an earlier lapse in the watch.",
    choices: [
      {
        id: "c-raid-wave2-pay",
        label: "Sortie with coin: pay {goldCost} gold",
        goldCost: 22,
        effects: [],
      },
      {
        id: "c-raid-wave2-def",
        label: "Dig trenches: defense +4 for wave 2",
        goldCost: 0,
        effects: [{ type: "nextWaveDefense", amount: 4, wave: 2 }],
        // free but weaker than paying; still free
      },
      {
        id: "c-raid-wave2-accept",
        label: "Take the hit: city loses 20 HP",
        goldCost: 0,
        effects: [{ type: "damageCity", amount: 20 }],
      },
    ],
  },
  {
    packageId: "c-raid-mid",
    eventId: "c-raid-mid",
    decade: 0,
    title: "Mid-campaign raid",
    description: "Ignored threats return as a sharp raid before the next battle.",
    choices: [
      {
        id: "c-raid-mid-pay",
        label: "Hire mercenaries: pay {goldCost} gold",
        goldCost: 28,
        effects: [],
      },
      {
        id: "c-raid-mid-accept",
        label: "Brace for impact: city loses 24 HP",
        goldCost: 0,
        effects: [{ type: "damageCity", amount: 24 }],
      },
      {
        id: "c-raid-mid-heal-cost",
        label: "Burn stores to hold: heal 10, then lose 16 HP",
        goldCost: 0,
        effects: [
          { type: "healCity", amount: 10 },
          { type: "damageCity", amount: 16 },
        ],
      },
    ],
  },
  {
    packageId: "c-unrest-mid",
    eventId: "c-unrest-mid",
    decade: 0,
    title: "Mid-campaign unrest",
    description: "Petitioners fill the square over an earlier refusal or a stripped store.",
    choices: [
      {
        id: "c-unrest-mid-pay",
        label: "Distribute grain: pay {goldCost} gold",
        goldCost: 24,
        effects: [],
      },
      {
        id: "c-unrest-mid-accept",
        label: "Ignore petitions: city loses 18 HP",
        goldCost: 0,
        effects: [{ type: "damageCity", amount: 18 }],
      },
    ],
  },
  {
    packageId: "c-raid-late",
    eventId: "c-raid-late",
    decade: 0,
    title: "Late-war assault",
    description: "A delayed raid strikes as the endgame nears.",
    choices: [
      {
        id: "c-raid-late-pay",
        label: "Emergency levy: pay {goldCost} gold",
        goldCost: 35,
        effects: [],
      },
      {
        id: "c-raid-late-accept",
        label: "Hold the line poorly: city loses 30 HP",
        goldCost: 0,
        effects: [{ type: "damageCity", amount: 30 }],
      },
      {
        id: "c-raid-late-def",
        label: "Last-minute wards: pay {goldCost} gold (no HP loss)",
        goldCost: 20,
        effects: [],
      },
    ],
  },
  {
    packageId: "c-unrest-late",
    eventId: "c-unrest-late",
    decade: 0,
    title: "Late-war unrest",
    description: "The city tires of unpaid promises.",
    choices: [
      {
        id: "c-unrest-late-pay",
        label: "Appease the crowd: pay {goldCost} gold",
        goldCost: 30,
        effects: [],
      },
      {
        id: "c-unrest-late-accept",
        label: "Crack down hard: city loses 22 HP",
        goldCost: 0,
        effects: [{ type: "damageCity", amount: 22 }],
      },
    ],
  },
  {
    packageId: "c-raid-finale",
    eventId: "c-raid-finale",
    decade: 0,
    title: "Pre-finale ambush",
    description: "An ambush is forming on the last road, born of a warning you let pass before the Demon King.",
    choices: [
      {
        id: "c-raid-finale-pay",
        label: "Burn the treasury: pay {goldCost} gold",
        goldCost: 40,
        effects: [],
      },
      {
        id: "c-raid-finale-accept",
        label: "Suffer the ambush: city loses 35 HP",
        goldCost: 0,
        effects: [{ type: "damageCity", amount: 35 }],
      },
      {
        id: "c-raid-finale-combo",
        label: "Desperate stand: heal 15 then lose 25 HP",
        goldCost: 0,
        effects: [
          { type: "healCity", amount: 15 },
          { type: "damageCity", amount: 25 },
        ],
      },
    ],
  },
  {
    packageId: "c-unrest-finale",
    eventId: "c-unrest-finale",
    decade: 0,
    title: "Finale unrest",
    description: "The people nearly revolt before the final battle.",
    choices: [
      {
        id: "c-unrest-finale-pay",
        label: "Grand feast: pay {goldCost} gold",
        goldCost: 36,
        effects: [],
      },
      {
        id: "c-unrest-finale-accept",
        label: "Let them flee: city loses 28 HP",
        goldCost: 0,
        effects: [{ type: "damageCity", amount: 28 }],
      },
    ],
  },
];
