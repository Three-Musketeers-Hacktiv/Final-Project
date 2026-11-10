"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import GameButton from "./GameButton";
import { TUTORIAL_STEPS } from "./tutorialSteps";

type Rect = { top: number; left: number; width: number; height: number };

// Room around the highlighted element, and between it (or the screen edge) and the card.
const PAD = 8;
const GAP = 12;

function findTarget(id: string | undefined) {
  return id ? document.querySelector<HTMLElement>(`[data-tutorial="${id}"]`) : null;
}

type TutorialProps = {
  /** This Wave is on screen; after the last wave it isn't, and its step is left out. */
  hasWave: boolean;
  /** Finished or skipped; the tutorial is closed either way. */
  onClose: () => void;
};

/**
 * A guided tour over the game screen: a spotlight on one `data-tutorial` element at a time and a card
 * that explains it. Everything else is dimmed and can't be clicked until the tour is closed.
 */
export default function Tutorial({ hasWave, onClose }: TutorialProps) {
  const steps = hasWave ? TUTORIAL_STEPS : TUTORIAL_STEPS.filter((step) => step.target !== "this-wave");
  const [index, setIndex] = useState(0);
  const [skipping, setSkipping] = useState(false);
  // The spotlight's place, tagged with the element it was measured for so a stale one is ignored.
  const [spot, setSpot] = useState<{ target: string; rect: Rect } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[index];
  const last = index === steps.length - 1;
  const targetId = skipping ? undefined : step.target;
  const rect = spot && spot.target === targetId ? spot.rect : null;
  const hole = rect ?? { top: 0, left: 0, width: 0, height: 0 };

  // Bring the step's element into view, then follow it as the page scrolls or the layout changes.
  useEffect(() => {
    const target = findTarget(targetId);
    if (!targetId || !target) return;
    // Scroll it up to just below the sticky top bar, leaving the room under it for the card. Parts of
    // the top bar itself are always on screen.
    const topBar = document.querySelector("header");
    if (!topBar?.contains(target)) {
      const below = (topBar?.getBoundingClientRect().bottom ?? 0) + PAD + GAP;
      window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - below, behavior: "smooth" });
    }
    const measure = () => {
      const r = target.getBoundingClientRect();
      setSpot({
        target: targetId,
        rect: { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 },
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
    };
  }, [targetId]);

  // The card goes below the spotlight, or above it when there's no room, or over its bottom edge
  // when neither fits (a tall element on a small screen). With nothing highlighted it's centered.
  // Set on the element directly: it depends on the card's own rendered height.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (!rect) {
      card.style.top = "50%";
      card.style.translate = "-50% -50%";
      return;
    }
    const height = card.offsetHeight;
    const below = rect.top + rect.height + GAP;
    const above = rect.top - GAP - height;
    const top =
      below + height <= window.innerHeight - GAP
        ? below
        : above >= GAP
          ? above
          : Math.max(GAP, window.innerHeight - GAP - height);
    card.style.top = `${top}px`;
    card.style.translate = "-50% 0";
  }, [rect, index, skipping]);

  // Esc asks to skip, like the Skip link.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSkipping(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="tutorial-title" className="fixed inset-0 z-[60]">
      {/*
        Spotlight: four dim panels around a clear hole, plus a gold frame. (A huge box-shadow would be
        simpler, but Chrome doesn't always paint one that large.) With nothing to point at, the bottom
        panel covers the whole screen.
      */}
      {[
        { top: 0, left: 0, right: 0, height: Math.max(0, hole.top) },
        { top: hole.top + hole.height, left: 0, right: 0, bottom: 0 },
        { top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height },
        { top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height },
      ].map((style, i) => (
        <div key={i} aria-hidden className="fixed bg-black/70 transition-all duration-300" style={style} />
      ))}
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-sm border-2 border-gold transition-all duration-300"
          style={rect}
        />
      )}

      <div
        ref={cardRef}
        className="fixed left-1/2 w-[calc(100%-2rem)] max-h-[calc(100dvh-1.5rem)] max-w-md overflow-y-auto rounded-sm border-2 border-gold bg-panel p-4 text-parchment shadow-lg transition-[top] duration-300"
      >
        {skipping ? (
          <>
            <h2 id="tutorial-title" className="text-xl font-bold text-gold">
              Tutorial skipped
            </h2>
            <p className="mt-2">You can replay the tutorial anytime from Settings (⚙) → Tutorial.</p>
            <div className="mt-4 flex justify-end">
              <GameButton variant="primary" onClick={onClose}>
                Got it
              </GameButton>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="tutorial-title" className="text-xl font-bold text-gold">
                {step.title}
              </h2>
              <span className="text-sm text-muted">
                {index + 1} / {steps.length}
              </span>
            </div>
            {step.body.map((paragraph) => (
              <p key={paragraph} className="mt-2">
                {paragraph}
              </p>
            ))}
            <div className="mt-4 flex items-center gap-3">
              {!last && (
                <button
                  type="button"
                  onClick={() => setSkipping(true)}
                  className="mr-auto text-sm text-muted underline hover:text-parchment"
                >
                  Skip tutorial
                </button>
              )}
              <div className="ml-auto flex gap-2">
                {index > 0 && <GameButton onClick={() => setIndex(index - 1)}>Back</GameButton>}
                <GameButton variant="primary" onClick={last ? onClose : () => setIndex(index + 1)}>
                  {last ? "Finish" : "Next"}
                </GameButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
