"use client";

import { useCallback, useSyncExternalStore } from "react";

// Same-tab updates: the browser's "storage" event only reaches other tabs.
const CHANGE_EVENT = "stored-flag-change";

function read(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false; // storage blocked (private mode, site data off): just use the default
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * An on/off preference kept in this browser's localStorage. The server render (and hydration) always
 * sees `false`, then the stored value takes over, so the page never mismatches.
 */
export function useStoredFlag(key: string): [boolean, (on: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false,
  );
  const set = useCallback(
    (on: boolean) => {
      try {
        window.localStorage.setItem(key, on ? "1" : "0");
      } catch {
        // Not saved; the preference simply won't survive a reload.
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key],
  );
  return [value, set];
}
