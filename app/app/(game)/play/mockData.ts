// Placeholder data the API doesn't provide yet (only the City Record panel still uses it).

import type { TimelineEntry } from "@/lib/timeline";

export type UpcomingWave = {
  wave: number;
  day: number;
  enemies: string[];
};

export const mockRun = {
  day: 6,
  lastDay: 100,
  daysUntilInvasion: 4,
  city: {
    name: "Asterfall",
    campaign: "Campaign 01",
    faction: "Kingdom of Aster",
    region: "Northreach Plains",
    difficulty: "Normal",
    tier: "Tier II (Town)",
    defenseType: "Walled City",
  },
  stats: {
    hp: 210,
    maxHp: 210,
    wallLevel: 1,
    troopLevel: 1,
    cityLevel: 3,
    maxLevel: 10,
    attack: 15,
    defense: 8,
    income: 49,
  },
  gold: 8,
  currentWave: {
    name: "Goblin Raid",
    hp: 150,
    attack: 22,
    description: "A group of goblins is approaching the city.",
  },
  upcomingWaves: [
    { wave: 1, day: 10, enemies: ["Goblin", "Goblin"] },
    { wave: 2, day: 20, enemies: ["Goblin", "Goblin", "Ogre"] },
    { wave: 3, day: 30, enemies: ["Goblin", "Ogre", "Bat"] },
  ] satisfies UpcomingWave[],
  timeline: [
    { day: 6, category: "city", tone: "city", icon: "cityLevel", highlight: "Upgraded City", text: "to Lv.3." },
    { day: 5, category: "event", tone: "gain", icon: "plus", highlight: "Gained 200 Gold", text: "from an event." },
    { day: 4, category: "city", tone: "city", icon: "wallLevel", highlight: "Upgraded Wall", text: "to Lv.1." },
    { day: 3, category: "city", tone: "city", icon: "troopLevel", highlight: "Recruited soldiers.", text: "Attack increased by 5." },
    { day: 2, category: "event", tone: "loss", icon: "minus", highlight: "Lost 30 Gold", text: "due to a supply shortage." },
    { day: 1, category: "city", tone: "neutral", icon: "upcomingWaves", text: "The city is prepared for the coming siege." },
  ] satisfies TimelineEntry[],
};
