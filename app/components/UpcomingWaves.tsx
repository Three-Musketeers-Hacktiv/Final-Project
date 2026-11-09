import Image from "next/image";
import Icon from "./Icon";
import Panel from "./Panel";
import type { UpcomingWave } from "./waveInfo";

export default function UpcomingWaves({ waves }: { waves: UpcomingWave[] }) {
  return (
    <Panel title="Upcoming Waves" icon={<Icon name="upcomingWaves" className="size-6" />}>
      {waves.length === 0 && <p className="py-2 text-muted">No more waves after this one.</p>}
      <ul className="divide-y divide-frame/40">
        {waves.map((wave) => (
          <li key={wave.wave} className="flex items-center gap-2 py-3">
            <span className="font-bold">Wave {wave.wave}</span>
            <span className="text-muted">· Day {wave.day}</span>
            {wave.art && <Image src={wave.art} alt={wave.name} sizes="5rem" className="ml-auto h-auto w-20" />}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
