import type { CSSProperties } from "react";
import type { SpriteSheet } from "./spriteSheet";

type SheetFrameProps = {
  sheet: SpriteSheet;
  frame: number;
  /** Width of the drawn frame (any CSS length); its height follows the frame's shape. */
  width: string;
  /** Mirror it horizontally around its pivot, e.g. for a strike that comes from the right. */
  flip?: boolean;
  opacity?: number;
  /** Scale pixels up as crisp blocks instead of smoothing them (for pixel art drawn larger than its frames). */
  pixelated?: boolean;
  /** Positioning of the anchor point (left/right/bottom/z-index…); the frame's pivot lands on it. */
  className?: string;
  style?: CSSProperties;
};

/**
 * One frame of a sprite sheet, absolutely positioned with its pivot (the effect's ground point from the
 * pixelfx JSON) on the anchor point given by `className`/`style` (its left edge and bottom).
 */
export default function SheetFrame({
  sheet,
  frame,
  width,
  flip = false,
  opacity,
  pixelated = false,
  className = "",
  style,
}: SheetFrameProps) {
  const { x, y, w, h } = sheet.frames[frame];
  const [pivotX, pivotY] = sheet.pivot;
  const columns = sheet.image.width / w;
  const rows = sheet.image.height / h;
  const pivot = { x: (pivotX / w) * 100, y: (pivotY / h) * 100 };
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      style={{
        width,
        aspectRatio: `${w} / ${h}`,
        opacity,
        imageRendering: pixelated ? "pixelated" : undefined,
        // Moves the pivot onto the anchor (left edge, bottom), then mirrors around it if asked.
        transformOrigin: `${pivot.x}% ${pivot.y}%`,
        transform: `translate(${-pivot.x}%, ${100 - pivot.y}%)${flip ? " scaleX(-1)" : ""}`,
        backgroundImage: `url(${sheet.image.src})`,
        backgroundSize: `${columns * 100}% ${rows * 100}%`,
        backgroundPosition: `${columns > 1 ? (x / w / (columns - 1)) * 100 : 0}% ${rows > 1 ? (y / h / (rows - 1)) * 100 : 0}%`,
        ...style,
      }}
    />
  );
}
