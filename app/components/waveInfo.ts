import { gameConfig } from "../../src/game/config";

// Display text and placeholder enemy lists per wave. Wave numbers, days, HP and attack come from the
// engine (gameConfig / GameView.wavePreview); its wave names are Indonesian, so the UI names them here.
const WAVE_INFO: Record<number, { name: string; description: string; enemies: string[] }> = {
  1: {
    name: "Goblin Horde",
    description: "A pack of goblins is closing in on the city walls.",
    enemies: ["Goblin", "Goblin", "Goblin", "Goblin"],
  },
  2: {
    name: "Orc Warband",
    description: "Orc warriors march on the city, stronger than anything before.",
    enemies: ["Orc", "Orc", "Ogre"],
  },
};

export function waveInfo(wave: number, engineName: string) {
  return WAVE_INFO[wave] ?? { name: engineName, description: "", enemies: ["Monster"] };
}

/** Waves not yet beaten (`state.wavesCleared`), for the Upcoming Waves panel. */
export function upcomingWaves(wavesCleared: number) {
  return gameConfig.waves
    .filter((wave) => wave.wave > wavesCleared)
    .map((wave) => ({ wave: wave.wave, day: wave.day, enemies: waveInfo(wave.wave, wave.name).enemies }));
}
