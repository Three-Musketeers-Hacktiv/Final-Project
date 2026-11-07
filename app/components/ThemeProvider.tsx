"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

export type Theme = "night" | "day";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "game-theme";
const listeners = new Set<() => void>();
// Used when localStorage is unavailable (private mode, blocked storage).
let memoryTheme: Theme = "night";

function readTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "day" ? "day" : "night";
  } catch {
    return memoryTheme;
  }
}

function writeTheme(theme: Theme) {
  memoryTheme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Keep the in-memory value only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keeps other open tabs in sync.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

type ThemeProviderProps = {
  className?: string;
  children: ReactNode;
};

/** Holds day/night mode (saved in localStorage) and sets data-theme so the palette in globals.css switches. */
export default function ThemeProvider({ className = "", children }: ThemeProviderProps) {
  // Server render is always night; the saved mode applies on hydration.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "night" as Theme);
  const toggleTheme = () => writeTheme(theme === "night" ? "day" : "night");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div data-theme={theme} className={className}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
