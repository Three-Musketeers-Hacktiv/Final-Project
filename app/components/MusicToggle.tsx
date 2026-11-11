"use client";

import ControlButton from "./ControlButton";
import { useMusic } from "./MusicProvider";

export default function MusicToggle() {
  const { enabled, blocked, toggleMusic } = useMusic();
  const playing = enabled && !blocked;

  return (
    <span data-music-toggle className="contents">
      <ControlButton
        active={playing}
        label={playing ? "Turn music off" : enabled ? "Start music" : "Turn music on"}
        onClick={toggleMusic}
      >
        ♪ Music
      </ControlButton>
    </span>
  );
}
