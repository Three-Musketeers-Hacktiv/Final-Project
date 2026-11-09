"use client";

import { useEffect, useRef, useState } from "react";
import type { BattleResult } from "../../src/game";
import { EXPLOSION, thrustFrameAt } from "./battleSprites";

/** Length of one attack round at 1× speed: charge, hit, return, short rest. */
export const ROUND_MS = 1000;
// Points within a round, as fractions of ROUND_MS.
const IMPACT_AT = 0.4;
const FLASH_UNTIL = 0.6;
const BACK_AT = 0.75;
// The thrust effect starts this long before impact, so its flash lands on the hit.
const THRUST_LEAD_MS = 100;
// The soldiers' lunge, in ms from the start of its thrust: steps in until the hit, holds, then
// settles back.
const LUNGE_IN_MS = THRUST_LEAD_MS;
const LUNGE_HOLD_UNTIL_MS = 250;
const LUNGE_BACK_UNTIL_MS = 550;

// The outro, in ms from the last hit, always at 1×. A win: the wave falls, then the report opens.
const WIN_RESULT_AT = 1500;
// A loss: the soldiers fall, the camera closes in on the town, the town and then the whole scene go
// dark, the town explodes while the light comes back, and the defeat screen opens 2 s after that.
// The soldiers' fall takes the first second (see CityDefense).
const ZOOM_IN = [1000, 2000] as const;
const TOWN_DARK = [2000, 2500] as const;
const BLACKOUT = [2500, 3000] as const;
const EXPLODE_AT = 3000;
const RESTORE = [3000, 4600] as const;
const LOSS_RESULT_AT = RESTORE[1] + 2000;
// The explosion fades out over its last moments, behind the defeat screen.
const EXPLOSION_FADE_MS = 500;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0 before `range`, 1 after it, eased in between. */
function progress(ms: number, [from, to]: readonly [number, number]) {
  const t = clamp01((ms - from) / (to - from));
  return t * t * (3 - 2 * t);
}

/** When the last hit lands and when the replay ends, in ms of replay time (see useBattlePlayback). */
export function battleTiming(result: BattleResult) {
  const lastHitAt = (result.rounds.length - 1 + IMPACT_AT) * ROUND_MS;
  const outroMs = result.won ? WIN_RESULT_AT : EXPLODE_AT + EXPLOSION.durationMs;
  return { lastHitAt, endAt: lastHitAt + outroMs };
}

export type BattleFrame = {
  cityHp: number;
  monsterHp: number;
  /** How far the wave has moved toward the city: 0 at its post, 1 at the moment of impact. */
  advance: number;
  /** True right after impact, while the wave flashes red. */
  flashing: boolean;
  /** Frame of the soldiers' thrust effect, or null between thrusts. */
  thrustFrame: number | null;
  /** How far the soldiers have lunged: 0 standing, 1 fully forward. */
  lunge: number;
  /** Ms since the wave started to fall (its HP reached 0), or null. */
  waveDeathMs: number | null;
  /** Ms since the soldiers started to fall (the city's HP reached 0), or null. */
  troopDeathMs: number | null;
  /** Camera closeness on the town: 0 normal view, 1 fully zoomed in. */
  zoom: number;
  /** How dark the town is: 0 normal, 1 nearly black. */
  townDark: number;
  /** The town has been blown up (the explosion has started): its sprites are gone. */
  townDestroyed: boolean;
  /** Opacity of the black screen over the whole scene. */
  blackout: number;
  /** Frame of the explosion over the town, or null. */
  explosionFrame: number | null;
  explosionOpacity: number;
  /** Opacity of the HP bars; they fade out as the camera moves in. */
  hudOpacity: number;
  /** True once the report or defeat screen may open. */
  showResult: boolean;
};

/**
 * What the scene shows `elapsed` ms (at 1×) into the replay. Every HP value comes from the saved
 * round log; nothing is recalculated here.
 */
export function battleFrame(result: BattleResult, elapsed: number): BattleFrame {
  const { rounds } = result;
  const index = Math.min(Math.floor(elapsed / ROUND_MS), rounds.length);
  const t = index === rounds.length ? 0 : (elapsed % ROUND_MS) / ROUND_MS;
  // Rounds whose hit has landed so far.
  const hits = index + (t >= IMPACT_AT ? 1 : 0);
  const last = hits > 0 ? rounds[Math.min(hits, rounds.length) - 1] : null;

  let advance = 0;
  if (index < rounds.length) {
    if (t < IMPACT_AT) advance = (t / IMPACT_AT) ** 2; // speeds up into the hit
    else if (t < BACK_AT) advance = (1 - (t - IMPACT_AT) / (BACK_AT - IMPACT_AT)) ** 2; // recoils, then settles
  }

  // One thrust per round, timed from that round's impact.
  const sinceThrust = elapsed - (IMPACT_AT * ROUND_MS - THRUST_LEAD_MS);
  const thrustRound = Math.floor(sinceThrust / ROUND_MS);
  const thrusting = thrustRound >= 0 && thrustRound < rounds.length;
  const thrustMs = sinceThrust - thrustRound * ROUND_MS;
  const thrustFrame = thrusting ? thrustFrameAt(thrustMs) : null;
  let lunge = 0;
  if (thrusting) {
    if (thrustMs < LUNGE_IN_MS) lunge = Math.sqrt(thrustMs / LUNGE_IN_MS); // quick step in
    else if (thrustMs < LUNGE_HOLD_UNTIL_MS) lunge = 1;
    else if (thrustMs < LUNGE_BACK_UNTIL_MS)
      lunge = 1 - ((thrustMs - LUNGE_HOLD_UNTIL_MS) / (LUNGE_BACK_UNTIL_MS - LUNGE_HOLD_UNTIL_MS)) ** 2;
  }

  // The outro, measured from the last hit.
  const sinceEnd = elapsed - battleTiming(result).lastHitAt;
  const waveDeathMs = result.monsterHpAfter === 0 && sinceEnd >= 0 ? sinceEnd : null;
  const troopDeathMs = result.cityHpAfter === 0 && sinceEnd >= 0 ? sinceEnd : null;
  const lost = !result.won;
  const restore = lost ? progress(sinceEnd, RESTORE) : 0;
  const explosionMs = sinceEnd - EXPLODE_AT;
  const explosionFrame = lost ? EXPLOSION.frameAt(explosionMs) : null;

  return {
    cityHp: last ? last.cityHpAfter : result.cityHpBefore,
    monsterHp: last ? last.monsterHpAfter : result.monsterHpBefore,
    advance,
    flashing: index < rounds.length && t >= IMPACT_AT && t < FLASH_UNTIL,
    thrustFrame,
    lunge,
    waveDeathMs,
    troopDeathMs,
    zoom: lost ? progress(sinceEnd, ZOOM_IN) * (1 - restore) : 0,
    townDark: lost ? progress(sinceEnd, TOWN_DARK) * (1 - restore) : 0,
    blackout: lost ? progress(sinceEnd, BLACKOUT) * (1 - restore) : 0,
    townDestroyed: lost && explosionMs >= 0,
    explosionFrame,
    explosionOpacity: clamp01((EXPLOSION.durationMs - explosionMs) / EXPLOSION_FADE_MS),
    hudOpacity: lost ? 1 - progress(sinceEnd, [ZOOM_IN[0], ZOOM_IN[0] + 400]) : 1,
    showResult: sinceEnd >= (lost ? LOSS_RESULT_AT : WIN_RESULT_AT),
  };
}

/**
 * Replays a resolved battle round by round, then its outro (deaths, and on a loss the town's
 * destruction). `speed` scales the rounds like the day clock; the outro always plays at 1×.
 * `onDone` runs once everything has played. Pass null when nothing is playing.
 */
export function useBattlePlayback({
  result,
  speed,
  onDone,
}: {
  result: BattleResult | null;
  speed: number;
  onDone: () => void;
}): BattleFrame | null {
  // Keyed by result so a new battle starts from zero without resetting state in an effect.
  const [elapsed, setElapsed] = useState<{ result: BattleResult | null; ms: number }>({ result, ms: 0 });
  const elapsedRef = useRef({ result, ms: 0 });
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!result) return;
    if (elapsedRef.current.result !== result) elapsedRef.current = { result, ms: 0 };
    const { lastHitAt, endAt } = battleTiming(result);
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      elapsedRef.current.ms += (now - last) * (elapsedRef.current.ms < lastHitAt ? speed : 1);
      last = now;
      setElapsed({ result, ms: elapsedRef.current.ms });
      if (elapsedRef.current.ms >= endAt) {
        onDoneRef.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [result, speed]);

  if (!result) return null;
  return battleFrame(result, elapsed.result === result ? elapsed.ms : 0);
}
