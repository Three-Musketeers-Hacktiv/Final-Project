import type { StaticImageData } from "next/image";

/** The parts of a pixelfx.io sprite sheet JSON export the battle scene reads. */
type SheetData = {
  frames: { frame: { x: number; y: number; w: number; h: number }; duration: number }[];
  meta: { pixelfx: { pivot: number[] } };
};

export type SpriteSheet = ReturnType<typeof spriteSheet>;

/**
 * A sprite sheet animation: frame rectangles and per-frame durations come from its JSON, so a
 * re-export with other timings or layout works without code changes.
 */
export function spriteSheet(image: StaticImageData, data: SheetData) {
  const frames = data.frames.map((frame) => ({ ...frame.frame, duration: frame.duration }));
  const starts = frames.map((_, i) => frames.slice(0, i).reduce((sum, f) => sum + f.duration, 0));
  const durationMs = starts[starts.length - 1] + frames[frames.length - 1].duration;

  return {
    image,
    frames,
    /** Length of the whole animation, in ms at 1×. */
    durationMs,
    /** Point in a frame that sits on the ground at the effect's origin: [x, y] in sheet pixels. */
    pivot: [data.meta.pixelfx.pivot[0], data.meta.pixelfx.pivot[1]] as const,
    /** Index of the frame showing `ms` into the animation, or null outside it. */
    frameAt(ms: number): number | null {
      if (ms < 0 || ms >= durationMs) return null;
      let index = 0;
      while (index + 1 < starts.length && starts[index + 1] <= ms) index++;
      return index;
    },
  };
}
