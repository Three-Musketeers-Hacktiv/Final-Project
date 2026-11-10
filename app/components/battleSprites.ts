import thrustSheet from "./assets/battle/thrust/thrust.png";
import thrustData from "./assets/battle/thrust/thrust.json";
import nukeSheet from "./assets/battle/defeat/nuke_small.webp";
import nukeData from "./assets/battle/defeat/nuke_small.json";
import clawSheet from "./assets/battle/claw/claw-swipe.png";
import clawData from "./assets/battle/claw/claw-swipe.json";
import hammerSheet from "./assets/battle/hammer-smash/hammer-smash.webp";
import hammerData from "./assets/battle/hammer-smash/hammer-smash.json";
import iceSheet from "./assets/battle/ice-spikes/ice-spikes.webp";
import iceData from "./assets/battle/ice-spikes/ice-spikes.json";
import starSheet from "./assets/battle/star-fall/star-fall.webp";
import starData from "./assets/battle/star-fall/star-fall.json";
import cleaveSheet from "./assets/battle/heavy-cleave/heavy-cleave.webp";
import cleaveData from "./assets/battle/heavy-cleave/heavy-cleave.json";
import meteorSheet from "./assets/battle/meteor/meteor.webp";
import meteorData from "./assets/battle/meteor/meteor.json";
import darkSheet from "./assets/battle/dark-explosion/dark-explosion.webp";
import darkData from "./assets/battle/dark-explosion/dark-explosion.json";
import hexSheet from "./assets/battle/hex-sigil/hex-sigil.webp";
import hexData from "./assets/battle/hex-sigil/hex-sigil.json";
import { spriteSheet, type SpriteSheet } from "./spriteSheet";

// The .webp sheets are repacks of the pixelfx exports (the originals are not kept in the repo): the long
// ones keep every second frame (15 fps), meteor at 75% size, so phones can load them.

/** The soldiers' thrust, played on every hit of a battle replay. */
export const THRUST = spriteSheet(thrustSheet, thrustData);

/**
 * The explosion over the fallen town. nuke_small.webp is a repack of the pixelfx "Nuke" export (not
 * kept in the repo): its first 6 s at 15 fps and 75% size, so phones can load it.
 */
export const EXPLOSION = spriteSheet(nukeSheet, nukeData);

/** The sigil that seals the Demon King when the last wave is beaten. */
export const HEX_SIGIL = spriteSheet(hexSheet, hexData);
/** When the sigil flares (ms into it): the Demon King vanishes at this moment. */
export const HEX_SIGIL_FLARE_MS = 2640;

/** A wave's own attack effect, played on every hit of a battle replay. */
export type MonsterAttack = {
  sheet: SpriteSheet;
  /** "troops": a melee strike on the front soldiers, mirrored to come from the right.
   *  "town": a spell that lands on the town. */
  target: "troops" | "town";
  /** Ms into the effect where it visibly lands (its frames first reach half their peak size); this
   *  moment is lined up with the battle's hit. */
  impactMs: number;
  /** Melee strikes: sprite pixels per sheet pixel. Sized so a typical frame's solid part is about as
   *  tall as the monster on screen. */
  scale?: number;
  /** Spells on the town: mirror them (they are drawn travelling right; these fall from the right). */
  flip?: boolean;
  /** Draw scaled-up pixels crisp rather than smoothed. */
  pixelated?: boolean;
};

/** Per wave number. Waves 1 and 2 have no attack effect. */
export const MONSTER_ATTACKS: Record<number, MonsterAttack> = {
  3: { sheet: spriteSheet(clawSheet, clawData), target: "troops", impactMs: 66, scale: 4.4 },
  4: { sheet: spriteSheet(hammerSheet, hammerData), target: "troops", impactMs: 264, scale: 4.1 },
  5: { sheet: spriteSheet(iceSheet, iceData), target: "troops", impactMs: 264 },
  6: { sheet: spriteSheet(starSheet, starData), target: "town", impactMs: 462, flip: true },
  7: { sheet: THRUST, target: "troops", impactMs: 66 },
  8: { sheet: spriteSheet(cleaveSheet, cleaveData), target: "troops", impactMs: 363, scale: 2.9 },
  9: { sheet: spriteSheet(meteorSheet, meteorData), target: "town", impactMs: 660, flip: true },
  // Repacked at full size and lossless (a 75% lossy repack looked blurry when drawn over the town).
  10: { sheet: spriteSheet(darkSheet, darkData), target: "town", impactMs: 528, pixelated: true },
};

/** Tints a sprite red while it takes a hit. */
export const HIT_FILTER = "sepia(1) saturate(8) hue-rotate(-50deg) brightness(0.85)";

export function thrustFrameAt(ms: number): number | null {
  return THRUST.frameAt(ms);
}
