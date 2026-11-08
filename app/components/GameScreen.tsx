"use client";

import { useState } from "react";
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
import { useDayTimer, type Speed } from "./useDayTimer";
import { upcomingWaves, waveInfo } from "./waveInfo";

/** The /play dashboard, drawn from the GameView in GameProvider. */
export default function GameScreen() {
  const { game, pending, timeline, act } = useGame();
  const { state, stats, wavePreview } = game;
  const wave = wavePreview && { ...wavePreview, ...waveInfo(wavePreview.wave, wavePreview.name) };
  const fighting = state.phase === "battleReady" || state.phase === "battleReport";

  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  // Only preparation days tick; events, battles and rewards wait for the player.
  const clockRunning = !paused && state.phase === "preparation" && !pending;
  const dayProgress = useDayTimer({
    running: clockRunning,
    speed,
    day: state.day,
    onDayEnd: () => act("endPreparationDay", {}),
  });

  return (
    <>
      <PlayMusic track={fighting ? "battle" : "idle"} />
      <TopBar
        day={state.day}
        lastDay={gameConfig.lastDay}
        daysUntilInvasion={wavePreview ? wavePreview.day - state.day : null}
        paused={paused}
        speed={speed}
        dayProgress={dayProgress}
        clockRunning={clockRunning}
        onTogglePause={() => setPaused((p) => !p)}
        onSpeedChange={setSpeed}
      />

      {/* 1 column on phones, play area + side stack on laptops, 3 columns on wide screens */}
      <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,22rem)]">
        {/*
          In one column (below lg) the column wrappers dissolve (`contents`) and each panel takes its
          place from order-*: scene, actions, resources, city status, timeline, then the rest.
        */}
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          {/* The API has no city profile yet, so this stays placeholder text. */}
          <div className="order-6 lg:order-none">
            <CityRecord {...mockRun.city} />
          </div>
          <div className="order-3 lg:order-none">
            <Resources gold={state.gold} />
          </div>
          <div className="order-4 lg:order-none">
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
          </div>
        </div>

        {/* Main play area comes first until the 3-column layout */}
        <div className="contents lg:order-first lg:row-span-2 lg:flex lg:flex-col lg:gap-5 xl:order-none xl:row-span-1">
          <div className="order-1 lg:order-none">
            <BattleScene
              cityLevel={state.cityLevel}
              wallLevel={state.wallLevel}
              troopLevel={state.troopLevel}
              waveName={wave?.name ?? ""}
              hp={wave?.hp ?? 0}
              maxHp={wave?.hp ?? 0}
              enemies={wave?.enemies ?? []}
            />
          </div>
          <div className="order-2 lg:order-none">
            <Actions
              phase={state.phase}
              actionUsedToday={state.actionUsedToday}
              costs={{ upgradeCity: stats.cityCost, upgradeTroops: stats.troopCost, upgradeWall: stats.wallCost, repairCity: stats.repairCost }}
              pending={pending}
              onAction={(id) => act(id, {})}
              onEndDay={() => act("endPreparationDay", {})}
            />
          </div>
          {/* No history endpoint yet: only this session's actions are listed. */}
          <div className="order-5 flex flex-col lg:order-none lg:flex-1">
            <Timeline entries={timeline} />
          </div>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-5">
          {wave && (
            <div className="order-7 lg:order-none">
              <ThisWave name={wave.name} hp={wave.hp} attack={wave.attack} description={wave.description} />
            </div>
          )}
          <div className="order-8 lg:order-none">
            <UpcomingWaves waves={upcomingWaves(state.wavesCleared)} />
          </div>
        </div>
      </main>
      <PhaseDialogs />
      <GameToast />
    </>
  );
}
