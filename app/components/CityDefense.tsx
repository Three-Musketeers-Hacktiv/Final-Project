"use client";

import Image, { type StaticImageData } from "next/image";
import { useState, type CSSProperties } from "react";
import { EXPLOSION, HIT_FILTER, THRUST, type MonsterAttack } from "./battleSprites";
import { citySprites, spriteTier, towerSprites, troopSprites, wallSprites } from "./citySprites";
import SheetFrame from "./SheetFrame";

type CityDefenseProps = {
  cityLevel: number;
  wallLevel: number;
  troopLevel: number;
  /** Frame of the thrust effect to draw on the front soldier, or null for none. */
  thrustFrame?: number | null;
  /** How far the soldiers lunge forward, 0–1. */
  lunge?: number;
  /** Ms since the soldiers were struck down, while they fall; null otherwise. */
  troopDeathMs?: number | null;
  /** The city has fallen: the soldiers are gone. */
  cityFallen?: boolean;
  /** The town has been blown up: its sprites are gone (the explosion still plays in their place). */
  townDestroyed?: boolean;
  /** How dark the town is, 0–1. */
  townDark?: number;
  /** Frame of the explosion over the town, or null. */
  explosionFrame?: number | null;
  explosionOpacity?: number;
  /** How far (px) the soldiers have marched out toward a wave that stands its ground. */
  march?: number;
  /** The wave's own attack effect and its frames showing now (overlapping rounds), if it has one. */
  monsterAttack?: { attack: MonsterAttack; frames: number[] } | null;
};

// Sprites keep their relative pixel sizes: 1 sprite pixel = --u, which scales with the scene width.
const units = (px: number) => `calc(var(--u) * ${px})`;
// Wall background height relative to the towers.
const WALL_TO_TOWER_HEIGHT = 0.6;
// The thrust sheet is drawn at this many sprite pixels per sheet pixel, so it matches the troops' size.
const THRUST_SCALE = 2.5;
// A full lunge: each soldier steps this many sprite pixels forward and leans this far in.
const LUNGE_STEP = 28;
const LUNGE_LEAN_DEG = 8;
// A soldier's fall, in ms from the killing blow: it flashes red, is knocked back toward the city
// while falling onto its back, then fades. The rear soldier follows a moment later.
const FALL_FLASH_MS = 150;
const FALL_MS = 600;
const FALL_FADE = [450, 900] as const;
const FALL_KNOCKBACK = 14;
const REAR_FALL_DELAY_MS = 100;
// The explosion is this much wider than the town, centered on it.
const EXPLOSION_WIDTH = "160%";
// A monster's spell on the town is this much wider than the town, centered on it.
const TOWN_SPELL_WIDTH = "120%";
// A monster's melee strike is drawn at this many sprite pixels per sheet pixel unless its attack sets its
// own scale (like the thrust).
const MELEE_SCALE = 2.5;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Where a falling soldier is `ms` after the killing blow. */
function fallStyle(ms: number): CSSProperties {
  if (ms < 0) return {};
  const t = 1 - (1 - clamp01(ms / FALL_MS)) ** 3; // fast, then settles
  return {
    transform: `translateX(${units(-FALL_KNOCKBACK * t)}) rotate(${-90 * t}deg)`,
    filter: ms < FALL_FLASH_MS ? HIT_FILTER : undefined,
    opacity: 1 - clamp01((ms - FALL_FADE[0]) / (FALL_FADE[1] - FALL_FADE[0])),
  };
}

/** One frame of the thrust sprite sheet, its pivot on the bottom center of the soldier it belongs to. */
function ThrustEffect({ frame }: { frame: number }) {
  const { x, y, w, h } = THRUST.frames[frame];
  const [pivotX, pivotY] = THRUST.pivot;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 z-[15] [image-rendering:pixelated]"
      style={{
        bottom: units(-(h - pivotY) * THRUST_SCALE),
        width: units(w * THRUST_SCALE),
        height: units(h * THRUST_SCALE),
        marginLeft: units(-pivotX * THRUST_SCALE),
        backgroundImage: `url(${THRUST.image.src})`,
        backgroundSize: `${units(THRUST.image.width * THRUST_SCALE)} ${units(THRUST.image.height * THRUST_SCALE)}`,
        backgroundPosition: `${units(-x * THRUST_SCALE)} ${units(-y * THRUST_SCALE)}`,
      }}
    />
  );
}

/**
 * Counts how many times `tier` has gone up while this is mounted (0 at first, so nothing glows on load,
 * on a new run, or when a tier drops). Used as a React key so each new tier replays the sweep.
 */
function useTierUps(tier: number) {
  const [last, setLast] = useState(tier);
  const [ups, setUps] = useState(0);
  if (tier !== last) {
    setLast(tier);
    if (tier > last) setUps((n) => n + 1);
  }
  return ups;
}

/**
 * A white band that rises through a sprite that just moved up a tier (see .upgrade-sweep in
 * globals.css). It is masked by the sprite's own image, so it lights only the sprite's pixels.
 * `fit` matches how the image is drawn: stretched to its box, or `cover` like the wall.
 */
function UpgradeSweep({
  src,
  fit = "fill",
  style,
}: {
  src: StaticImageData;
  fit?: "fill" | "cover";
  style?: CSSProperties;
}) {
  const mask = `url(${src.src})`;
  const size = fit === "cover" ? "cover" : "100% 100%";
  return (
    <span
      aria-hidden
      className="upgrade-sweep"
      style={{ maskImage: mask, WebkitMaskImage: mask, maskSize: size, WebkitMaskSize: size, ...style }}
    />
  );
}

function Sprite({
  src,
  alt,
  flip = false,
  sweep = 0,
}: {
  src: StaticImageData;
  alt: string;
  flip?: boolean;
  /** Tier-ups so far; each new one replays the upgrade sweep. */
  sweep?: number;
}) {
  return (
    // The flip sits on the wrapper so the sweep's mask is mirrored with the sprite.
    <span className={`relative z-10 block ${flip ? "-scale-x-100" : ""}`}>
      <Image
        src={src}
        alt={alt}
        unoptimized
        // The battle scene is at the top of /play: load its art right away (it is the page's main paint).
        loading="eager"
        draggable={false}
        className="block h-auto max-w-none select-none"
        style={{ width: units(src.width) }}
      />
      {sweep > 0 && <UpgradeSweep key={sweep} src={src} />}
    </span>
  );
}

/**
 * The player's side of the battle scene, back to front:
 * wall background behind the city, a tower on each side, troops outside facing right.
 */
export default function CityDefense({
  cityLevel,
  wallLevel,
  troopLevel,
  thrustFrame = null,
  lunge = 0,
  troopDeathMs = null,
  cityFallen = false,
  townDestroyed = false,
  townDark = 0,
  explosionFrame = null,
  explosionOpacity = 1,
  march = 0,
  monsterAttack = null,
}: CityDefenseProps) {
  const city = citySprites[spriteTier(cityLevel)];
  const wall = wallSprites[spriteTier(wallLevel)];
  const tower = towerSprites[spriteTier(wallLevel)];
  const [troopA, troopB] = troopSprites[spriteTier(troopLevel)];
  // A white sweep rises through a part when its sprite tier goes up: walls and towers share the wall track.
  const wallUps = useTierUps(spriteTier(wallLevel));
  const cityUps = useTierUps(spriteTier(cityLevel));
  const troopUps = useTierUps(spriteTier(troopLevel));
  // Both soldiers lunge together during a battle replay.
  const lungeStyle =
    lunge > 0
      ? {
          transform: `translateX(${units(LUNGE_STEP * lunge)}) rotate(${LUNGE_LEAN_DEG * lunge}deg)`,
        }
      : undefined;
  // A falling soldier's pose replaces its lunge; the front one falls first.
  const frontStyle = troopDeathMs !== null ? fallStyle(troopDeathMs) : lungeStyle;
  const rearStyle = troopDeathMs !== null ? fallStyle(troopDeathMs - REAR_FALL_DELAY_MS) : lungeStyle;
  // The wall runs from the center of one tower to the center of the other, behind the city.
  const wallBox: CSSProperties = {
    left: units(-tower.width / 2),
    width: `calc(100% + ${units(tower.width)})`,
    height: units(tower.height * WALL_TO_TOWER_HEIGHT),
  };

  return (
    <div className="flex items-end" style={{ gap: units(16) }}>
      {/* The town; data-town lets the battle scene aim the camera at it. */}
      <div data-town className="relative">
        {/* Hidden rather than removed, so the explosion keeps its place over the town. */}
        <div
          className={`flex items-end ${townDestroyed ? "invisible" : ""}`}
          style={townDark > 0 ? { filter: `brightness(${1 - 0.85 * townDark})` } : undefined}
        >
          <Sprite src={tower} alt={`Wall tower, level ${wallLevel}`} flip sweep={wallUps} />

          <div className="relative flex items-end" style={{ width: units(city.width) }}>
            <Image
              src={wall}
              alt={`Wall, level ${wallLevel}`}
              unoptimized
              loading="eager"
              draggable={false}
              // Runs from the center of one tower to the center of the other; cover keeps the art undistorted.
              className="absolute bottom-0 max-w-none select-none object-cover"
              style={wallBox}
            />
            {wallUps > 0 && (
              <UpgradeSweep key={wallUps} src={wall} fit="cover" style={{ ...wallBox, inset: "auto", bottom: 0 }} />
            )}
            <Sprite src={city} alt={`City, level ${cityLevel}`} sweep={cityUps} />
          </div>

          <Sprite src={tower} alt="" sweep={wallUps} />
        </div>
        {monsterAttack?.attack.target === "town" &&
          monsterAttack.frames.map((frame, i) => (
            <SheetFrame
              key={i}
              sheet={monsterAttack.attack.sheet}
              frame={frame}
              width={TOWN_SPELL_WIDTH}
              flip={monsterAttack.attack.flip}
              pixelated={monsterAttack.attack.pixelated}
              // Over the town and the grass, under the soldiers.
              className="bottom-0 left-1/2 z-[24]"
            />
          ))}
        {explosionFrame !== null && (
          <SheetFrame
            sheet={EXPLOSION}
            frame={explosionFrame}
            width={EXPLOSION_WIDTH}
            opacity={explosionOpacity}
            className="bottom-0 left-1/2 z-40"
          />
        )}
      </div>

      {/* The soldiers sit above the town and the grass (z-25 > the terrain's z-20), so a falling soldier
          is drawn over the tower behind it; the blackout (z-30) and the explosion (z-40) still cover them. */}
      <div
        className={`relative z-[25] flex items-end ${cityFallen ? "invisible" : ""}`}
        style={{ gap: units(8), transform: march ? `translateX(${march}px)` : undefined }}
      >
        <div className="origin-bottom-left" style={rearStyle}>
          <Sprite src={troopA} alt={`Troops, level ${troopLevel}`} sweep={troopUps} />
        </div>
        {/* The thrust effect sits outside the lunging sprite, so it stays put at the front soldier's post. */}
        <div className="relative">
          <div className="origin-bottom-left" style={frontStyle}>
            <Sprite src={troopB} alt="" sweep={troopUps} />
          </div>
          {thrustFrame !== null && <ThrustEffect frame={thrustFrame} />}
        </div>
        {/* A melee strike lands on the front soldiers, coming from the right: mirrored, its ground point
            on the group's front edge. */}
        {monsterAttack?.attack.target === "troops" &&
          monsterAttack.frames.map((frame, i) => {
            const { w } = monsterAttack.attack.sheet.frames[frame];
            return (
              <SheetFrame
                key={i}
                sheet={monsterAttack.attack.sheet}
                frame={frame}
                width={units(w * (monsterAttack.attack.scale ?? MELEE_SCALE))}
                flip
                className="bottom-0 left-full z-20"
              />
            );
          })}
      </div>
    </div>
  );
}
