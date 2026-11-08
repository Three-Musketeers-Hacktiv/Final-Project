"use client";

import { useEffect, useRef, useState } from "react";

/** Length of one preparation day at 1× speed. */
export const DAY_MS = 10_000;
export const SPEEDS = [1, 2, 4, 8, 16] as const;
export type Speed = (typeof SPEEDS)[number];

const TICK_MS = 100;

type DayTimerOptions = {
  /** Count down only while true: not paused, a preparation day, and no request in flight. */
  running: boolean;
  speed: Speed;
  /** The timer restarts whenever this changes (a new day began). */
  day: number;
  /** Called once the day's time is up. */
  onDayEnd: () => void;
};

/**
 * Auto-progress clock for /play: a day lasts DAY_MS / speed. Pausing keeps the time already spent,
 * and changing speed keeps how far through the day it is. Returns that progress from 0 to 1.
 */
export function useDayTimer({ running, speed, day, onDayEnd }: DayTimerOptions) {
  // Game time spent on `day`, in 1× milliseconds. A different day means a fresh count.
  const elapsedRef = useRef({ day, ms: 0 });
  const [progress, setProgress] = useState({ day, value: 0 });
  const onDayEndRef = useRef(onDayEnd);

  useEffect(() => {
    onDayEndRef.current = onDayEnd;
  }, [onDayEnd]);

  useEffect(() => {
    if (elapsedRef.current.day !== day) elapsedRef.current = { day, ms: 0 };
    if (!running) return;

    const timer = setInterval(() => {
      const elapsed = elapsedRef.current;
      elapsed.ms = Math.min(DAY_MS, elapsed.ms + TICK_MS * speed);
      setProgress({ day, value: elapsed.ms / DAY_MS });
      if (elapsed.ms >= DAY_MS) {
        clearInterval(timer);
        onDayEndRef.current();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running, speed, day]);

  return progress.day === day ? progress.value : 0;
}
