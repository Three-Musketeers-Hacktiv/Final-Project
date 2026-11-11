"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { TimelineCategory, TimelineEntry, TimelineTone } from "@/lib/timeline";
import Panel from "./Panel";
import Icon from "./Icon";

type FilterId = "all" | TimelineCategory;

const FILTERS: { id: FilterId; label: string; dot: string | null }[] = [
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

// "Day N began" entries are the only ones the server gives the timeline icon. They are filed under
// City, but the City filter leaves them out so it lists the player's own city work.
const isDayStart = (entry: TimelineEntry) => entry.icon === "timeline";

function matchesFilter(entry: TimelineEntry, filter: FilterId) {
  if (filter === "all") return true;
  if (filter === "city" && isDayStart(entry)) return false;
  return entry.category === filter;
}

// The list shows this many entries; the rest scroll into view.
const VISIBLE_ENTRIES = 10;

/** The run's history, newest first, filtered by category. */
export default function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const [filter, setFilter] = useState<FilterId>("all");
  const shown = entries.filter((entry) => matchesFilter(entry, filter));
  const listRef = useRef<HTMLOListElement>(null);
  // Height of the first VISIBLE_ENTRIES rows; rows can wrap, so it is measured rather than fixed.
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const cutoff = list.children[VISIBLE_ENTRIES] as HTMLElement | undefined;
      setMaxHeight(cutoff ? cutoff.offsetTop : undefined);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [shown.length, filter]);

  const filters = (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map((option) => {
        const active = option.id === filter;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => setFilter(option.id)}
            className={`flex items-center gap-1.5 rounded-sm border border-frame px-2.5 py-0.5 text-sm transition-colors ${
              active ? "bg-gold/80 font-bold text-zinc-900" : "bg-panel text-parchment hover:bg-panel-head"
            }`}
          >
            {option.dot && <span className={`size-2.5 rounded-full ${option.dot}`} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <Panel title="Timeline" icon={<Icon name="timeline" className="size-6" />} aside={filters} className="flex-1">
      {shown.length === 0 && (
        <p className="py-2 text-muted">
          {entries.length === 0
            ? "Nothing has happened yet. Your actions will show up here."
            : `No ${filter} entries yet.`}
        </p>
      )}
      {/* offsetTop of the rows is measured from here, so the list is the positioned parent. */}
      <ol ref={listRef} className="scrollbar-game relative overflow-y-auto" style={{ maxHeight }}>
        {shown.map((entry) => (
          <li key={entry.id} className="flex items-center gap-4 border-b border-frame/40 py-2.5 last:border-b-0">
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
