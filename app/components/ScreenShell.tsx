import Image from "next/image";
import type { ReactNode } from "react";
import mainLogo from "./assets/logo/main_logo.png";
import ThemeToggle from "./ThemeToggle";

/** Centered single-card layout for the menu, login and register screens. */
export default function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <div className="absolute top-4 right-4 overflow-hidden rounded-sm border-2 border-frame">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        {/* The logo carries the game's name, so it is the page heading. */}
        <h1>
          <Image src={mainLogo} alt="Bastionfall" preload sizes="(min-width: 640px) 28rem, 90vw" className="h-auto w-[90vw] max-w-md" />
        </h1>
        <p className="text-muted">Hold the walls. Survive the siege.</p>
      </div>

      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
