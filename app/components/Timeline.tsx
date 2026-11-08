import type { TimelineEntry, TimelineTone } from "@/lib/timeline";
import Panel from "./Panel";
import Icon from "./Icon";

const FILTERS = [
  { id: "all", label: "All", dot: null },
  { id: "city", label: "City", dot: "bg-sky-500" },
  { id: "battle", label: "Battle", dot: "bg-red-500" },
  { id: "event", label: "Event", dot: "bg-green-500" },
];

const TONE_CLASS: Record<TimelineTone, string> = {
  city: "text-sky-300 day:text-sky-700",
  gain: "text-green-400 day:text-green-700",
  loss: "text-red-400 day:text-red-700",
  neutral: "text-parchment",
};

export default function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const filters = (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map((filter, i) => (
        <button
          key={filter.id}
          type="button"
          className={`flex items-center gap-1.5 rounded-sm border border-frame px-2.5 py-0.5 text-sm ${
            i === 0 ? "bg-gold/80 font-bold text-zinc-900" : "bg-panel text-parchment"
          }`}
        >
          {filter.dot && <span className={`size-2.5 rounded-full ${filter.dot}`} />}
          {filter.label}
        </button>
      ))}
    </div>
  );

  return (
    <Panel title="Timeline" icon={<Icon name="timeline" className="size-6" />} aside={filters} className="flex-1">
      {entries.length === 0 && <p className="py-2 text-muted">Nothing has happened yet. Your actions will show up here.</p>}
      <ol className="relative">
        {entries.map((entry) => (
          <li
            key={entry.id ?? `${entry.day}-${entry.highlight ?? entry.text}`}
            className="flex items-center gap-4 border-b border-frame/40 py-2.5 last:border-b-0"
          >
            <span className="size-3 shrink-0 rounded-full border-2 border-muted" />
            <span className="w-14 shrink-0 text-sm text-muted">Day {String(entry.day).padStart(2, "0")}</span>
            <Icon name={entry.icon} className="size-6" />
            <p>
              {entry.highlight && <span className={TONE_CLASS[entry.tone]}>{entry.highlight} </span>}
              {entry.text}
            </p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
