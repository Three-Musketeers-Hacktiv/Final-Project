"use client";

import ControlButton from "./ControlButton";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "night" ? "day" : "night";

  return (
    <ControlButton label={`Switch to ${next} mode`} onClick={toggleTheme}>
      {theme === "night" ? "☾ Night" : "☀ Day"}
    </ControlButton>
  );
}
