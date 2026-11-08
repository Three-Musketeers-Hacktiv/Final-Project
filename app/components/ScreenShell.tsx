import type { ReactNode } from "react";
import SpritePlaceholder from "./SpritePlaceholder";
import ThemeToggle from "./ThemeToggle";

/** Centered single-card layout for the menu, login and register screens. */
export default function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <div className="absolute top-4 right-4 overflow-hidden rounded-sm border-2 border-frame">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <SpritePlaceholder label="Logo" className="size-20" />
        <h1 className="text-4xl font-bold tracking-wide sm:text-5xl">100 NIGHTS</h1>
        <p className="text-muted">Hold the walls. Survive the siege.</p>
      </div>

      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
