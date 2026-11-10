import { levelInTier, spriteTier, TIER_NUMERALS } from "./citySprites";
import Panel from "./Panel";
import Icon, { type IconName } from "./Icon";

type CityStatusProps = {
  hp: number;
  maxHp: number;
  wallLevel: number;
  troopLevel: number;
  cityLevel: number;
  attack: number;
  defense: number;
  income: number;
};

// Upgrades per tier: the bar shows progress through the current tier and empties on the next one
// (when the part's sprite changes; see citySprites).
const LEVELS_PER_TIER = 3;

function LevelBar({ filled, color }: { filled: number; color: string }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: LEVELS_PER_TIER }, (_, i) => (
        <div key={i} className={`h-2 flex-1 rounded-sm ${i < filled ? color : "bg-track"}`} />
      ))}
    </div>
  );
}

export default function CityStatus(props: CityStatusProps) {
  const { hp, maxHp } = props;
  const tracks: { label: string; icon: IconName; level: number; color: string }[] = [
    { label: "Wall Level", icon: "wallLevel", level: props.wallLevel, color: "bg-amber-400" },
    { label: "Troop Level", icon: "troopLevel", level: props.troopLevel, color: "bg-sky-500" },
    { label: "City Level", icon: "cityLevel", level: props.cityLevel, color: "bg-purple-500" },
  ];
  const stats: { label: string; icon: IconName; value: number }[] = [
    { label: "Attack", icon: "attack", value: props.attack },
    { label: "Defense", icon: "defense", value: props.defense },
    { label: "Income", icon: "income", value: props.income },
  ];

  return (
    <Panel title="City Status">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Icon name="cityHp" />
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
            <Icon name={track.icon} />
            <div className="flex-1">
              <div className="mb-1 flex justify-between">
                <span>{track.label}</span>
                <span>
                  Tier {TIER_NUMERALS[spriteTier(track.level)]} - Lv {levelInTier(track.level)}
                </span>
              </div>
              <LevelBar filled={levelInTier(track.level)} color={track.color} />
            </div>
          </div>
        ))}

        <hr className="border-frame/60" />

        <dl className="flex flex-col gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <Icon name={stat.icon} className="size-6" />
              <dt className="flex-1">{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}
