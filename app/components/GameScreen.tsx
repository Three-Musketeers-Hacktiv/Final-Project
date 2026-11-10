"use client";

import { useCallback, useRef, useState } from "react";
import type { BattleResult } from "../../src/game";
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
import SettingsDialog, { SETTINGS_DIALOG } from "./SettingsDialog";
import ThisWave from "./ThisWave";
import Timeline from "./Timeline";
import TopBar from "./TopBar";
import UpcomingWaves from "./UpcomingWaves";
import { useBattlePlayback } from "./useBattlePlayback";
import { useDayTimer, type Speed } from "./useDayTimer";
import { useStoredFlag } from "./useStoredFlag";
import { upcomingWaves, waveInfo } from "./waveInfo";

/** The /play dashboard, drawn from the GameView in GameProvider. */
export default function GameScreen({ lord }: { lord: string }) {
  const { game, pending, act } = useGame();
  const { state, stats, wavePreview } = game;

  // Starts paused, so opening or refreshing /play never runs the clock until the player presses Play.
  const [paused, setPaused] = useState(true);
  const [speed, setSpeed] = useState<Speed>(1);
  // Ends the day right after a successful action, for players who take one action a day anyway.
  // Remembered in this browser.
  const [autoEndDay, setAutoEndDay] = useStoredFlag("bastionfall:auto-end-day");
  // The settings dialog pauses the game; closing it restores the pause state from before.
  const pausedBeforeSettings = useRef(false);

  function openSettings() {
    pausedBeforeSettings.current = paused;
    setPaused(true);
    document.getElementById(SETTINGS_DIALOG)?.showPopover();
  }
  // Start Battle moves the phase from battleReady to the result. Catch that change while rendering
  // and replay the saved rounds; a page loaded on the report (a refresh) goes straight to it.
  const [lastPhase, setLastPhase] = useState(state.phase);
  const [replaying, setReplaying] = useState<BattleResult | null>(null);
  if (state.phase !== lastPhase) {
    setLastPhase(state.phase);
    if (lastPhase === "battleReady" && state.battleResult?.day === state.day) setReplaying(state.battleResult);
  }
  const stopReplay = useCallback(() => setReplaying(null), []);
  // Ignores Pause: the game starts paused, and a battle that waited for Play would look stuck.
  const frame = useBattlePlayback({ result: replaying, speed, onDone: stopReplay });

  const fighting = replaying !== null || state.phase === "battleReady" || state.phase === "battleReport";
  const cityHp = frame?.cityHp ?? state.cityHp;
  // A won battle already counts as cleared, so wavePreview jumps to the next wave. This Wave keeps
  // the wave fought today and moves on to the next one when the following day starts.
  const foughtToday = state.battleResult?.day === state.day ? state.battleResult : null;
  const foughtConfig = foughtToday && gameConfig.waves.find((w) => w.wave === foughtToday.wave);
  // HP and attack come from the battle itself: the config holds base values, before difficulty scaling.
  const wave = foughtConfig
    ? {
        ...foughtConfig,
        ...waveInfo(foughtConfig.wave, foughtConfig.name),
        hp: foughtToday.monsterHpBefore,
        attack: foughtToday.monsterAttack,
      }
    : wavePreview && { ...wavePreview, ...waveInfo(wavePreview.wave, wavePreview.name) };
  // The wave in the scene: only on a battle day, from the gates until the report is closed.
  const fought = replaying ?? (state.phase === "battleReport" ? state.battleResult : null);
  const sceneWave = fought && wave
    ? { ...wave, hp: frame?.monsterHp ?? fought.monsterHpAfter, maxHp: fought.monsterHpBefore }
    : state.phase === "battleReady" && wave
      ? { ...wave, maxHp: wave.hp }
      : null;

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
        onOpenSettings={openSettings}
      />

      {/* 1 column on phones, play area + side stack on laptops, 3 columns on wide screens */}
      <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-[minmax(0,1fr)] content-start gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,22rem)]">
        {/*
          In one column (below lg) the column wrappers dissolve (`contents`) and each panel takes its
          place from order-*: scene, actions, city status, timeline, then the rest.
        */}
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          {/* The API has no city profile: name, faction and region are placeholder text; the rest is the run's. */}
          <div className="order-6 lg:order-none">
            <CityRecord
              {...mockRun.city}
              lord={lord}
              difficulty={state.difficulty}
              cityLevel={state.cityLevel}
              effects={state.effects}
              wavesCleared={state.wavesCleared}
            />
          </div>
          {/* Resources is hidden for now: its gold is shown in the Actions title bar. */}
          <div className="order-4 lg:order-none">
            <CityStatus
              hp={cityHp}
              maxHp={state.cityMaxHp}
              wallLevel={state.wallLevel}
              troopLevel={state.troopLevel}
              cityLevel={state.cityLevel}
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
              wave={sceneWave}
              cityHp={cityHp}
              cityMaxHp={state.cityMaxHp}
              attack={frame}
              waveFallen={!frame && fought?.monsterHpAfter === 0}
              cityFallen={!frame && state.phase === "gameOver" && state.cityHp === 0}
              onSkip={frame && stopReplay}
            />
          </div>
          <div className="order-2 lg:order-none">
            <Actions
              phase={state.phase}
              actionUsedToday={state.actionUsedToday}
              gold={state.gold}
              costs={{ upgradeCity: stats.cityCost, upgradeTroops: stats.troopCost, upgradeWall: stats.wallCost, repairCity: stats.repairCost }}
              pending={pending}
              onAction={async (id) => {
                // The day only moves on when the action went through (not on, say, too little gold).
                if ((await act(id, {})) && autoEndDay) act("endPreparationDay", {});
              }}
              onEndDay={() => act("endPreparationDay", {})}
              autoEndDay={autoEndDay}
              onAutoEndDayChange={setAutoEndDay}
            />
          </div>
          {/* The server keeps the whole run's history, oldest first; show the newest on top. */}
          <div className="order-5 flex flex-col lg:order-none lg:flex-1">
            <Timeline entries={[...game.timeline].reverse()} />
          </div>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-5">
          {wave && (
            <div className="order-7 lg:order-none">
              <ThisWave name={wave.name} hp={wave.hp} attack={wave.attack} description={wave.description} art={wave.art} />
            </div>
          )}
          <div className="order-8 lg:order-none">
            {/* The wave in This Wave isn't repeated here. */}
            <UpcomingWaves waves={upcomingWaves(state.wavesCleared).filter((w) => w.wave !== wave?.wave)} />
          </div>
        </div>
      </main>
      {/* The report or defeat screen waits for the replay; on a loss it opens while the town still burns. */}
      <PhaseDialogs hidden={replaying !== null && !frame?.showResult} />
      <SettingsDialog onClose={(resume) => setPaused(resume ? false : pausedBeforeSettings.current)} />
      <GameToast />
    </>
  );
}
