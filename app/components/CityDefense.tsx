import Image, { type StaticImageData } from "next/image";
import type { CSSProperties } from "react";
import { EXPLOSION, HIT_FILTER, THRUST } from "./battleSprites";
import { citySprites, spriteTier, towerSprites, troopSprites, wallSprites } from "./citySprites";

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

/** One frame of the explosion, its ground point on the bottom center of the town. */
function Explosion({ frame, opacity }: { frame: number; opacity: number }) {
  const { x, y, w, h } = EXPLOSION.frames[frame];
  const [pivotX, pivotY] = EXPLOSION.pivot;
  const columns = EXPLOSION.image.width / w;
  const rows = EXPLOSION.image.height / h;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-0 left-1/2 z-40"
      style={{
        width: EXPLOSION_WIDTH,
        aspectRatio: `${w} / ${h}`,
        opacity,
        transform: `translate(${(-pivotX / w) * 100}%, ${((h - pivotY) / h) * 100}%)`,
        backgroundImage: `url(${EXPLOSION.image.src})`,
        backgroundSize: `${columns * 100}% ${rows * 100}%`,
        backgroundPosition: `${(x / w / (columns - 1)) * 100}% ${(y / h / (rows - 1)) * 100}%`,
      }}
    />
  );
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

function Sprite({ src, alt, flip = false }: { src: StaticImageData; alt: string; flip?: boolean }) {
  return (
    <Image
      src={src}
      alt={alt}
      unoptimized
      draggable={false}
      className={`relative z-10 block h-auto max-w-none select-none ${flip ? "-scale-x-100" : ""}`}
      style={{ width: units(src.width) }}
    />
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
}: CityDefenseProps) {
  const city = citySprites[spriteTier(cityLevel)];
  const wall = wallSprites[spriteTier(wallLevel)];
  const tower = towerSprites[spriteTier(wallLevel)];
  const [troopA, troopB] = troopSprites[spriteTier(troopLevel)];
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

  return (
    <div className="flex items-end" style={{ gap: units(16) }}>
      {/* The town; data-town lets the battle scene aim the camera at it. */}
      <div data-town className="relative">
        {/* Hidden rather than removed, so the explosion keeps its place over the town. */}
        <div
          className={`flex items-end ${townDestroyed ? "invisible" : ""}`}
          style={townDark > 0 ? { filter: `brightness(${1 - 0.85 * townDark})` } : undefined}
        >
          <Sprite src={tower} alt={`Wall tower, level ${wallLevel}`} flip />

          <div className="relative flex items-end" style={{ width: units(city.width) }}>
            <Image
              src={wall}
              alt={`Wall, level ${wallLevel}`}
              unoptimized
              draggable={false}
              // Runs from the center of one tower to the center of the other; cover keeps the art undistorted.
              className="absolute bottom-0 max-w-none select-none object-cover"
              style={{
                left: units(-tower.width / 2),
                width: `calc(100% + ${units(tower.width)})`,
                height: units(tower.height * WALL_TO_TOWER_HEIGHT),
              }}
            />
            <Sprite src={city} alt={`City, level ${cityLevel}`} />
          </div>

          <Sprite src={tower} alt="" />
        </div>
        {explosionFrame !== null && <Explosion frame={explosionFrame} opacity={explosionOpacity} />}
      </div>

      <div className={`flex items-end ${cityFallen ? "invisible" : ""}`} style={{ gap: units(8) }}>
        <div className="origin-bottom-left" style={rearStyle}>
          <Sprite src={troopA} alt={`Troops, level ${troopLevel}`} />
        </div>
        {/* The thrust effect sits outside the lunging sprite, so it stays put at the front soldier's post. */}
        <div className="relative">
          <div className="origin-bottom-left" style={frontStyle}>
            <Sprite src={troopB} alt="" />
          </div>
          {thrustFrame !== null && <ThrustEffect frame={thrustFrame} />}
        </div>
      </div>
    </div>
  );
}
