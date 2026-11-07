import Icon, { type IconName } from "./Icon";
import Panel from "./Panel";

// Matches the engine actions: upgradeCity, upgradeTroops, upgradeWall, repairCity.
const ACTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: "upgradeCity", label: "Upgrade City", icon: "cityLevel" },
  { id: "upgradeTroops", label: "Recruit Soldiers", icon: "troopLevel" },
  { id: "upgradeWall", label: "Upgrade Wall", icon: "wallLevel" },
  { id: "repairCity", label: "Repair Wall", icon: "repairWall" },
];

export default function Actions() {
  return (
    <Panel title="Actions" subtitle="(1 per day)" className="@container">
      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="flex items-center gap-3 rounded-sm border-2 border-gold/60 bg-panel-head px-3 py-2 text-left leading-tight text-parchment transition-colors hover:border-gold hover:bg-track"
          >
            <Icon name={action.icon} className="size-9" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}
