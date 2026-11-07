import SpritePlaceholder from "./SpritePlaceholder";

type BattleSceneProps = {
  enemies: string[];
};

/** Side-view stage: city on the left, the incoming wave on the right. */
export default function BattleScene({ enemies }: BattleSceneProps) {
  return (
    <section className="relative aspect-[2.8/1] min-h-44 overflow-hidden rounded-sm border-2 border-frame bg-gradient-to-b from-sky-top via-sky-mid to-ground">
      <span className="absolute left-3 top-2 text-xs text-muted">Scene background</span>
      <div className="absolute left-1/2 top-[12%] day:hidden">
        <SpritePlaceholder label="Moon" className="size-10 rounded-full" />
      </div>
      <div className="absolute left-1/2 top-[12%] hidden day:block">
        <SpritePlaceholder label="Sun" className="size-10 rounded-full" />
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[18%] border-t-2 border-dashed border-ground bg-ground/70" />

      <SpritePlaceholder label="City" className="absolute bottom-[14%] left-[2%] h-[72%] w-[38%]" />

      <div className="absolute bottom-[14%] right-[3%] flex items-end gap-[3%]">
        {enemies.map((enemy, i) => {
          const big = enemy === "Ogre";
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`h-1.5 rounded-full bg-red-600 ${big ? "w-16" : "w-8"}`} />
              <SpritePlaceholder label={enemy} className={big ? "h-24 w-20" : "size-10"} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
