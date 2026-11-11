/**
 * Authored fallback scenes. Costs and effects stay on the engine package.
 * Labels are orders, not mechanical summaries.
 */
export type FallbackScene = {
  title: string;
  description: string;
  choices: Record<string, string>;
};

export const FALLBACK_SCENES: Record<string, FallbackScene> = {
  "d1-scouts-a": {
    title: "Scouts at the gate",
    description:
      "My lord, enemy scouts linger beyond the gate. The watch can harden the walls, buy their silence, or let them pass.",
    choices: {
      "d1-scouts-a-pay-def": "Reinforce the gate before the scouts slip through",
      "d1-scouts-a-bribe": "Buy the scouts' silence and send them off the road",
      "d1-scouts-a-skip": "Let the scouts pass and keep the watch as it is",
    },
  },
  "d1-envoy-b": {
    title: "Nervous border envoy",
    description:
      "My lord, a border envoy is at the gate begging an escort before the first assault. The watch is waiting on your order.",
    choices: {
      "d1-envoy-b-pay": "Fund an escort and harden the approach",
      "d1-envoy-b-heal": "Share the stores with the envoy's party",
      "d1-envoy-b-skip": "Send the envoy away empty-handed",
    },
  },
  "d1-supplies-a": {
    title: "Supply dilemma",
    description:
      "My lord, the storekeepers stand in the yard with a short tally. Buy what they offer, tax the stalls, refuse them, or wait.",
    choices: {
      "d1-supplies-a-pay": "Buy the offered stores for the city",
      "d1-supplies-a-gold": "Tax the stalls and take their surplus",
      "d1-supplies-a-hurt": "Refuse the offer and let the stores spoil",
      "d1-supplies-a-skip": "Delay the decision until the stalls close",
    },
  },
  "d1-labor-b": {
    title: "Exhausted work crews",
    description:
      "My lord, the labor crews have stopped on the wall. They will not lift another stone until you answer.",
    choices: {
      "d1-labor-b-pay": "Pay the crews and keep the walls sound",
      "d1-labor-b-discount": "Promise the crews cheaper stone on the next works",
      "d1-labor-b-hurt": "Order the crews onward without wages",
    },
  },
  "d2-caravan-a": {
    title: "Trade opportunity",
    description:
      "My lord, a caravan blocks the south road and will not unload until you choose. Taking their purse or their prices both strain the city later.",
    choices: {
      "d2-caravan-a-gold": "Take the caravan's purse and send them on",
      "d2-caravan-a-discount": "Lock their prices and work the crews through the night",
      "d2-caravan-a-skip": "Turn the caravan away from the south road",
    },
  },
  "d2-guild-b": {
    title: "Builders' guild charter",
    description:
      "My lord, the builders' guild waits in the square with a charter. Pay their fee, demand tribute, or leave the paper unsigned.",
    choices: {
      "d2-guild-b-pay": "Pay the guild fee and take their preferred rates",
      "d2-guild-b-gold": "Demand tribute from the guild instead",
      "d2-guild-b-skip": "Ignore the guild and leave the charter unsigned",
    },
  },
  "d2-patrol-a": {
    title: "Night patrol request",
    description:
      "My lord, the night captains are formed in the yard and want orders before the orcs test the walls.",
    choices: {
      "d2-patrol-a-pay": "Fund a doubled night patrol",
      "d2-patrol-a-heal": "Rest the wounded instead of doubling the watch",
      "d2-patrol-a-skip": "Keep the night watch thin",
      "d2-patrol-a-risk": "Press civilians into the night service",
    },
  },
  "d2-omen-b": {
    title: "Ill omen at the shrine",
    description:
      "My lord, the priests will not leave the shrine steps. They want an offering, a blessing, or to be dismissed.",
    choices: {
      "d2-omen-b-pay": "Leave an offering at the shrine",
      "d2-omen-b-maxhp": "Let the priests bless the walls",
      "d2-omen-b-skip": "Dismiss the omen and close the shrine",
    },
  },
  "d3-threat-a": {
    title: "Wolf howls beyond the treeline",
    description:
      "My lord, wolves are pacing the treeline and the night watch wants orders before they test the palisade.",
    choices: {
      "d3-threat-a-pay": "Raise barricades against the wolves",
      "d3-threat-a-heal": "Tend the wounded from the latest probes",
      "d3-threat-a-gold": "Strip the spare racks for a quick surplus",
      "d3-threat-a-skip": "Leave the wolves unanswered for now",
    },
  },
  "d3-market-b": {
    title: "Hunters demand hazard pay",
    description:
      "My lord, hunters crowd the west gate and will not range the wolf woods until you answer their terms.",
    choices: {
      "d3-market-b-discount": "Bargain cheaper timber from the hunting camps",
      "d3-market-b-maxhp": "Raise extra lodges along the palisade",
      "d3-market-b-skip": "Turn the hunters away from the gate",
    },
  },
  "d4-threat-a": {
    title: "Cyclops tracks in the mud",
    description:
      "My lord, a cyclops has left fresh tracks beyond the north fields. The farmers will not stay unless you act.",
    choices: {
      "d4-threat-a-pay": "Raise barricades against the cyclops",
      "d4-threat-a-heal": "Tend the wounded from the latest probes",
      "d4-threat-a-gold": "Strip the spare racks for a quick surplus",
      "d4-threat-a-skip": "Leave the cyclops unanswered for now",
    },
  },
  "d4-market-b": {
    title: "Quarry collapse rumor",
    description:
      "My lord, masons stand in the quarry yard and will not keep cutting stone until you decide.",
    choices: {
      "d4-market-b-discount": "Strike a cheaper stone contract with the masons",
      "d4-market-b-maxhp": "Shore the quarry sheds and storehouses",
      "d4-market-b-skip": "Send the masons back to the quarry unanswered",
    },
  },
  "d5-threat-a": {
    title: "Wyvern shadow over the spires",
    description:
      "My lord, a wyvern's shadow crosses the spires. The tower watch is shouting for a decision before the next pass.",
    choices: {
      "d5-threat-a-pay": "Raise barricades against the wyvern",
      "d5-threat-a-heal": "Tend the wounded from the latest probes",
      "d5-threat-a-gold": "Strip the spare racks for a quick surplus",
      "d5-threat-a-skip": "Leave the wyvern unanswered for now",
    },
  },
  "d5-market-b": {
    title: "Alchemists sell fire oil",
    description:
      "My lord, alchemists have wheeled casks of fire oil into the east market and will not leave until you speak.",
    choices: {
      "d5-market-b-discount": "Strike a supply bargain for cheaper city works",
      "d5-market-b-maxhp": "Claim casks to reinforce shelters and storehouses",
      "d5-market-b-skip": "Send the alchemists away empty-handed",
    },
  },
  "d6-threat-a": {
    title: "Lich whispers in the crypt",
    description:
      "My lord, a cold voice in the crypt has the burial crews refusing the night shift. They wait at the stair.",
    choices: {
      "d6-threat-a-pay": "Raise barricades against the lich",
      "d6-threat-a-heal": "Tend the wounded from the latest probes",
      "d6-threat-a-gold": "Strip the spare racks for a quick surplus",
      "d6-threat-a-skip": "Leave the lich unanswered for now",
    },
  },
  "d6-market-b": {
    title: "Necromancer's bargain",
    description:
      "My lord, a necromancer's agent waits at the crypt gate. The priests want an answer before dusk.",
    choices: {
      "d6-market-b-discount": "Accept warded tools that cheapen later works",
      "d6-market-b-maxhp": "Seal extra crypt vaults into the city's bulk",
      "d6-market-b-skip": "Dismiss the agent from the crypt gate",
    },
  },
  "d7-threat-a": {
    title: "Lesser demon sighted",
    description:
      "My lord, a lesser demon was seen on the ash road. The gate captain will not close the watch without your order.",
    choices: {
      "d7-threat-a-pay": "Raise barricades against the lesser demon",
      "d7-threat-a-heal": "Tend the wounded from the latest probes",
      "d7-threat-a-gold": "Strip the spare racks for a quick surplus",
      "d7-threat-a-skip": "Leave the lesser demon unanswered for now",
    },
  },
  "d7-market-b": {
    title: "Hellgate cracks",
    description:
      "My lord, hellfire has split the old chapel floor. Wardens and masons are in the nave, each demanding an order.",
    choices: {
      "d7-market-b-discount": "Buy warded stone so later works cost less",
      "d7-market-b-maxhp": "Brace the chapel into a thicker refuge",
      "d7-market-b-skip": "Leave the cracked chapel to the wardens",
    },
  },
  "d8-threat-a": {
    title: "Demon banners on the ridge",
    description:
      "My lord, demon banners stand on the ridge. The outer companies are formed in the yard and waiting.",
    choices: {
      "d8-threat-a-pay": "Raise barricades against the demon host",
      "d8-threat-a-heal": "Tend the wounded from the latest probes",
      "d8-threat-a-gold": "Strip the spare racks for a quick surplus",
      "d8-threat-a-skip": "Leave the demon host unanswered for now",
    },
  },
  "d9-threat-a": {
    title: "Dragon smoke on the horizon",
    description:
      "My lord, dragon smoke stains the horizon. The roofs are clearing and the watch wants a decision before the next pass.",
    choices: {
      "d9-threat-a-pay": "Raise barricades against the dragon",
      "d9-threat-a-heal": "Tend the wounded from the latest probes",
      "d9-threat-a-gold": "Strip the spare racks for a quick surplus",
      "d9-threat-a-skip": "Leave the dragon unanswered for now",
    },
  },
  "d9-market-b": {
    title: "Dragon cult emissaries",
    description:
      "My lord, dragon-cult emissaries stand in the high square. The crowd will not disperse until you answer.",
    choices: {
      "d9-market-b-discount": "Take their tribute terms for cheaper later works",
      "d9-market-b-maxhp": "Convert their wagons into extra refuges",
      "d9-market-b-skip": "Drive the emissaries out of the square",
    },
  },
  "d10-threat-a": {
    title: "Demon King envoys",
    description:
      "My lord, envoys of the Demon King stand outside the final gate. The household is silent, waiting for your order.",
    choices: {
      "d10-threat-a-pay": "Raise barricades against the Demon King's envoys",
      "d10-threat-a-heal": "Tend the wounded from the latest probes",
      "d10-threat-a-gold": "Strip the spare racks for a quick surplus",
      "d10-threat-a-skip": "Leave the Demon King's envoys unanswered for now",
    },
  },
  "c-raid-wave1": {
    title: "Raid on the outskirts",
    description:
      "My lord, raiders are already in the outer street after an earlier lapse at the gate. The militia will not move until you speak.",
    choices: {
      "c-raid-wave1-pay": "Hire militia to bar the streets",
      "c-raid-wave1-def": "Raise the barricades with the crews you have",
      "c-raid-wave1-accept": "Let the raid through the outer street",
    },
  },
  "c-unrest-wave1": {
    title: "Market unrest",
    description:
      "My lord, a crowd from an earlier hard bargain is shouting in the market square and will not clear the stalls.",
    choices: {
      "c-unrest-wave1-pay": "Pay the crowd to barricade the market",
      "c-unrest-wave1-accept": "Let the riot run through the square",
    },
  },
  "c-shortage-wave2": {
    title: "Material shortage",
    description:
      "My lord, the builders are short of stone after an earlier caravan or guild was turned aside. The scaffolds stand unfinished.",
    choices: {
      "c-shortage-wave2-pay": "Import stone for the unfinished works",
      "c-shortage-wave2-discount": "Work the crews harder for cheaper stone",
      "c-shortage-wave2-hurt": "Strip scaffolds into barricades",
    },
  },
  "c-raid-wave2": {
    title: "Orc probing raid",
    description:
      "My lord, a probing raid is testing the walls after an earlier lapse in the watch. The captains want an order now.",
    choices: {
      "c-raid-wave2-pay": "Pay for a sortie and trenches",
      "c-raid-wave2-def": "Dig the trenches without extra pay",
      "c-raid-wave2-accept": "Loot the breach and fall back",
    },
  },
  "c-raid-mid": {
    title: "Mid-campaign raid",
    description:
      "My lord, a sharp raid is back at the farms after an earlier warning was left unanswered. The line will not hold without an order.",
    choices: {
      "c-raid-mid-pay": "Hire mercenaries to hold the line",
      "c-raid-mid-accept": "Hold the line with the city companies",
      "c-raid-mid-heal-cost": "Trade blood for cheaper later works",
    },
  },
  "c-unrest-mid": {
    title: "Mid-campaign unrest",
    description:
      "My lord, petitioners fill the square over an earlier refusal or a stripped store. They will not leave the steps.",
    choices: {
      "c-unrest-mid-pay": "Feed the crowd and man the square",
      "c-unrest-mid-accept": "Ignore the petitions in the square",
    },
  },
  "c-raid-late": {
    title: "Late-war assault",
    description:
      "My lord, a delayed raid is in the outer district as the endgame nears. The levy and the barricade crews are both waiting.",
    choices: {
      "c-raid-late-pay": "Buy a full levy for the outer streets",
      "c-raid-late-accept": "Leave the district exposed",
      "c-raid-late-def": "Barricade the streets short-handed",
    },
  },
  "c-unrest-late": {
    title: "Late-war unrest",
    description:
      "My lord, the streets are one insult from riot. The crowd is tired of an earlier unpaid promise and will not disperse.",
    choices: {
      "c-unrest-late-pay": "Appease the crowd and arm the square",
      "c-unrest-late-accept": "Crack down on the crowd",
    },
  },
  "c-raid-finale": {
    title: "Pre-finale ambush",
    description:
      "My lord, an ambush is forming on the last road after a warning you let pass. The household is waiting at the gate.",
    choices: {
      "c-raid-finale-pay": "Pay to break the ambush on the last road",
      "c-raid-finale-accept": "Loot the ambush and fall back",
      "c-raid-finale-combo": "Stand in the road and hold the pass",
    },
  },
  "c-unrest-finale": {
    title: "Finale unrest",
    description:
      "My lord, the people are gathered at the last gate and nearly ready to leave the walls before the final battle.",
    choices: {
      "c-unrest-finale-pay": "Feast the city and man the last gate",
      "c-unrest-finale-accept": "Let them flee the walls",
    },
  },
};
