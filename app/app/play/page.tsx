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

      {/* 1 column on phones, play area + side stack on laptops, 3 columns on wide screens */}
      <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-5">
          <CityRecord {...run.city} />
          <CityStatus {...run.stats} />
          <Resources gold={run.gold} />
        </div>

        {/* Main play area comes first until the 3-column layout */}
        <div className="order-first flex flex-col gap-5 lg:row-span-2 xl:order-none xl:row-span-1">
          <BattleScene
            cityLevel={run.stats.cityLevel}
            wallLevel={run.stats.wallLevel}
            troopLevel={run.stats.troopLevel}
            waveName={run.currentWave.name}
            hp={run.currentWave.hp}
            maxHp={run.currentWave.hp}
            enemies={sceneEnemies}
          />
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
