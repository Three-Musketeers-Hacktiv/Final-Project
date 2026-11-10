import type { StaticImageData } from "next/image";
import { gameConfig } from "../../src/game/config";
import { MONSTER_ATTACKS, type MonsterAttack } from "./battleSprites";
import goblinGroup from "./assets/waves/goblin_group_1.png";
import ogreGroup from "./assets/waves/ogre_group_2.png";
import wave03 from "./assets/waves/wave_03.png";
import wave04 from "./assets/waves/wave_04.png";
import wave05 from "./assets/waves/wave_05.png";
import wave06 from "./assets/waves/wave_06.png";
import wave07 from "./assets/waves/wave_07.png";
import wave08 from "./assets/waves/wave_08.png";
import wave09 from "./assets/waves/wave_09.png";
import wave10 from "./assets/waves/wave_10.png";

/** A wave picture plus the measurements the battle scene needs to place, size and topple it. */
type WaveArt = {
  src: StaticImageData;
  /** Width in the battle scene, in % of the scene's width. The art files are not drawn at one shared
   *  scale, so each wave sets its own: groups stay goblin-sized, bosses tower over them. */
  width: number;
  /** Transparent rows under the monsters' feet, as a fraction of the art's height. */
  footPadding: number;
  /** Where the art splits between its monsters (fractions of its width), so each can fall on its own.
   *  Empty for a single monster. */
  splits: number[];
  /** How far the feet go into the grass, as a fraction of the grass strip's height. The town stands
   *  0.2 deep; monsters stand shallower so their feet stay visible. Larger art needs a little more. */
  sink: number;
  /** Flies: bobs in the air and drops out of the sky on death instead of toppling over. */
  flying?: boolean;
  /** Monsters (by position, left to right, as split by `splits`) that hold their ground when the
   *  wave attacks; the others charge. They still flash when the wave is hit. */
  anchored?: number[];
  /** The monsters never charge: the soldiers march out to them and attack instead. */
  stationary?: boolean;
  /** Where the camera aims when it closes in on this wave, as fractions of the art (default: center). */
  focus?: [number, number];
  /** How a standing wave dies (default "topple"); "knockback" shoves it back, blinks it and lets it vanish. */
  death?: "topple" | "knockback";
  /** Extra lift above standing height for a flyer, in % of the scene width. */
  hover?: number;
};

// Measured from the PNGs (alpha): feet = empty rows below the foot line / height; splits = the emptiest
// column between two monsters / width.
const ART: Record<number, WaveArt> = {
  1: { src: goblinGroup, width: 22, footPadding: 144 / 765, splits: [447 / 1038, 696 / 1038], sink: 0.1 },
  2: { src: ogreGroup, width: 22, footPadding: 126 / 719, splits: [477 / 1212, 799 / 1212], sink: 0.1 },
  3: { src: wave03, width: 20.5, footPadding: 33 / 320, splits: [], sink: 0.1, death: "knockback" },
  // Stretched 20% taller (same width) from the generated art, so the cyclops tower rather than squat.
  4: { src: wave04, width: 19.3, footPadding: 30 / 1094, splits: [680 / 1386], sink: 0.1 },
  5: { src: wave05, width: 25, footPadding: 33 / 323, splits: [], sink: 0.1, flying: true, hover: 9 },
  // The lich (middle) stays back casting while its two skeletons charge.
  6: { src: wave06, width: 26, footPadding: 30 / 932, splits: [417 / 1389, 963 / 1389], sink: 0.1, anchored: [1] },
  // The imps keep the height they were placed at: their lowest point (a tail) 0.156 of the grass strip deep.
  7: { src: wave07, width: 20.2, footPadding: 31 / 709, splits: [874 / 1512], sink: 0.156, flying: true },
  8: { src: wave08, width: 26, footPadding: 33 / 347, splits: [], sink: 0.1, death: "knockback" },
  // The dragon stands on its horizontal fire line (bottom at row 411), not its claw tips (row 428).
  9: { src: wave09, width: 28, footPadding: 50 / 462, splits: [], sink: 0.1, stationary: true, death: "knockback" },
  // The camera closes in on his face when he is sealed (the face is at 300, 220 of 855 × 1276).
  10: {
    src: wave10,
    width: 13.4,
    footPadding: 31 / 1276,
    splits: [],
    sink: 0.1,
    stationary: true,
    focus: [300 / 855, 220 / 1276],
  },
};

// Wave numbers, days, names, HP and attack come from the engine (gameConfig / GameView.wavePreview).
// The UI adds a line of flavor.
const DESCRIPTION: Record<number, string> = {
  1: "A pack of goblins is closing in on the city walls.",
  2: "Orc warriors march on the city, stronger than anything before.",
  3: "A great wolf circles the walls, faster and hungrier than any beast before it.",
  4: "Two cyclops brutes lumber toward the gate, shrugging off arrows like rain.",
  5: "A wyvern dives from the clouds, its shadow sweeping over the rooftops.",
  6: "A lich raises the dead, wearing the defenders down night after night.",
  7: "Winged imps swarm over the walls, jabbing with burning tridents.",
  8: "A demon of the deep marches on the city, armored in flame.",
  9: "A dragon wakes, and the sky over the city burns.",
  10: "The Demon King comes for the city himself. Hold one last time.",
};

type WaveDisplay = {
  name: string;
  description: string;
  art: StaticImageData | null;
  artWidth: number;
  artFootPadding: number;
  artSplits: number[];
  artSink: number;
  artFlying: boolean;
  artAnchored: number[];
  artStationary: boolean;
  artHover: number;
  artFocus: [number, number];
  artDeath: "topple" | "knockback";
  /** The wave's own attack effect, or null (waves 1–2). */
  artAttack: MonsterAttack | null;
};

export type UpcomingWave = { wave: number; day: number; name: string; art: StaticImageData | null };

export function waveInfo(wave: number, engineName: string): WaveDisplay {
  const art = ART[wave];
  return {
    name: engineName,
    description: DESCRIPTION[wave] ?? "",
    art: art?.src ?? null,
    artWidth: art?.width ?? 22,
    artFootPadding: art?.footPadding ?? 0,
    artSplits: art?.splits ?? [],
    artSink: art?.sink ?? 0.03,
    artFlying: art?.flying ?? false,
    artAnchored: art?.anchored ?? [],
    artStationary: art?.stationary ?? false,
    artHover: art?.hover ?? 0,
    artFocus: art?.focus ?? [0.5, 0.5],
    artDeath: art?.death ?? "topple",
    artAttack: MONSTER_ATTACKS[wave] ?? null,
  };
}

/** Waves not yet beaten (`state.wavesCleared`), for the Upcoming Waves panel. */
export function upcomingWaves(wavesCleared: number): UpcomingWave[] {
  return gameConfig.waves
    .filter((wave) => wave.wave > wavesCleared)
    .map((wave) => {
      const { name, art } = waveInfo(wave.wave, wave.name);
      return { wave: wave.wave, day: wave.day, name, art };
    });
}
