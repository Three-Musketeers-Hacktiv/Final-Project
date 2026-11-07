import type { StaticImageData } from "next/image";
import city01 from "./assets/city/city_01_lv0-2.png";
import city02 from "./assets/city/city_02_lv3-4.png";
import city03 from "./assets/city/city_03_lv5-6.png";
import city04 from "./assets/city/city_04_lv7-9.png";
import city05 from "./assets/city/city_05_lv10.png";
import tower01 from "./assets/tower/tower_01_lv0-2.png";
import tower02 from "./assets/tower/tower_02_lv3-4.png";
import tower03 from "./assets/tower/tower_03_lv5-6.png";
import tower04 from "./assets/tower/tower_04_lv7-9.png";
import tower05 from "./assets/tower/tower_05_lv10.png";
import troop01a from "./assets/troops/troop_01_a_lv0-2.png";
import troop01b from "./assets/troops/troop_01_b_lv0-2.png";
import troop02a from "./assets/troops/troop_02_a_lv3-4.png";
import troop02b from "./assets/troops/troop_02_b_lv3-4.png";
import troop03a from "./assets/troops/troop_03_a_lv5-6.png";
import troop03b from "./assets/troops/troop_03_b_lv5-6.png";
import troop04a from "./assets/troops/troop_04_a_lv7-9.png";
import troop04b from "./assets/troops/troop_04_b_lv7-9.png";
import troop05a from "./assets/troops/troop_05_a_lv10.png";
import troop05b from "./assets/troops/troop_05_b_lv10.png";
import wall01 from "./assets/wall_background/wall_background_01_lv0-2.png";
import wall02 from "./assets/wall_background/wall_background_02_lv3-4.png";
import wall03 from "./assets/wall_background/wall_background_03_lv5-6.png";
import wall04 from "./assets/wall_background/wall_background_04_lv7-9.png";
import wall05 from "./assets/wall_background/wall_background_05_lv10.png";

/** Sprite tier (0-based index into the lists below) for a track level. */
export function spriteTier(level: number): number {
  if (level >= 10) return 4; // tier 05 is level 10 only
  if (level >= 7) return 3; // 7–9
  if (level >= 5) return 2; // 5–6
  if (level >= 3) return 1; // 3–4
  return 0; // 0–2
}

export const citySprites: StaticImageData[] = [city01, city02, city03, city04, city05];
export const towerSprites: StaticImageData[] = [tower01, tower02, tower03, tower04, tower05];
export const wallSprites: StaticImageData[] = [wall01, wall02, wall03, wall04, wall05];
export const troopSprites: [StaticImageData, StaticImageData][] = [
  [troop01a, troop01b],
  [troop02a, troop02b],
  [troop03a, troop03b],
  [troop04a, troop04b],
  [troop05a, troop05b],
];
