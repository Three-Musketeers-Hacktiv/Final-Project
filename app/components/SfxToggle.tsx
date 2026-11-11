"use client";

import ControlButton from "./ControlButton";
import { setSfxEnabled, useSfxEnabled } from "./sfx";

export default function SfxToggle() {
  const enabled = useSfxEnabled();

  return (
    <ControlButton
      active={enabled}
      label={enabled ? "Turn sound effects off" : "Turn sound effects on"}
      onClick={() => setSfxEnabled(!enabled)}
    >
      SFX
    </ControlButton>
  );
}
