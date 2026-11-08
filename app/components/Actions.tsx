import type { GamePhase } from "../../src/game";
import GameButton from "./GameButton";
import Icon, { type IconName } from "./Icon";
import Panel from "./Panel";

export type ActionId = "upgradeCity" | "upgradeTroops" | "upgradeWall" | "repairCity";

// Matches the engine actions: upgradeCity, upgradeTroops, upgradeWall, repairCity.
const ACTIONS: { id: ActionId; label: string; icon: IconName }[] = [
  { id: "upgradeCity", label: "Upgrade City", icon: "cityLevel" },
  { id: "upgradeTroops", label: "Recruit Soldiers", icon: "troopLevel" },
  { id: "upgradeWall", label: "Upgrade Wall", icon: "wallLevel" },
  { id: "repairCity", label: "Repair Wall", icon: "repairWall" },
];

type ActionsProps = {
  phase: GamePhase;
  actionUsedToday: boolean;
  /** Gold cost per action, from GameView.stats (never computed in the UI). */
  costs: Record<ActionId, number>;
  /** A request is in flight: block every button so a double click can't send twice. */
  pending: boolean;
  onAction: (id: ActionId) => void;
  onEndDay: () => void;
};

/** One action per preparation day (`actionUsedToday`), then End Day moves to the next day. */
export default function Actions({ phase, actionUsedToday, costs, pending, onAction, onEndDay }: ActionsProps) {
  const preparing = phase === "preparation";
  const status = !preparing
    ? "Actions are only available on preparation days."
    : actionUsedToday
      ? "Today's action is used."
      : "1 action left today.";

  return (
    <Panel title="Actions" subtitle="(1 per day)" className="@container">
      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={!preparing || actionUsedToday || pending}
            onClick={() => onAction(action.id)}
            className="flex items-center gap-3 rounded-sm border-2 border-gold/60 bg-panel-head px-3 py-2 text-left leading-tight text-parchment transition-colors hover:border-gold hover:bg-track disabled:pointer-events-none disabled:opacity-45"
          >
            <Icon name={action.icon} className="size-9" />
            <span className="flex flex-col">
              {action.label}
              <span className="flex items-center gap-1 text-sm text-gold">
                <Icon name="gold" className="size-4" />
                {costs[action.id]}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-frame/40 pt-3">
        <p className="text-muted">{status}</p>
        <GameButton variant="primary" disabled={!preparing || pending} onClick={onEndDay}>
          End Day ▸
        </GameButton>
      </div>
    </Panel>
  );
}
