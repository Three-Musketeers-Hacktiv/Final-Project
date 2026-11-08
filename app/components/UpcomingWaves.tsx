import type { UpcomingWave } from "@/app/(game)/play/mockData";
import Icon from "./Icon";
import Panel from "./Panel";
import SpritePlaceholder from "./SpritePlaceholder";

export default function UpcomingWaves({ waves }: { waves: UpcomingWave[] }) {
  return (
    <Panel title="Upcoming Waves" icon={<Icon name="upcomingWaves" className="size-6" />}>
      <ul className="divide-y divide-frame/40">
        {waves.map((wave) => (
          <li key={wave.wave} className="flex items-center gap-2 py-3">
            <span className="font-bold">Wave {wave.wave}</span>
            <span className="text-muted">· Day {wave.day}</span>
            <div className="ml-auto flex gap-1.5">
              {wave.enemies.map((enemy, i) => (
                <SpritePlaceholder key={i} label={enemy} className="size-9" />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
