import Image, { type StaticImageData } from "next/image";
import { citySprites, spriteTier, towerSprites, troopSprites, wallSprites } from "./citySprites";

type CityDefenseProps = {
  cityLevel: number;
  wallLevel: number;
  troopLevel: number;
};

// Sprites keep their relative pixel sizes: 1 sprite pixel = --u, which scales with the scene width.
const units = (px: number) => `calc(var(--u) * ${px})`;
// Wall background height relative to the towers.
const WALL_TO_TOWER_HEIGHT = 0.6;

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
export default function CityDefense({ cityLevel, wallLevel, troopLevel }: CityDefenseProps) {
  const city = citySprites[spriteTier(cityLevel)];
  const wall = wallSprites[spriteTier(wallLevel)];
  const tower = towerSprites[spriteTier(wallLevel)];
  const [troopA, troopB] = troopSprites[spriteTier(troopLevel)];

  return (
    <div className="flex items-end" style={{ gap: units(16) }}>
      <div className="flex items-end">
        <Sprite src={tower} alt={`Wall tower, level ${wallLevel}`} />

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

        <Sprite src={tower} alt="" flip />
      </div>

      <div className="flex items-end" style={{ gap: units(8) }}>
        <Sprite src={troopA} alt={`Troops, level ${troopLevel}`} />
        <Sprite src={troopB} alt="" />
      </div>
    </div>
  );
}
