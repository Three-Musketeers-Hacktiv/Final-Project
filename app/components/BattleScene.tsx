import Image, { type StaticImageData } from "next/image";
import backgroundDay from "./assets/background/background_day.png";
import backgroundNight from "./assets/background/background_night.png";
import foregroundDay from "./assets/background/foreground_terrain_day.png";
import foregroundNight from "./assets/background/foreground_terrain_night.png";
import CityDefense from "./CityDefense";
import Clouds from "./Clouds";
import SpritePlaceholder from "./SpritePlaceholder";

type BattleSceneProps = {
  cityLevel: number;
  wallLevel: number;
  troopLevel: number;
  waveName: string;
  hp: number;
  maxHp: number;
  enemies: string[];
};

// The terrain strip spans the scene width; its height follows the image's aspect ratio.
const TERRAIN_HEIGHT = `${(foregroundDay.height / foregroundDay.width) * 100}cqw`;
// Sprites stand on the grass line, a little below the top of the terrain strip.
const STANDING_LINE = `calc(${TERRAIN_HEIGHT} * 0.8)`;

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

/** Side-view stage: city on the left, the incoming wave on the right. */
export default function BattleScene({
  cityLevel,
  wallLevel,
  troopLevel,
  waveName,
  hp,
  maxHp,
  enemies,
}: BattleSceneProps) {
  return (
    // --u is the size of one sprite pixel; the city sprites scale with the scene width.
    <section className="@container relative aspect-[2.8/1] min-h-44 overflow-hidden rounded-sm border-2 border-frame bg-sky-top [--u:calc(100cqw/1680)]">
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

      <div className="absolute left-[2%] z-10" style={{ bottom: STANDING_LINE }}>
        <CityDefense cityLevel={cityLevel} wallLevel={wallLevel} troopLevel={troopLevel} />
      </div>

      {/* The whole wave shares one HP pool, so it gets a single bar. No bar once every wave is beaten. */}
      <div className="absolute right-[3%] z-10 flex flex-col gap-2" style={{ bottom: STANDING_LINE }}>
        {maxHp > 0 && (
          <div>
            <div className="mb-0.5 flex justify-between gap-3 text-xs font-semibold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]">
              <span>{waveName}</span>
              <span>
                {hp} / {maxHp}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/45 ring-1 ring-black/40">
              <div className="h-full bg-red-600" style={{ width: `${(hp / maxHp) * 100}%` }} />
            </div>
          </div>
        )}
        <div className="flex items-end gap-2">
          {enemies.map((enemy, i) => (
            <SpritePlaceholder key={i} label={enemy} className={enemy === "Ogre" ? "h-24 w-20" : "size-10"} />
          ))}
        </div>
      </div>

      {/* Terrain sits in front of the sprites' feet. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20" style={{ height: TERRAIN_HEIGHT }}>
        <ThemedLayer day={foregroundDay} night={foregroundNight} sizes="(min-width: 1280px) 50vw, 100vw" className="object-fill" />
      </div>
    </section>
  );
}
