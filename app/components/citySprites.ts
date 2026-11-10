import type { StaticImageData } from "next/image";
import city01 from "./assets/city/city_01.png";
import city02 from "./assets/city/city_02.png";
import city03 from "./assets/city/city_03.png";
import city04 from "./assets/city/city_04.png";
import city05 from "./assets/city/city_05.png";
import city06 from "./assets/city/city_06.png";
import tower01 from "./assets/tower/tower_01.png";
import tower02 from "./assets/tower/tower_02.png";
import tower03 from "./assets/tower/tower_03.png";
import tower04 from "./assets/tower/tower_04.png";
import tower05 from "./assets/tower/tower_05.png";
import tower06 from "./assets/tower/tower_06.png";
import troop01a from "./assets/troops/troop_01_a.png";
import troop01b from "./assets/troops/troop_01_b.png";
import troop02a from "./assets/troops/troop_02_a.png";
import troop02b from "./assets/troops/troop_02_b.png";
import troop03a from "./assets/troops/troop_03_a.png";
import troop03b from "./assets/troops/troop_03_b.png";
import troop04a from "./assets/troops/troop_04_a.png";
import troop04b from "./assets/troops/troop_04_b.png";
import troop05a from "./assets/troops/troop_05_a.png";
import troop05b from "./assets/troops/troop_05_b.png";
import troop06a from "./assets/troops/troop_06_a.png";
import troop06b from "./assets/troops/troop_06_b.png";
import wall01 from "./assets/wall_background/wall_background_01.png";
import wall02 from "./assets/wall_background/wall_background_02.png";
import wall03 from "./assets/wall_background/wall_background_03.png";
import wall04 from "./assets/wall_background/wall_background_04.png";
import wall05 from "./assets/wall_background/wall_background_05.png";
import wall06 from "./assets/wall_background/wall_background_06.png";

/**
 * Sprite tier (0-based index into the lists below) for a track level, 0–18 (gameConfig.maxTrackLevel):
 * tier 01 covers levels 0–3, then each tier covers three levels (4–6, 7–9, 10–12, 13–15, 16–18).
 */
export function spriteTier(level: number): number {
  if (level <= 3) return 0;
  return Math.min(5, Math.floor((level - 1) / 3));
}

/** Tier names, by `spriteTier` index. */
export const TIER_NUMERALS = ["I", "II", "III", "IV", "V", "VI"];

/** Upgrades taken within the current tier: 0–3 in Tier I (levels 0–3), 1–3 in every later tier. */
export function levelInTier(level: number): number {
  return level <= 3 ? level : ((level - 1) % 3) + 1;
}

export const citySprites: StaticImageData[] = [city01, city02, city03, city04, city05, city06];
export const towerSprites: StaticImageData[] = [tower01, tower02, tower03, tower04, tower05, tower06];
export const wallSprites: StaticImageData[] = [wall01, wall02, wall03, wall04, wall05, wall06];
/** Per tier: [a, b]. `a` stands behind, `b` in front (nearest the monsters). */
export const troopSprites: [StaticImageData, StaticImageData][] = [
  [troop01a, troop01b],
  [troop02a, troop02b],
  [troop03a, troop03b],
  [troop04a, troop04b],
  [troop05a, troop05b],
  [troop06a, troop06b],
];
