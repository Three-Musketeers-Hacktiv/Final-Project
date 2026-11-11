"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { preload } from "react-dom";
import backgroundDay from "./assets/background/background_day.png";
import backgroundNight from "./assets/background/background_night.png";
import foregroundDay from "./assets/background/foreground_terrain_day.png";
import foregroundNight from "./assets/background/foreground_terrain_night.png";
import { EXPLOSION, HEX_SIGIL, HIT_FILTER, THRUST, type MonsterAttack } from "./battleSprites";
import { gameConfig } from "../../src/game/config";
import CityDefense from "./CityDefense";
import SheetFrame from "./SheetFrame";
import Clouds from "./Clouds";
import type { BattleFrame } from "./useBattlePlayback";

type SceneWave = {
  name: string;
  hp: number;
  maxHp: number;
  /** The wave's group art; null when there is no art for it. */
  art: StaticImageData | null;
  /** Width of the art in the scene, in % of the scene's width (set per wave in waveInfo). */
  artWidth: number;
  /** Transparent part under the monsters' feet, as a fraction of the art's height. */
  artFootPadding: number;
  /** Where the art splits between its monsters, as fractions of its width. */
  artSplits: number[];
  /** How far the feet go into the grass, as a fraction of the grass strip's height. */
  artSink: number;
  /** Bobs in the air and drops out of the sky on death. */
  artFlying: boolean;
  /** Monsters (by position, left to right) that hold their ground while the rest charge. */
  artAnchored: number[];
  /** The wave never charges; the soldiers march out to it instead. */
  artStationary: boolean;
  /** The wave's own attack effect, played on every hit, or null. */
  artAttack: MonsterAttack | null;
  /** Where the camera aims when it closes in on this wave, as fractions of the art. */
  artFocus: [number, number];
  /** How a standing wave dies: topples over backwards, or is knocked back, blinks and vanishes. */
  artDeath: "topple" | "knockback";
  /** Extra lift above standing height for a flyer, in % of the scene width. */
  artHover: number;
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
// The terrain is solid from its top edge and the standing line sits this far down it (as a fraction of
// its height). Each wave lifts its feet from there to `artSink` below the top edge, so they touch the grass.
const STANDING_DEPTH = 0.2;
// The hex sigil that seals the Demon King is this many times as wide as his art.
const SIGIL_WIDTH_SCALE = 2.2;
// A flyer's charge also dives this share of its hover height, so it swoops diagonally down onto the
// troops (and climbs back as it recoils) without touching the grass.
const DIVE_SHARE = 0.85;
// At impact the art moves past the city's edge by this share of its width, so the monsters (inside
// the art's side padding) reach the troops.
const IMPACT_OVERLAP = 0.08;
// How far the camera closes in on its subject (the fallen town, or the Demon King), at least: it zooms
// further when needed to bring the subject to the center without showing anything past the scene's
// edges, up to MAX_ZOOM. A subject too close to an edge to be centered within that is framed as close to
// the center as the edges allow.
const MIN_ZOOM = 1.8;
const MAX_ZOOM = 2.8;

/**
 * The camera at `zoom` (0–1) on its way to framing the subject at `center` (in % of the scene). At every
 * step the scene still covers the whole frame.
 */
function cameraTransform(zoom: number, center: { x: number; y: number }) {
  // Moving a point 50% from an edge needs at least 50/distance-to-that-edge zoom to stay covered.
  const edge = Math.max(1, Math.min(center.x, 100 - center.x, center.y, 100 - center.y));
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, 50 / edge));
  // Keep the scaled scene covering the frame: its offset stays between 100 - 100 × scale and 0.
  const fit = (c: number) => Math.min(0, Math.max(100 - 100 * scale, 50 - scale * c));
  const shift = { x: fit(center.x), y: fit(center.y) };
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

// A knocked-back death: the monster is shoved back away from the city, flashes white once (like the
// usual death) and vanishes, without toppling over (for big lone monsters a topple looks wrong).
const KNOCKBACK = 0.12; // of the art's width
const KNOCKBACK_MS = 300;
const KNOCKBACK_FADE = [560, 760] as const;

/** Where a knocked-back monster is `ms` after the killing blow. */
function knockbackFallStyle(ms: number): CSSProperties {
  if (ms < 0) return {};
  const t = 1 - (1 - clamp01(ms / KNOCKBACK_MS)) ** 3; // shoved hard, then slows
  const hop = Math.sin(Math.PI * clamp01(ms / KNOCKBACK_MS)) * 3;
  return {
    transform: `translate(${KNOCKBACK * 100 * t}%, ${-hop}%)`,
    filter: ms < MONSTER_FLASH_MS ? DEATH_FLASH_FILTER : undefined,
    opacity: 1 - clamp01((ms - KNOCKBACK_FADE[0]) / (KNOCKBACK_FADE[1] - KNOCKBACK_FADE[0])),
  };
}

/** Where a flying monster is `ms` after the killing blow: it flashes white, then drops `hover` (its
 *  height above the grass, in cqw) out of the sky, spinning as it falls, and fades. */
function flyerFallStyle(ms: number, hover: number): CSSProperties {
  if (ms < 0) return {};
  const t = clamp01(ms / MONSTER_FALL_MS) ** 2; // accelerates like a fall
  return {
    transformOrigin: "50% 50%",
    transform: `translateY(${t * Math.max(hover, 3)}cqw) rotate(${-140 * t}deg)`,
    filter: ms < MONSTER_FLASH_MS ? DEATH_FLASH_FILTER : undefined,
    opacity: 1 - clamp01((ms - MONSTER_FADE[0]) / (MONSTER_FADE[1] - MONSTER_FADE[0])),
  };
}

/**
 * The wave's group art. It charges as one piece, unless some monsters hold their ground (`artAnchored`):
 * then it is drawn as its separate monsters and only the others charge. Once it dies it is cut into its
 * monsters, which fall one by one.
 */
function WaveArt({ wave, attack, travel }: { wave: SceneWave & { art: StaticImageData }; attack: BattleFrame | null; travel: number }) {
  const { art } = wave;
  const deathMs = attack?.waveDeathMs ?? null;
  const edges = [0, ...wave.artSplits, 1];
  const charge =
    attack && !wave.artStationary
      ? `translateX(${-attack.advance * travel}px) translateY(${attack.advance * wave.artHover * DIVE_SHARE}cqw)`
      : "";
  const perMonster = wave.artAnchored.length > 0;
  // Anchored monsters first, so the chargers pass in front of them.
  const order = edges
    .slice(1)
    .map((_, i) => i)
    .sort((a, b) => Number(!wave.artAnchored.includes(a)) - Number(!wave.artAnchored.includes(b)));

  function monster(i: number, inFlow: boolean) {
    const left = edges[i];
    const right = edges[i + 1];
    const fall =
      deathMs === null
        ? { filter: attack?.flashing ? HIT_FILTER : undefined }
        : wave.artFlying
          ? flyerFallStyle(deathMs - i * MONSTER_STAGGER_MS, wave.artHover)
          : wave.artDeath === "knockback"
            ? knockbackFallStyle(deathMs - i * MONSTER_STAGGER_MS)
            : monsterFallStyle(deathMs - i * MONSTER_STAGGER_MS, [
              ((left + right) / 2) * 100,
              (1 - wave.artFootPadding) * 100,
            ]);
    const moves = perMonster && !wave.artAnchored.includes(i);
    return (
      <Image
        key={i}
        src={art}
        alt={inFlow ? wave.name : ""}
        sizes={`${wave.artWidth}vw`}
        loading="eager"
        className={`h-auto w-full ${inFlow ? "relative block" : "absolute inset-0"}`}
        style={{
          ...fall,
          clipPath: `inset(0 ${(1 - right) * 100}% 0 ${left * 100}%)`,
          transform: [moves ? charge : "", fall.transform ?? ""].join(" ").trim() || undefined,
        }}
      />
    );
  }

  return (
    // Scales with the scene like the city sprites. The margin cancels the transparent rows under the
    // feet and lifts them from the standing line to just below the top edge of the terrain; a flying
    // wave is lifted further, into the air.
    <div
      data-wave-art
      data-foot-padding={wave.artFootPadding}
      data-focus-x={wave.artFocus[0]}
      data-focus-y={wave.artFocus[1]}
      className={`relative select-none ${attack?.waveGone ? "invisible" : ""}`}
      style={{
        filter: attack && attack.waveDark > 0 ? `brightness(${1 - 0.85 * attack.waveDark})` : undefined,
        width: `${wave.artWidth}cqw`,
        marginBottom: `calc(${TERRAIN_HEIGHT} * ${STANDING_DEPTH - wave.artSink} - ${wave.artWidth * (art.height / art.width) * wave.artFootPadding}cqw + ${wave.artHover}cqw)`,
        transform: !perMonster && charge ? charge : undefined,
      }}
    >
      {/* A flyer bobs while it is alive; the fall takes over once it is hit for the last time. */}
      <div className={wave.artFlying && deathMs === null ? "wave-hover" : undefined}>
        {deathMs === null && !perMonster ? (
          <Image
            src={art}
            alt={wave.name}
            sizes={`${wave.artWidth}vw`}
            loading="eager"
            className="block h-auto w-full"
            style={{ filter: attack?.flashing ? HIT_FILTER : undefined }}
          />
        ) : (
          order.map((i, n) => monster(i, n === 0))
        )}
      </div>
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
      {/* The scene is at the top of /play, so its layers load eagerly (they compete for the main paint). */}
      <Image src={night} alt="" fill sizes={sizes} loading="eager" className={`${className} day:hidden`} />
      <Image src={day} alt="" fill sizes={sizes} loading="eager" className={`${className} hidden day:block`} />
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
  // The wave art at rest, in % of the scene: its focus point (where the camera zooms in when the Demon
  // King is sealed: his face), the middle of its foot line (where the sigil stands) and its width.
  const [waveSpot, setWaveSpot] = useState({ x: 80, y: 70, footX: 80, footBottom: 12, width: 20 });
  const showWave = wave !== null;
  // Battle effects load as soon as a wave is at the gates, so they are ready when it fights.
  if (showWave) {
    preload(THRUST.image.src, { as: "image" });
    preload(EXPLOSION.image.src, { as: "image" });
    if (wave.artAttack) preload(wave.artAttack.sheet.image.src, { as: "image" });
    if (wave.name === gameConfig.waves.at(-1)?.name) preload(HEX_SIGIL.image.src, { as: "image" });
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
      const scene = sceneRef.current;
      const art = post.querySelector("[data-wave-art]");
      if (!scene || !(art instanceof HTMLElement)) return;
      const sceneBox = scene.getBoundingClientRect();
      const artBox = art.getBoundingClientRect();
      const footY = artBox.bottom - artBox.height * Number(art.dataset.footPadding ?? 0);
      const focusX = Number(art.dataset.focusX ?? 0.5);
      const focusY = Number(art.dataset.focusY ?? 0.5);
      setWaveSpot({
        x: ((artBox.left + artBox.width * focusX - sceneBox.left) / sceneBox.width) * 100,
        y: ((artBox.top + artBox.height * focusY - sceneBox.top) / sceneBox.height) * 100,
        footX: ((artBox.left + artBox.width / 2 - sceneBox.left) / sceneBox.width) * 100,
        footBottom: ((sceneBox.bottom - footY) / sceneBox.height) * 100,
        width: (artBox.width / sceneBox.width) * 100,
      });
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
            ? {
                transform: cameraTransform(attack.zoom, attack.focus === "wave" ? waveSpot : townCenter),
                transformOrigin: "0 0",
              }
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
            monsterAttack={wave?.artAttack && attack ? { attack: wave.artAttack, frames: attack.monsterAttackFrames } : null}
            march={wave?.artStationary && attack ? attack.advance * travel : 0}
          />
        </div>
      </div>

      {/* The whole wave shares one HP pool, so it gets a single bar. The wave is drawn above the grass
          (z-22 > the terrain's z-20) but below the soldiers (z-25) and the blackout (z-30). */}
      {wave && (
        <div ref={waveRef} className="absolute right-[3%] z-[22] flex flex-col gap-2" style={{ bottom: STANDING_LINE }}>
          <div style={{ opacity: attack?.hudOpacity ?? 1 }}>
            <HpBar label={wave.name} hp={wave.hp} maxHp={wave.maxHp} barClass="bg-red-600" />
          </div>
          {wave.art && !waveFallen && <WaveArt wave={{ ...wave, art: wave.art }} attack={attack} travel={travel} />}
          {/* Keeps the column's width once the art is gone. */}
          {wave.art && waveFallen && <div style={{ width: `${wave.artWidth}cqw` }} />}
        </div>
      )}

      {/* Terrain sits in front of the sprites' feet. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20" style={{ height: TERRAIN_HEIGHT }}>
        <ThemedLayer day={foregroundDay} night={foregroundNight} sizes="(min-width: 1280px) 50vw, 100vw" className="object-fill" />
      </div>

      {/* The scene going dark before the town explodes; the explosion is drawn above it. */}
      {/* The hex sigil sealing the Demon King, drawn above the blackout like the town's explosion. */}
      {attack && attack.sigilFrame !== null && (
        <SheetFrame
          sheet={HEX_SIGIL}
          frame={attack.sigilFrame}
          width={`${waveSpot.width * SIGIL_WIDTH_SCALE}%`}
          opacity={attack.sigilOpacity}
          className="z-40"
          style={{ left: `${waveSpot.footX}%`, bottom: `${waveSpot.footBottom}%` }}
        />
      )}
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
