import Panel from "./Panel";
import SpritePlaceholder from "./SpritePlaceholder";

type CityStatusProps = {
  hp: number;
  maxHp: number;
  wallLevel: number;
  troopLevel: number;
  cityLevel: number;
  maxLevel: number;
  attack: number;
  defense: number;
  income: number;
};

function LevelBar({ level, max, color }: { level: number; max: number; color: string }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className={`h-2 flex-1 rounded-sm ${i < level ? color : "bg-track"}`} />
      ))}
    </div>
  );
}

export default function CityStatus(props: CityStatusProps) {
  const { hp, maxHp, maxLevel } = props;
  const tracks = [
    { label: "Wall Level", level: props.wallLevel, color: "bg-amber-400" },
    { label: "Troop Level", level: props.troopLevel, color: "bg-sky-500" },
    { label: "City Level", level: props.cityLevel, color: "bg-purple-500" },
  ];
  const stats = [
    { label: "Attack", value: props.attack },
    { label: "Defense", value: props.defense },
    { label: "Income", value: props.income },
  ];

  return (
    <Panel title="City Status">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <SpritePlaceholder label="HP" />
          <div className="flex-1">
            <div className="flex justify-between">
              <span>City HP</span>
              <span>
                {hp} / {maxHp}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-track">
              <div className="h-full bg-green-500" style={{ width: `${(hp / maxHp) * 100}%` }} />
            </div>
          </div>
        </div>

        {tracks.map((track) => (
          <div key={track.label} className="flex items-center gap-3">
            <SpritePlaceholder label={track.label.split(" ")[0]} />
            <div className="flex-1">
              <div className="mb-1 flex justify-between">
                <span>{track.label}</span>
                <span>
                  {track.level} / {maxLevel}
                </span>
              </div>
              <LevelBar level={track.level} max={maxLevel} color={track.color} />
            </div>
          </div>
        ))}

        <hr className="border-frame/60" />

        <dl className="flex flex-col gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <SpritePlaceholder label={stat.label.slice(0, 3)} className="size-6" />
              <dt className="flex-1">{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}
