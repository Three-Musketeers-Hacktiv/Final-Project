/** Pre-battle consequence window hint used by skip/refuse choices. */
const PRE_BATTLE = { minDelayDays: 1, maxDelayDays: 3 };
function consec(packageId) {
    return { packageId, ...PRE_BATTLE };
}
/**
 * Scheduled packages are pooled by decade. Each run picks 2 prep days + packages.
 * At least one free choice per package. Skip/refuse choices may schedule consequences.
 */
export const SCHEDULED_EVENT_PACKAGES = [
    // Decade 1
    {
        packageId: "d1-scouts-a",
        eventId: "d1-scouts-a",
        decade: 1,
        title: "Scouts at the gate",
        description: "My lord, enemy scouts linger beyond the gate. We can harden the walls, pay for quiet rumors, or let them pass.",
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
        description: "A border envoy begs escort coin before the first wave. Paying hardens our walls; refusing costs nothing today.",
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
        description: "The stores run low. Buy supplies, squeeze workers for gold, or refuse and risk later damage.",
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
function buildLaterDecades() {
    const rows = [
        {
            decade: 3,
            wave: 3,
            titleA: "Wolf howls beyond the treeline",
            titleB: "Hunters demand hazard pay",
            consecRaid: "c-raid-mid",
            consecUnrest: "c-unrest-mid",
        },
        {
            decade: 4,
            wave: 4,
            titleA: "Cyclops tracks in the mud",
            titleB: "Quarry collapse rumor",
            consecRaid: "c-raid-mid",
            consecUnrest: "c-unrest-mid",
        },
        {
            decade: 5,
            wave: 5,
            titleA: "Wyvern shadow over the spires",
            titleB: "Alchemists sell fire oil",
            consecRaid: "c-raid-mid",
            consecUnrest: "c-unrest-mid",
        },
        {
            decade: 6,
            wave: 6,
            titleA: "Lich whispers in the crypt",
            titleB: "Necromancer's bargain",
            consecRaid: "c-raid-late",
            consecUnrest: "c-unrest-late",
        },
        {
            decade: 7,
            wave: 7,
            titleA: "Lesser demon sighted",
            titleB: "Hellgate cracks",
            consecRaid: "c-raid-late",
            consecUnrest: "c-unrest-late",
        },
        {
            decade: 8,
            wave: 8,
            titleA: "Demon banners on the ridge",
            titleB: "Iron levy demand",
            consecRaid: "c-raid-late",
            consecUnrest: "c-unrest-late",
        },
        {
            decade: 9,
            wave: 9,
            titleA: "Dragon smoke on the horizon",
            titleB: "Dragon cult emissaries",
            consecRaid: "c-raid-finale",
            consecUnrest: "c-unrest-finale",
        },
        {
            decade: 10,
            wave: 10,
            titleA: "Demon King envoys",
            titleB: "Final mustering call",
            consecRaid: "c-raid-finale",
            consecUnrest: "c-unrest-finale",
        },
    ];
    const packages = [];
    for (const row of rows) {
        const d = row.decade;
        const w = row.wave;
        packages.push({
            packageId: `d${d}-threat-a`,
            eventId: `d${d}-threat-a`,
            decade: d,
            title: row.titleA,
            description: `My lord, danger gathers before wave ${w}. Pay for defense, take a risky shortcut, or save gold and face later fallout.`,
            choices: [
                {
                    id: `d${d}-threat-a-pay`,
                    label: `Fortify: pay {goldCost} gold, defense +${3 + Math.floor(d / 3)} for wave ${w}`,
                    goldCost: 18 + d,
                    effects: [{ type: "nextWaveDefense", amount: 3 + Math.floor(d / 3), wave: w }],
                },
                {
                    id: `d${d}-threat-a-heal`,
                    label: `Tend the wounded: heal ${12 + d} HP`,
                    goldCost: 0,
                    effects: [{ type: "healCity", amount: 12 + d }],
                },
                {
                    id: `d${d}-threat-a-gold`,
                    label: `Strip the armory for coin: gold +${14 + d}`,
                    goldCost: 0,
                    effects: [{ type: "grantGold", amount: 14 + d }],
                    consequence: consec(row.consecUnrest),
                },
                {
                    id: `d${d}-threat-a-skip`,
                    label: "Do nothing for now.",
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
            description: `Merchants and captains quarrel before wave ${w}. Choose carefully; greed may return as a consequence.`,
            choices: [
                {
                    id: `d${d}-market-b-discount`,
                    label: `Buy goodwill: pay {goldCost} gold for 25% upgrade discount until wave ${w}`,
                    goldCost: 15 + d,
                    effects: [{ type: "upgradeDiscount", rate: 0.25, untilWave: w }],
                },
                {
                    id: `d${d}-market-b-maxhp`,
                    label: `Expand shelters: +${15 + Math.floor(d / 2)} Max HP`,
                    goldCost: 0,
                    effects: [{ type: "maxHpBonus", amount: 15 + Math.floor(d / 2) }],
                },
                {
                    id: `d${d}-market-b-skip`,
                    label: "Refuse every demand.",
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
export const CONSEQUENCE_TARGET_WAVE = {
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
export function isTrustedConsequencePackage(originPackageId, scheduledPackageId) {
    if (originPackageId === scheduledPackageId)
        return true;
    const seen = new Set();
    let current = originPackageId;
    while (!seen.has(current)) {
        seen.add(current);
        const next = CONSEQUENCE_SUCCESSOR[current];
        if (!next)
            return false;
        if (next === scheduledPackageId)
            return true;
        current = next;
    }
    return false;
}
/** Trusted package to schedule when the original target wave can no longer be reached. */
export const CONSEQUENCE_SUCCESSOR = {
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
export const CONSEQUENCE_PACKAGES = [
    {
        packageId: "c-raid-wave1",
        eventId: "c-raid-wave1",
        decade: 0,
        title: "Night raid fallout",
        description: "The scouts you ignored return with raiders. Mitigate the damage or endure it, my lord.",
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
        description: "Your earlier thrift sparks unrest in the markets.",
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
        description: "Builders lack materials after the guild snub.",
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
        description: "Thin patrols invite a probing raid before the host arrives.",
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
        description: "Greedy earlier choices sour the people.",
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
        description: "Ignored omens culminate in an ambush before the Demon King.",
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
