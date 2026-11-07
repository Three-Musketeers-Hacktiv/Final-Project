import Panel from "./Panel";
import SpritePlaceholder from "./SpritePlaceholder";

// Matches the engine actions: upgradeCity, upgradeTroops, upgradeWall, repairCity.
const ACTIONS = [
  { id: "upgradeCity", label: "Upgrade City" },
  { id: "upgradeTroops", label: "Recruit Soldiers" },
  { id: "upgradeWall", label: "Upgrade Wall" },
  { id: "repairCity", label: "Repair Wall" },
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
            <SpritePlaceholder label="Icon" className="size-9" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}
