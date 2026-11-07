import CityDefense from "./CityDefense";
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
    <section className="@container relative aspect-[2.8/1] min-h-44 overflow-hidden [--u:calc(100cqw/1680)] rounded-sm border-2 border-frame bg-gradient-to-b from-sky-top via-sky-mid to-ground">
      <span className="absolute left-3 top-2 text-xs text-muted">Scene background</span>
      <div className="absolute left-1/2 top-[12%] day:hidden">
        <SpritePlaceholder label="Moon" className="size-10 rounded-full" />
      </div>
      <div className="absolute left-1/2 top-[12%] hidden day:block">
        <SpritePlaceholder label="Sun" className="size-10 rounded-full" />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[18%] border-t-2 border-dashed border-ground bg-ground/70" />

      <div className="absolute bottom-[10%] left-[2%]">
        <CityDefense cityLevel={cityLevel} wallLevel={wallLevel} troopLevel={troopLevel} />
      </div>

      {/* The whole wave shares one HP pool, so it gets a single bar. */}
      <div className="absolute bottom-[14%] right-[3%] flex flex-col gap-2">
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
        <div className="flex items-end gap-2">
          {enemies.map((enemy, i) => (
            <SpritePlaceholder key={i} label={enemy} className={enemy === "Ogre" ? "h-24 w-20" : "size-10"} />
          ))}
        </div>
      </div>
    </section>
  );
}
