"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

// Files live in public/audio/. Add the homepage song here (e.g. menu: "/audio/menu.ogg") once it's in.
const TRACKS = {
  idle: "/audio/idle_town.ogg",
  battle: "/audio/battle.ogg",
  // The end screens: "Lively Meadow" and "Death Is Just Another Path".
  victory: "/audio/victory.ogg",
  defeat: "/audio/defeat.ogg",
};

export type MusicTrack = keyof typeof TRACKS;

// Each song's playback volume, matched to its measured loudness (the end songs were mastered
// much quieter, and can't be boosted in the file without clipping their peaks). 1 is the most a browser
// allows.
const VOLUME: Record<MusicTrack, number> = {
  idle: 0.5,
  battle: 0.4,
  victory: 0.9,
  defeat: 1,
};
const FADE_MS = 500;

type MusicContextValue = {
  enabled: boolean;
  /** Music is on, but the browser is holding it back until the player interacts with the page. */
  blocked: boolean;
  toggleMusic: () => void;
  track: MusicTrack | null;
  setTrack: (track: MusicTrack | null) => void;
};

const MusicContext = createContext<MusicContextValue | null>(null);

// The on/off choice is saved like the theme (see ThemeProvider).
const STORAGE_KEY = "game-music";
const listeners = new Set<() => void>();
let memoryEnabled = true;

function readEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return memoryEnabled;
  }
}

function writeEnabled(enabled: boolean) {
  memoryEnabled = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Keep the in-memory value only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * Background music for the game screens. Pages pick a track with <PlayMusic track="..." />;
 * switching tracks crossfades. Browsers block sound until the player clicks or presses a key,
 * so the music starts on the first interaction.
 */
export default function MusicProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, readEnabled, () => true);
  const [track, setTrack] = useState<MusicTrack | null>(null);
  const [blocked, setBlocked] = useState(false);

  const audios = useRef(new Map<MusicTrack, HTMLAudioElement>());
  const fades = useRef(new Map<HTMLAudioElement, number>());
  // Last track that was asked to play: a new track starts from the top, the same one resumes.
  const lastTrack = useRef<MusicTrack | null>(null);
  // What should be audible right now; checked when a delayed play() finally starts.
  const target = useRef<MusicTrack | null>(null);

  const fade = useCallback((audio: HTMLAudioElement, to: number, onDone?: () => void) => {
    cancelAnimationFrame(fades.current.get(audio) ?? 0);
    const from = audio.volume;
    const start = performance.now();
    const step = (now: number) => {
      // rAF's timestamp is the frame start, which can be slightly before `start`: clamp, since
      // audio.volume throws outside 0–1.
      const t = Math.min(1, Math.max(0, (now - start) / FADE_MS));
      audio.volume = Math.min(1, Math.max(0, from + (to - from) * t));
      if (t < 1) {
        fades.current.set(audio, requestAnimationFrame(step));
      } else {
        fades.current.delete(audio);
        onDone?.();
      }
    };
    fades.current.set(audio, requestAnimationFrame(step));
  }, []);

  const apply = useCallback(() => {
    const wanted = enabled ? track : null;
    target.current = wanted;

    audios.current.forEach((audio, name) => {
      if (name !== wanted && !audio.paused) fade(audio, 0, () => audio.pause());
    });
    if (!wanted) return;

    let audio = audios.current.get(wanted);
    if (!audio) {
      audio = new Audio(TRACKS[wanted]);
      audio.loop = true;
      audio.volume = 0;
      audios.current.set(wanted, audio);
    }

    if (audio.paused) {
      if (lastTrack.current !== wanted) audio.currentTime = 0;
      const starting = audio;
      // Rejected while the browser still blocks autoplay, or when the file is missing.
      starting.play().then(
        () => {
          setBlocked(false);
          if (target.current === wanted) fade(starting, VOLUME[wanted]);
          else starting.pause();
        },
        (error: unknown) => {
          // Autoplay blocked (after a reload). Other failures, like a missing file, stay silent.
          if (error instanceof DOMException && error.name === "NotAllowedError") setBlocked(true);
        },
      );
    } else {
      fade(audio, VOLUME[wanted]);
    }
    lastTrack.current = wanted;
  }, [enabled, track, fade]);

  useEffect(() => {
    apply();
  }, [apply]);

  // Retry on the first click or key press after autoplay was blocked.
  useEffect(() => {
    const retry = (event: Event) => {
      // The Music button handles its own click (see toggleMusic).
      if (event.target instanceof Element && event.target.closest("[data-music-toggle]")) return;
      const wanted = enabled ? track : null;
      if (wanted && audios.current.get(wanted)?.paused !== false) apply();
    };
    window.addEventListener("pointerdown", retry);
    window.addEventListener("keydown", retry);
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [apply, enabled, track]);

  useEffect(() => {
    const playing = audios.current;
    return () => playing.forEach((audio) => audio.pause());
  }, []);

  // While blocked the button reads as "on" but nothing plays, so a click starts the music instead of turning it off.
  const toggleMusic = () => (enabled && blocked ? apply() : writeEnabled(!enabled));

  return (
    <MusicContext.Provider value={{ enabled, blocked, toggleMusic, track, setTrack }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic(): MusicContextValue {
  const context = useContext(MusicContext);
  if (!context) throw new Error("useMusic must be used inside MusicProvider");
  return context;
}

/** Plays `track` while this is on the page; fades out when the page leaves. */
export function PlayMusic({ track }: { track: MusicTrack }) {
  const { setTrack } = useMusic();

  useEffect(() => {
    setTrack(track);
    return () => setTrack(null);
  }, [track, setTrack]);

  return null;
}
