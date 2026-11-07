import type { Metadata } from "next";
import { Alegreya } from "next/font/google";
import Actions from "@/components/Actions";
import BattleScene from "@/components/BattleScene";
import CityRecord from "@/components/CityRecord";
import CityStatus from "@/components/CityStatus";
import Resources from "@/components/Resources";
import ThemeProvider from "@/components/ThemeProvider";
import ThisWave from "@/components/ThisWave";
import Timeline from "@/components/Timeline";
import TopBar from "@/components/TopBar";
import UpcomingWaves from "@/components/UpcomingWaves";
import { mockRun } from "./mockData";

const gameFont = Alegreya({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Play",
};

export default function PlayPage() {
  const run = mockRun;
  const sceneEnemies = ["Goblin", "Goblin", "Goblin", "Ogre"];

  return (
    <ThemeProvider className={`${gameFont.className} flex min-h-dvh flex-1 flex-col bg-ink text-parchment`}>
      <TopBar day={run.day} lastDay={run.lastDay} daysUntilInvasion={run.daysUntilInvasion} />

      <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-[minmax(0,1fr)] gap-5 p-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-5">
          <CityRecord {...run.city} />
          <CityStatus {...run.stats} />
          <Resources gold={run.gold} />
        </div>

        {/* Main play area comes first on small screens */}
        <div className="order-first flex flex-col gap-5 lg:order-none">
          <BattleScene enemies={sceneEnemies} />
          <Actions />
          <Timeline entries={run.timeline} />
        </div>

        <div className="flex flex-col gap-5">
          <ThisWave {...run.currentWave} />
          <UpcomingWaves waves={run.upcomingWaves} />
        </div>
      </main>
    </ThemeProvider>
  );
}
