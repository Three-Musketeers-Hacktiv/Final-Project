import Image, { type StaticImageData } from "next/image";
import attack from "./assets/icons/attack.png";
import cityHp from "./assets/icons/city_hp.png";
import cityLevel from "./assets/icons/city_level.png";
import defense from "./assets/icons/defense.png";
import gold from "./assets/icons/gold.png";
import heart from "./assets/icons/heart.png";
import income from "./assets/icons/income.png";
import minus from "./assets/icons/minus.png";
import plus from "./assets/icons/plus.png";
import repairWall from "./assets/icons/repair_wall.png";
import thisWave from "./assets/icons/this_wave.png";
import timeline from "./assets/icons/timeline.png";
import troopLevel from "./assets/icons/troop_level.png";
import upcomingWaves from "./assets/icons/upcoming_waves.png";
import wallLevel from "./assets/icons/wall_level.png";

const ICONS = {
  attack: { src: attack },
  cityHp: { src: cityHp },
  cityLevel: { src: cityLevel },
  defense: { src: defense },
  // gold.png is a large canvas with the coin in the middle: zoom in and let Next shrink the file.
  gold: { src: gold, zoom: 1.6, optimize: true },
  heart: { src: heart },
  income: { src: income },
  minus: { src: minus },
  plus: { src: plus },
  repairWall: { src: repairWall },
  thisWave: { src: thisWave },
  timeline: { src: timeline },
  troopLevel: { src: troopLevel },
  upcomingWaves: { src: upcomingWaves },
  wallLevel: { src: wallLevel },
} satisfies Record<string, { src: StaticImageData; zoom?: number; optimize?: boolean }>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  /** Icons sit next to their text label, so they are decorative by default. */
  label?: string;
  className?: string;
};

export default function Icon({ name, label = "", className = "size-8" }: IconProps) {
  const icon: { src: StaticImageData; zoom?: number; optimize?: boolean } = ICONS[name];

  return (
    <span className={`relative block shrink-0 overflow-hidden ${className}`}>
      <Image
        src={icon.src}
        alt={label}
        fill
        sizes="64px"
        unoptimized={!icon.optimize}
        draggable={false}
        className="select-none object-contain"
        style={icon.zoom ? { objectFit: "cover", transform: `scale(${icon.zoom})` } : undefined}
      />
    </span>
  );
}
