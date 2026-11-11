"use client";

import { useMusic, type MusicTrack } from "./MusicProvider";

const PREVIEW_TRACKS: MusicTrack[] = ["idle", "battle"];

/** Temporary: switch tracks from the preview menu until `state.phase` picks the music. */
export default function MusicPreview() {
  const { track, setTrack } = useMusic();

  return (
    <div className="flex gap-1 border-t-2 border-dashed border-gold/40 px-2 py-1.5">
      <span className="py-1 text-muted">Music:</span>
      {PREVIEW_TRACKS.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => setTrack(name)}
          className={`rounded-sm px-2 py-1 capitalize ${track === name ? "bg-gold/80 font-bold text-zinc-900" : "hover:bg-track"}`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
