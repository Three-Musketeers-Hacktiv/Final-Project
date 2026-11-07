import Image, { type StaticImageData } from "next/image";
import dayCloud01 from "./assets/background/day_cloud_01.png";
import dayCloud02 from "./assets/background/day_cloud_02.png";
import dayCloud03 from "./assets/background/day_cloud_03.png";
import dayCloud04 from "./assets/background/day_cloud_04.png";
import nightCloud01 from "./assets/background/night_cloud_01.png";
import nightCloud02 from "./assets/background/night_cloud_02.png";
import nightCloud03 from "./assets/background/night_cloud_03.png";
import nightCloud04 from "./assets/background/night_cloud_04.png";

const DAY_CLOUDS = [dayCloud01, dayCloud02, dayCloud03, dayCloud04];
const NIGHT_CLOUDS = [nightCloud01, nightCloud02, nightCloud03, nightCloud04];

// One background pixel: the 548px-tall background is fitted to the scene height (scene is 2.8:1).
const SKY_PIXEL = "calc(100cqw / 1534)";

type Cloud = {
  sprite: number;
  /** Altitude, from the top of the scene. */
  top: string;
  scale: number;
  /** Seconds to cross the whole scene. Bigger, nearer clouds move faster. */
  drift: number;
  /** Negative delay so the clouds start spread across the sky instead of all at the left edge. */
  delay: number;
  /** Seconds per dissolve-and-reform cycle; clouds without it never fade. */
  fade?: number;
  flip?: boolean;
};

const CLOUDS: Cloud[] = [
  { sprite: 0, top: "13%", scale: 1, drift: 95, delay: -12, fade: 53 },
  { sprite: 3, top: "5%", scale: 0.7, drift: 170, delay: -130 },
  { sprite: 2, top: "7%", scale: 0.8, drift: 125, delay: -75, fade: 71 },
  { sprite: 1, top: "24%", scale: 0.9, drift: 110, delay: -42 },
  { sprite: 0, top: "29%", scale: 0.65, drift: 140, delay: -100, fade: 61, flip: true },
  { sprite: 3, top: "18%", scale: 1, drift: 80, delay: -58, fade: 37 },
  { sprite: 2, top: "33%", scale: 0.55, drift: 155, delay: -20, flip: true },
];

function CloudSet({ sprites, className }: { sprites: StaticImageData[]; className: string }) {
  return (
    <div className={className}>
      {CLOUDS.map((cloud, i) => {
        const src = sprites[cloud.sprite];
        return (
          <div
            key={i}
            className="cloud-drift absolute left-0"
            style={{ top: cloud.top, animationDuration: `${cloud.drift}s`, animationDelay: `${cloud.delay}s` }}
          >
            <Image
              src={src}
              alt=""
              unoptimized
              draggable={false}
              className={`cloud-bob block h-auto max-w-none select-none ${cloud.fade ? "cloud-fade" : ""}`}
              style={{
                width: `calc(${SKY_PIXEL} * ${src.width * cloud.scale})`,
                // Mirrored copies of a sprite read as different clouds.
                scale: cloud.flip ? "-1 1" : undefined,
                animationDuration: `${7 + (i % 3) * 2}s${cloud.fade ? `, ${cloud.fade}s` : ""}`,
                animationDelay: `${-i * 1.7}s${cloud.fade ? `, ${cloud.delay / 3}s` : ""}`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Clouds drifting across the sky, bobbing slightly and some dissolving and reforming. */
export default function Clouds() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <CloudSet sprites={NIGHT_CLOUDS} className="day:hidden" />
      <CloudSet sprites={DAY_CLOUDS} className="hidden day:block" />
    </div>
  );
}
