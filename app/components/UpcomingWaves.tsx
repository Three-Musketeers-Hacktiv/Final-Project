import Image from "next/image";
import Icon from "./Icon";
import Panel from "./Panel";
import type { UpcomingWave } from "./waveInfo";

// Only the next few waves are listed, and only as silhouettes: what comes later stays a mystery.
const SHOWN = 3;
// A mid-grey silhouette reads on both the night and the day panel (pure black vanishes at night).
const SILHOUETTE = "brightness(0) invert(0.35)";

export default function UpcomingWaves({ waves }: { waves: UpcomingWave[] }) {
  return (
    <Panel title="Upcoming Waves" icon={<Icon name="upcomingWaves" className="size-6" />}>
      {waves.length === 0 && <p className="py-2 text-muted">No more waves after this one.</p>}
      <ul className="divide-y divide-frame/40">
        {waves.slice(0, SHOWN).map((wave) => (
          <li key={wave.wave} className="flex items-center gap-2 py-3">
            <span className="font-bold">Wave {wave.wave}</span>
            <span className="text-muted">· Day {wave.day}</span>
            {wave.art && (
              <Image
                src={wave.art}
                alt="Unknown monsters"
                sizes="5rem"
                className="ml-auto h-auto w-20"
                style={{ filter: SILHOUETTE }}
              />
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
