import Panel from "./Panel";
import SpritePlaceholder from "./SpritePlaceholder";

export default function Resources({ gold }: { gold: number }) {
  return (
    <Panel title="Resources">
      <div className="flex items-center gap-3 text-lg">
        <SpritePlaceholder label="Gold" />
        <span className="flex-1">Gold</span>
        <span className="font-semibold text-gold">{gold}</span>
      </div>
    </Panel>
  );
}
