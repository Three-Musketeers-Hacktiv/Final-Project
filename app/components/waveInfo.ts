import type { StaticImageData } from "next/image";
import { gameConfig } from "../../src/game/config";
import goblinGroup from "./assets/waves/goblin_group_1.png";
import ogreGroup from "./assets/waves/ogre_group_2.png";

// Display text and art per wave. Wave numbers, days, HP and attack come from the
// engine (gameConfig / GameView.wavePreview); its wave names are Indonesian, so the UI names them here.
type WaveDisplay = {
  name: string;
  description: string;
  art: StaticImageData | null;
  /** Transparent rows under the monsters' feet, as a fraction of the art's height. */
  artFootPadding: number;
  /** Where the art splits between its monsters (fractions of its width), so each can fall on its own. */
  artSplits: number[];
};

const WAVE_INFO: Record<number, WaveDisplay> = {
  1: {
    name: "Goblin Horde",
    description: "A pack of goblins is closing in on the city walls.",
    art: goblinGroup,
    artFootPadding: 144 / 765,
    artSplits: [447 / 1038, 696 / 1038],
  },
  2: {
    name: "Orc Warband",
    description: "Orc warriors march on the city, stronger than anything before.",
    art: ogreGroup,
    artFootPadding: 126 / 719,
    artSplits: [477 / 1212, 799 / 1212],
  },
};

export type UpcomingWave = { wave: number; day: number; name: string; art: StaticImageData | null };

export function waveInfo(wave: number, engineName: string): WaveDisplay {
  return WAVE_INFO[wave] ?? { name: engineName, description: "", art: null, artFootPadding: 0, artSplits: [] };
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
