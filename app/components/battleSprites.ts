import thrustSheet from "./assets/battle/thrust/thrust.png";
import thrustData from "./assets/battle/thrust/thrust.json";
import nukeSheet from "./assets/battle/defeat/nuke_small.webp";
import nukeData from "./assets/battle/defeat/nuke_small.json";
import { spriteSheet } from "./spriteSheet";

/** The soldiers' thrust, played on every hit of a battle replay. */
export const THRUST = spriteSheet(thrustSheet, thrustData);

/**
 * The explosion over the fallen town. nuke_small.webp is a repack of the pixelfx "Nuke" export (not
 * kept in the repo): its first 6 s at 15 fps and 75% size, so phones can load it.
 */
export const EXPLOSION = spriteSheet(nukeSheet, nukeData);

/** Tints a sprite red while it takes a hit. */
export const HIT_FILTER = "sepia(1) saturate(8) hue-rotate(-50deg) brightness(0.85)";

export function thrustFrameAt(ms: number): number | null {
  return THRUST.frameAt(ms);
}
