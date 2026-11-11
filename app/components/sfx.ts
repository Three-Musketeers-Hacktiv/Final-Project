"use client";

import { useEffect, useSyncExternalStore } from "react";

// Files live in public/audio/sfx/, named after the sound.
export type Sound =
  | "button"
  | "punch"
  | "thrust"
  | "claw"
  | "hammer-smash"
  | "ice-spikes"
  | "star-fall"
  | "heavy-cleave"
  | "meteor"
  | "dark-explosion"
  | "wave-death"
  | "defeat"
  | "hex-sigil"
  | "city-wall-up-tier"
  | "troop-up-tier"
  | "reward";

const VOLUME = 0.6;

// The on/off choice is saved like the music's (see MusicProvider); on by default.
const STORAGE_KEY = "game-sfx";
const listeners = new Set<() => void>();
let memoryEnabled = true;

function readEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return memoryEnabled;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function setSfxEnabled(enabled: boolean) {
  memoryEnabled = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Keep the in-memory value only.
  }
  if (!enabled) stopSounds();
  listeners.forEach((listener) => listener());
}

/** Whether sound effects are on; the server render sees them on. */
export function useSfxEnabled() {
  return useSyncExternalStore(subscribe, readEnabled, () => true);
}

// Played through the Web Audio API: each file is fetched and decoded once, then starts without delay and
// can overlap itself, which a new Audio() per hit does poorly.
let context: AudioContext | null = null;
let output: GainNode | null = null;
const buffers = new Map<Sound, Promise<AudioBuffer | null>>();
// What's playing on each channel; a new sound on a channel cuts the one before.
const channels = new Map<string, AudioBufferSourceNode>();
const playing = new Set<AudioBufferSourceNode>();

function audio() {
  if (!context) {
    context = new AudioContext();
    output = context.createGain();
    output.gain.value = VOLUME;
    output.connect(context.destination);
  }
  return { context, output: output! };
}

function load(sound: Sound) {
  let buffer = buffers.get(sound);
  if (!buffer) {
    // A missing or broken file just stays silent.
    buffer = fetch(`/audio/sfx/${sound}.ogg`)
      .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(response.statusText))))
      .then((data) => audio().context.decodeAudioData(data))
      .catch(() => null);
    buffers.set(sound, buffer);
  }
  return buffer;
}

/** Fetches and decodes these sounds ahead of time, so their first play isn't late. */
export function preloadSounds(sounds: readonly Sound[]) {
  sounds.forEach(load);
}

/**
 * Plays a sound unless effects are off. With a `channel`, it cuts whatever that channel was playing
 * (one attack sound per side at a time, so fast replays don't pile up). The browser keeps audio
 * silent until the player has clicked or pressed a key on the page.
 */
export function playSound(sound: Sound, { channel }: { channel?: string } = {}) {
  if (!readEnabled()) return;
  const { context, output } = audio();
  if (context.state === "suspended") void context.resume();
  if (channel) stopChannel(channel);
  void load(sound).then((buffer) => {
    if (!buffer || !readEnabled()) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(output);
    source.onended = () => {
      playing.delete(source);
      if (channel && channels.get(channel) === source) channels.delete(channel);
    };
    if (channel) {
      // Another sound may have taken the channel while this one was loading.
      stopChannel(channel);
      channels.set(channel, source);
    }
    playing.add(source);
    source.start();
  });
}

// stop() on a source that already ended is harmless in current browsers; the guard covers older ones.
function stop(source: AudioBufferSourceNode | undefined) {
  try {
    source?.stop();
  } catch {
    // Already stopped.
  }
}

function stopChannel(channel: string) {
  stop(channels.get(channel));
  channels.delete(channel);
}

/** Stops every sound that is playing (effects turned off, a skipped replay). */
export function stopSounds() {
  playing.forEach(stop);
  playing.clear();
  channels.clear();
}

/** Clicking a button marked `data-sfx="button"` plays the button sound. Mount once on a page. */
export function useButtonSounds() {
  useEffect(() => {
    preloadSounds(["button"]);
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("button[data-sfx='button']")) playSound("button");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}
