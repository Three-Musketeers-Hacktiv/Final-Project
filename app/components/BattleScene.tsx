"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { preload } from "react-dom";
import backgroundDay from "./assets/background/background_day.png";
import backgroundNight from "./assets/background/background_night.png";
import foregroundDay from "./assets/background/foreground_terrain_day.png";
import foregroundNight from "./assets/background/foreground_terrain_night.png";
import { EXPLOSION, HIT_FILTER, THRUST } from "./battleSprites";
import CityDefense from "./CityDefense";
import Clouds from "./Clouds";
import type { BattleFrame } from "./useBattlePlayback";

type SceneWave = {
  name: string;
  hp: number;
  maxHp: number;
  /** The wave's group art; null when there is no art for it. */
  art: StaticImageData | null;
  /** Transparent part under the monsters' feet, as a fraction of the art's height. */
  artFootPadding: number;
  /** Where the art splits between its monsters, as fractions of its width. */
  artSplits: number[];
};

type BattleSceneProps = {
  cityLevel: number;
  wallLevel: number;
  troopLevel: number;
  /** Only set on a battle day; the wave and both HP bars are hidden otherwise. */
  wave: SceneWave | null;
  cityHp: number;
  cityMaxHp: number;
  /** The battle replay's current frame, or null when nothing is playing. */
  attack: BattleFrame | null;
  /** The wave was destroyed in a replay that has finished: only its empty HP bar stays. */
  waveFallen: boolean;
  /** The city has fallen in a replay that has finished: the soldiers and the town are gone. */
  cityFallen: boolean;
  /** Skips the battle replay; the Skip button shows only while one plays. */
  onSkip: (() => void) | null;
};

// The terrain strip spans the scene width; its height follows the image's aspect ratio.
const TERRAIN_HEIGHT = `${(foregroundDay.height / foregroundDay.width) * 100}cqw`;
// Sprites stand on the grass line, a little below the top of the terrain strip.
const STANDING_LINE = `calc(${TERRAIN_HEIGHT} * 0.8)`;
// Width of the wave art, in % of the scene width (matches the w-[22cqw] class).
const ART_WIDTH_CQW = 22;
// The terrain is solid from its top edge, so the standing line hides the bottom 20% of a sprite's
// feet. Lift the wave art by most of that, leaving the feet just touching the grass.
const FEET_LIFT = 0.17;
// At impact the art moves past the city's edge by this share of its width, so the monsters (inside
// the art's side padding) reach the troops.
const IMPACT_OVERLAP = 0.08;
// How far the camera closes in on the town when it falls, at least: it zooms further when needed to
// bring the town to the center without showing anything past the scene's edges.
const MIN_ZOOM = 1.8;

/**
 * The camera at `zoom` (0–1) on its way to framing the town at `center` (in % of the scene). Fully
 * zoomed, the town sits in the middle; at every step the scene still covers the whole frame.
 */
function cameraTransform(zoom: number, center: { x: number; y: number }) {
  // Moving a point 50% from an edge needs at least 50/distance-to-that-edge zoom to stay covered.
  const edge = Math.max(1, Math.min(center.x, 100 - center.x, center.y, 100 - center.y));
  const scale = Math.max(MIN_ZOOM, 50 / edge);
  const shift = { x: 50 - scale * center.x, y: 50 - scale * center.y };
  return `translate(${shift.x * zoom}%, ${shift.y * zoom}%) scale(${1 + (scale - 1) * zoom})`;
}
// The wave's fall, in ms from the killing blow. Each monster flashes white, topples backwards with a
// small hop and fades; they go one after another from the front.
const MONSTER_STAGGER_MS = 120;
const MONSTER_FLASH_MS = 150;
const MONSTER_FALL_MS = 550;
const MONSTER_FADE = [400, 750] as const;
const DEATH_FLASH_FILTER = "brightness(0) invert(1)";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Where one falling monster is `ms` after the killing blow; `feet` is its pivot in % of the art. */
function monsterFallStyle(ms: number, feet: [number, number]): CSSProperties {
  if (ms < 0) return {};
  const t = 1 - (1 - clamp01(ms / MONSTER_FALL_MS)) ** 3;
  const hop = Math.sin(Math.PI * clamp01(ms / 250)) * 4;
  return {
    transformOrigin: `${feet[0]}% ${feet[1]}%`,
    transform: `translateY(${-hop}%) rotate(${80 * t}deg)`,
    filter: ms < MONSTER_FLASH_MS ? DEATH_FLASH_FILTER : undefined,
    opacity: 1 - clamp01((ms - MONSTER_FADE[0]) / (MONSTER_FADE[1] - MONSTER_FADE[0])),
  };
}

/** The wave's group art; once it dies it is cut into its monsters, which fall one by one. */
function WaveArt({ wave, attack, travel }: { wave: SceneWave & { art: StaticImageData }; attack: BattleFrame | null; travel: number }) {
  const { art } = wave;
  const deathMs = attack?.waveDeathMs ?? null;
  const edges = [0, ...wave.artSplits, 1];
  return (
    // Scales with the scene like the city sprites. The margin cancels the transparent rows under the
    // feet and lifts them from the standing line to just below the top edge of the terrain.
    <div
      className="relative w-[22cqw] select-none"
      style={{
        marginBottom: `calc(${TERRAIN_HEIGHT} * ${FEET_LIFT} - ${ART_WIDTH_CQW * (art.height / art.width) * wave.artFootPadding}cqw)`,
        transform: attack ? `translateX(${-attack.advance * travel}px)` : undefined,
      }}
    >
      {deathMs === null ? (
        <Image
          src={art}
          alt={wave.name}
          sizes="22vw"
          className="block h-auto w-full"
          style={{ filter: attack?.flashing ? HIT_FILTER : undefined }}
        />
      ) : (
        edges.slice(1).map((right, i) => {
          const left = edges[i];
          return (
            <Image
              key={i}
              src={art}
              alt={i === 0 ? wave.name : ""}
              sizes="22vw"
              className={`h-auto w-full ${i === 0 ? "relative block" : "absolute inset-0"}`}
              style={{
                clipPath: `inset(0 ${(1 - right) * 100}% 0 ${left * 100}%)`,
                ...monsterFallStyle(deathMs - i * MONSTER_STAGGER_MS, [((left + right) / 2) * 100, (1 - wave.artFootPadding) * 100]),
              }}
            />
          );
        })
      )}
    </div>
  );
}

function HpBar({ label, hp, maxHp, barClass }: { label: string; hp: number; maxHp: number; barClass: string }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between gap-3 text-xs font-semibold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]">
        <span>{label}</span>
        <span>
          {hp} / {maxHp}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/45 ring-1 ring-black/40">
        <div className={`h-full ${barClass}`} style={{ width: `${(hp / maxHp) * 100}%` }} />
      </div>
    </div>
  );
}

/** Shows the day art in day mode and the night art otherwise. */
function ThemedLayer({
  day,
  night,
  className,
  sizes,
}: {
  day: StaticImageData;
  night: StaticImageData;
  className: string;
  sizes: string;
}) {
  return (
    <>
      <Image src={night} alt="" fill sizes={sizes} className={`${className} day:hidden`} />
      <Image src={day} alt="" fill sizes={sizes} className={`${className} hidden day:block`} />
    </>
  );
}

/** Side-view stage: city on the left and, on battle days, the wave on the right. */
export default function BattleScene({
  cityLevel,
  wallLevel,
  troopLevel,
  wave,
  cityHp,
  cityMaxHp,
  attack,
  waveFallen,
  cityFallen,
  onSkip,
}: BattleSceneProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  // Distance in px from the wave's post to the point where it hits the city.
  const [travel, setTravel] = useState(0);
  // The town's center, in % of the scene: where the camera zooms in when the town falls.
  const [townCenter, setTownCenter] = useState({ x: 20, y: 70 });
  const showWave = wave !== null;
  // Battle effects load as soon as a wave is at the gates, so they are ready when it fights.
  if (showWave) {
    preload(THRUST.image.src, { as: "image" });
    preload(EXPLOSION.image.src, { as: "image" });
  }

  useEffect(() => {
    const scene = sceneRef.current;
    const town = cityRef.current?.querySelector("[data-town]");
    if (!scene || !town) return;
    const measure = () => {
      const sceneBox = scene.getBoundingClientRect();
      const townBox = town.getBoundingClientRect();
      setTownCenter({
        x: ((townBox.left + townBox.width / 2 - sceneBox.left) / sceneBox.width) * 100,
        y: ((townBox.top + townBox.height / 2 - sceneBox.top) / sceneBox.height) * 100,
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    observer.observe(town);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const city = cityRef.current;
    const post = waveRef.current;
    if (!city || !post) return;
    // The wave's column is never transformed (only its art is), so it marks the post at rest.
    const measure = () => {
      const postBox = post.getBoundingClientRect();
      setTravel(postBox.left - city.getBoundingClientRect().right + postBox.width * IMPACT_OVERLAP);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(city);
    observer.observe(post);
    return () => observer.disconnect();
  }, [showWave]);

  return (
    // --u is the size of one sprite pixel; the city sprites scale with the scene width. `isolate` keeps
    // the scene's layers (Skip, effects) inside it, below the sticky top bar when the page scrolls.
    <section
      ref={sceneRef}
      className="@container relative isolate aspect-[2.2/1] overflow-hidden rounded-sm border-2 border-frame bg-sky-top [--u:calc(100cqw/1680)] sm:aspect-[2.8/1]"
    >
      {/* The camera: everything in the scene except the replay controls, so it can zoom in on the town. */}
      <div
        className="absolute inset-0"
        style={
          attack && attack.zoom > 0
            ? { transform: cameraTransform(attack.zoom, townCenter), transformOrigin: "0 0" }
            : undefined
        }
      >
      {/* background_day.png has a black strip along its top edge (~6.4% of its height): stretch the
          layer up past the scene so it is cropped off. */}
      <div className="absolute inset-x-0 top-0 bottom-0 day:-top-[7%]">
        <ThemedLayer
          day={backgroundDay}
          night={backgroundNight}
          sizes="(min-width: 1280px) 50vw, 100vw"
          className="object-cover object-bottom"
        />
      </div>
      <Clouds />

      {/* No z-index here, so the thrust effect inside can be drawn over the wave. */}
      <div className="absolute left-[2%] flex flex-col gap-2" style={{ bottom: STANDING_LINE }}>
        {showWave && cityMaxHp > 0 && (
          <div className="w-[22cqw]" style={{ opacity: attack?.hudOpacity ?? 1 }}>
            <HpBar label="City" hp={cityHp} maxHp={cityMaxHp} barClass="bg-green-500" />
          </div>
        )}
        <div ref={cityRef} className="self-start">
          <CityDefense
            cityLevel={cityLevel}
            wallLevel={wallLevel}
            troopLevel={troopLevel}
            thrustFrame={attack?.thrustFrame ?? null}
            lunge={attack?.lunge ?? 0}
            troopDeathMs={attack?.troopDeathMs ?? null}
            cityFallen={cityFallen}
            townDestroyed={cityFallen || (attack?.townDestroyed ?? false)}
            townDark={attack?.townDark ?? 0}
            explosionFrame={attack?.explosionFrame ?? null}
            explosionOpacity={attack?.explosionOpacity ?? 1}
          />
        </div>
      </div>

      {/* The whole wave shares one HP pool, so it gets a single bar. */}
      {wave && (
        <div ref={waveRef} className="absolute right-[3%] z-10 flex flex-col gap-2" style={{ bottom: STANDING_LINE }}>
          <div style={{ opacity: attack?.hudOpacity ?? 1 }}>
            <HpBar label={wave.name} hp={wave.hp} maxHp={wave.maxHp} barClass="bg-red-600" />
          </div>
          {wave.art && !waveFallen && <WaveArt wave={{ ...wave, art: wave.art }} attack={attack} travel={travel} />}
          {/* Keeps the column's width once the art is gone. */}
          {wave.art && waveFallen && <div className="w-[22cqw]" />}
        </div>
      )}

      {/* Terrain sits in front of the sprites' feet. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20" style={{ height: TERRAIN_HEIGHT }}>
        <ThemedLayer day={foregroundDay} night={foregroundNight} sizes="(min-width: 1280px) 50vw, 100vw" className="object-fill" />
      </div>

      {/* The scene going dark before the town explodes; the explosion is drawn above it. */}
      {attack && attack.blackout > 0 && (
        <div className="pointer-events-none absolute inset-0 z-30 bg-black" style={{ opacity: attack.blackout }} />
      )}
      </div>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="absolute top-2 left-2 z-50 rounded-sm border-2 border-frame bg-panel px-2 py-0.5 text-xs text-parchment hover:bg-panel-head"
        >
          Skip ⏭
        </button>
      )}
    </section>
  );
}
