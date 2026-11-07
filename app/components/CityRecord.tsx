import Panel from "./Panel";
import SpritePlaceholder from "./SpritePlaceholder";

type CityRecordProps = {
  name: string;
  campaign: string;
  faction: string;
  region: string;
  difficulty: string;
  tier: string;
  defenseType: string;
};

export default function CityRecord({ name, campaign, ...details }: CityRecordProps) {
  const rows = [
    ["Faction", details.faction],
    ["Region", details.region],
    ["Difficulty", details.difficulty],
    ["City Tier", details.tier],
    ["Defense Type", details.defenseType],
  ];

  return (
    <Panel title="City Record" accent aside={<span className="text-sm text-parchment/90">{campaign}</span>}>
      <div className="flex gap-4">
        <SpritePlaceholder label="City portrait" className="size-24" />
        <div className="min-w-0 flex-1">
          <h3 className="mb-2 text-2xl font-bold text-parchment">{name}</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="text-parchment">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Panel>
  );
}
