"use client";

import { useEffect, useRef, useState } from "react";
import type { BattleResult } from "../../src/game";
import { gameConfig } from "../../src/game/config";
import { EXPLOSION, HEX_SIGIL, HEX_SIGIL_FLARE_MS, MONSTER_ATTACKS, thrustFrameAt } from "./battleSprites";
import { playSound, preloadSounds, stopSounds, type Sound } from "./sfx";

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
// Beating the last wave (the Demon King) plays the same beats on him: the camera closes in on him, he
// and then the scene go dark, the hex sigil seals him while the light comes back, and the victory
// screen opens 2 s after that.
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

/** True when this battle beat the final wave: its outro is the Demon King's sealing. */
function isFinalVictory(result: BattleResult) {
  return result.won && result.wave === gameConfig.waves.length;
}

// Each wave's attack sound, played on every hit. Waves 1 and 2 have no attack effect, just a punch;
// wave 7 reuses the soldiers' thrust.
const ATTACK_SOUNDS: Record<number, Sound> = {
  1: "punch",
  2: "punch",
  3: "claw",
  4: "hammer-smash",
  5: "ice-spikes",
  6: "star-fall",
  7: "thrust",
  8: "heavy-cleave",
  9: "meteor",
  10: "dark-explosion",
};
// When the sigil's ring shatters (frame 45), in ms into the sigil; its sound ends right there.
const HEX_SIGIL_SHATTER_MS = 2970;
// Length of hex-sigil.ogg.
const HEX_SIGIL_SOUND_MS = 3170;
// A cue missed by more than this (the tab was in the background) is dropped instead of played late.
const LATE_CUE_MS = 300;

type SoundCue = { at: number; sound: Sound; channel?: string };

/** The replay's sounds, in ms of replay time (the same clock as battleFrame), in order. */
export function battleSounds(result: BattleResult): SoundCue[] {
  const cues: SoundCue[] = [];
  const attackSound = ATTACK_SOUNDS[result.wave];
  result.rounds.forEach((_, round) => {
    const impact = (round + IMPACT_AT) * ROUND_MS;
    cues.push({ at: impact - THRUST_LEAD_MS, sound: "thrust", channel: "troops" });
    if (attackSound) cues.push({ at: impact, sound: attackSound, channel: "wave" });
  });
  const { lastHitAt } = battleTiming(result);
  if (isFinalVictory(result)) {
    cues.push({
      at: lastHitAt + EXPLODE_AT + HEX_SIGIL_SHATTER_MS - HEX_SIGIL_SOUND_MS,
      sound: "hex-sigil",
      channel: "outro",
    });
  } else if (result.won) {
    cues.push({ at: lastHitAt, sound: "wave-death", channel: "outro" });
  } else {
    cues.push({ at: lastHitAt + EXPLODE_AT, sound: "defeat", channel: "outro" });
  }
  return cues.sort((a, b) => a.at - b.at);
}

/** When the last hit lands and when the replay ends, in ms of replay time (see useBattlePlayback). */
export function battleTiming(result: BattleResult) {
  const lastHitAt = (result.rounds.length - 1 + IMPACT_AT) * ROUND_MS;
  const outroMs = isFinalVictory(result)
    ? EXPLODE_AT + HEX_SIGIL.durationMs
    : result.won
      ? WIN_RESULT_AT
      : EXPLODE_AT + EXPLOSION.durationMs;
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
  /** Frames of the wave's own attack effect showing now (rounds' effects may overlap), oldest first. */
  monsterAttackFrames: number[];
  /** What the camera closes in on during an outro: the fallen town, or the defeated Demon King. */
  focus: "town" | "wave";
  /** Camera closeness: 0 normal view, 1 fully zoomed in. */
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
  /** How dark the Demon King is during his sealing: 0 normal, 1 nearly black. */
  waveDark: number;
  /** The Demon King has been sealed away: his sprite is gone. */
  waveGone: boolean;
  /** Frame of the hex sigil over the Demon King, or null. */
  sigilFrame: number | null;
  sigilOpacity: number;
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

  // The wave's own attack: one per round, its impact lined up with that round's hit. Long effects run
  // on into the next round, so several can show at once.
  const attack = MONSTER_ATTACKS[result.wave];
  const monsterAttackFrames: number[] = [];
  if (attack) {
    for (let round = 0; round < rounds.length; round++) {
      const frame = attack.sheet.frameAt(elapsed - ((round + IMPACT_AT) * ROUND_MS - attack.impactMs));
      if (frame !== null) monsterAttackFrames.push(frame);
    }
  }

  // The outro, measured from the last hit.
  const sinceEnd = elapsed - battleTiming(result).lastHitAt;
  const lost = !result.won;
  const finalVictory = isFinalVictory(result);
  const cinematic = lost || finalVictory;
  // The Demon King is sealed, not toppled.
  const waveDeathMs = result.monsterHpAfter === 0 && sinceEnd >= 0 && !finalVictory ? sinceEnd : null;
  const troopDeathMs = result.cityHpAfter === 0 && sinceEnd >= 0 ? sinceEnd : null;
  const restore = cinematic ? progress(sinceEnd, RESTORE) : 0;
  const finaleMs = sinceEnd - EXPLODE_AT;
  const explosionFrame = lost ? EXPLOSION.frameAt(finaleMs) : null;
  const sigilFrame = finalVictory ? HEX_SIGIL.frameAt(finaleMs) : null;
  const dark = progress(sinceEnd, TOWN_DARK) * (1 - restore);

  return {
    cityHp: last ? last.cityHpAfter : result.cityHpBefore,
    monsterHp: last ? last.monsterHpAfter : result.monsterHpBefore,
    advance,
    flashing: index < rounds.length && t >= IMPACT_AT && t < FLASH_UNTIL,
    thrustFrame,
    lunge,
    waveDeathMs,
    troopDeathMs,
    monsterAttackFrames,
    focus: finalVictory ? "wave" : "town",
    zoom: cinematic ? progress(sinceEnd, ZOOM_IN) * (1 - restore) : 0,
    townDark: lost ? dark : 0,
    blackout: cinematic ? progress(sinceEnd, BLACKOUT) * (1 - restore) : 0,
    townDestroyed: lost && finaleMs >= 0,
    explosionFrame,
    explosionOpacity: clamp01((EXPLOSION.durationMs - finaleMs) / EXPLOSION_FADE_MS),
    waveDark: finalVictory ? dark : 0,
    waveGone: finalVictory && finaleMs >= HEX_SIGIL_FLARE_MS,
    sigilFrame,
    sigilOpacity: clamp01((HEX_SIGIL.durationMs - finaleMs) / EXPLOSION_FADE_MS),
    hudOpacity: cinematic ? 1 - progress(sinceEnd, [ZOOM_IN[0], ZOOM_IN[0] + 400]) : 1,
    showResult: sinceEnd >= (cinematic ? LOSS_RESULT_AT : WIN_RESULT_AT),
  };
}

/**
 * Replays a resolved battle round by round, then its outro (deaths; on a loss the town's destruction;
 * after the final wave the Demon King's sealing). `speed` scales the rounds like the day clock; the outro always plays at 1×.
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
    const cues = battleSounds(result);
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const before = elapsedRef.current.ms;
      elapsedRef.current.ms += (now - last) * (elapsedRef.current.ms < lastHitAt ? speed : 1);
      last = now;
      const ms = elapsedRef.current.ms;
      for (const cue of cues) {
        if (cue.at > before && cue.at <= ms && cue.at > ms - LATE_CUE_MS) playSound(cue.sound, cue);
      }
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

  // Load this battle's sounds before its first hit; a replay that ends (or is skipped) silences them.
  useEffect(() => {
    if (!result) return;
    preloadSounds(battleSounds(result).map((cue) => cue.sound));
    return stopSounds;
  }, [result]);

  if (!result) return null;
  return battleFrame(result, elapsed.result === result ? elapsed.ms : 0);
}
