"use client";

import ControlButton from "./ControlButton";
import { setSfxEnabled, useSfxEnabled } from "./sfx";

/** A speaker with sound waves, drawn in the text color to sit beside the label like ☾ and ♪. */
function SpeakerIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="mr-1 inline-block size-[1.1em] -translate-y-px align-middle"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
      <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5" />
      <path d="M12.5 3.5a6.5 6.5 0 0 1 0 9" />
    </svg>
  );
}

export default function SfxToggle() {
  const enabled = useSfxEnabled();

  return (
    <ControlButton
      active={enabled}
      label={enabled ? "Turn sound effects off" : "Turn sound effects on"}
      onClick={() => setSfxEnabled(!enabled)}
    >
      <SpeakerIcon />
      SFX
    </ControlButton>
  );
}
