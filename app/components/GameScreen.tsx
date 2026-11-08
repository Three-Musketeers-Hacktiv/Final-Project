"use client";

import { mockRun } from "@/app/(game)/play/mockData";
import { gameConfig } from "../../src/game/config";
import Actions from "./Actions";
import BattleScene from "./BattleScene";
import CityRecord from "./CityRecord";
import CityStatus from "./CityStatus";
import GameToast from "./GameToast";
import { PlayMusic } from "./MusicProvider";
import PhaseDialogs from "./PhaseDialogs";
import { useGame } from "./GameProvider";
import Resources from "./Resources";
import ThisWave from "./ThisWave";
import Timeline from "./Timeline";
import TopBar from "./TopBar";
import UpcomingWaves from "./UpcomingWaves";
import { upcomingWaves, waveInfo } from "./waveInfo";

/** The /play dashboard, drawn from the GameView in GameProvider. */
export default function GameScreen() {
  const { game, pending, timeline, act } = useGame();
  const { state, stats, wavePreview } = game;
  const wave = wavePreview && { ...wavePreview, ...waveInfo(wavePreview.wave, wavePreview.name) };
  const fighting = state.phase === "battleReady" || state.phase === "battleReport";

  return (
    <>
      <PlayMusic track={fighting ? "battle" : "idle"} />
      <TopBar
        day={state.day}
        lastDay={gameConfig.lastDay}
        daysUntilInvasion={wavePreview ? wavePreview.day - state.day : null}
      />

      {/* 1 column on phones, play area + side stack on laptops, 3 columns on wide screens */}
      <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-5">
          {/* The API has no city profile yet, so this stays placeholder text. */}
          <CityRecord {...mockRun.city} />
          <CityStatus
            hp={state.cityHp}
            maxHp={state.cityMaxHp}
            wallLevel={state.wallLevel}
            troopLevel={state.troopLevel}
            cityLevel={state.cityLevel}
            maxLevel={gameConfig.maxTrackLevel}
            attack={stats.attack}
            defense={stats.defense}
            income={stats.dailyIncome}
          />
          <Resources gold={state.gold} />
        </div>

        {/* Main play area comes first until the 3-column layout */}
        <div className="order-first flex flex-col gap-5 lg:row-span-2 xl:order-none xl:row-span-1">
          <BattleScene
            cityLevel={state.cityLevel}
            wallLevel={state.wallLevel}
            troopLevel={state.troopLevel}
            waveName={wave?.name ?? ""}
            hp={wave?.hp ?? 0}
            maxHp={wave?.hp ?? 0}
            enemies={wave?.enemies ?? []}
          />
          <Actions
            phase={state.phase}
            actionUsedToday={state.actionUsedToday}
            costs={{ upgradeCity: stats.cityCost, upgradeTroops: stats.troopCost, upgradeWall: stats.wallCost, repairCity: stats.repairCost }}
            pending={pending}
            onAction={(id) => act(id, {})}
            onEndDay={() => act("endPreparationDay", {})}
          />
          {/* No history endpoint yet: only this session's actions are listed. */}
          <Timeline entries={timeline} />
        </div>

        <div className="flex flex-col gap-5">
          {wave && <ThisWave name={wave.name} hp={wave.hp} attack={wave.attack} description={wave.description} />}
          <UpcomingWaves waves={upcomingWaves(state.wavesCleared)} />
        </div>
      </main>
      <PhaseDialogs />
      <GameToast />
    </>
  );
}
