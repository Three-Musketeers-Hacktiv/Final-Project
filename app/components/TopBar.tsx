import Image from "next/image";
import titleLogo from "./assets/logo/title_logo.png";
import ControlButton from "./ControlButton";
import MusicToggle from "./MusicToggle";
import ThemeToggle from "./ThemeToggle";
import { SPEEDS, type Speed } from "./useDayTimer";

type TopBarProps = {
  day: number;
  lastDay: number;
  /** null once no wave is left. */
  daysUntilInvasion: number | null;
  paused: boolean;
  speed: Speed;
  /** How far through today the auto-progress clock is, 0 to 1. */
  dayProgress: number;
  /** False while the clock waits for the player (an event, a battle, a reward) or a request. */
  clockRunning: boolean;
  onTogglePause: () => void;
  onSpeedChange: (speed: Speed) => void;
  onOpenSettings: () => void;
};

export default function TopBar({
  day,
  lastDay,
  daysUntilInvasion,
  paused,
  speed,
  dayProgress,
  clockRunning,
  onTogglePause,
  onSpeedChange,
  onOpenSettings,
}: TopBarProps) {
  const progress = Math.min(100, (day / lastDay) * 100);

  return (
    // Sticky so the day, clock and speed controls stay in view while scrolling; needs its own background.
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-8 gap-y-3 border-b-2 border-frame/60 bg-ink px-4 py-3">
      <h1>
        <Image src={titleLogo} alt="Bastionfall" preload sizes="12rem" className="h-auto w-48" />
      </h1>

      <div className="w-full max-w-xl sm:w-auto sm:min-w-80 sm:flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6">
          <p className="text-2xl text-parchment">
            DAY <span className="text-3xl font-bold">{String(day).padStart(2, "0")}</span>
            <span className="text-muted"> / {lastDay}</span>
          </p>
          {daysUntilInvasion !== null && (
            <p className={daysUntilInvasion === 0 ? "font-semibold text-crimson day:text-red-700" : "text-muted"}>
              {daysUntilInvasion === 0
                ? "Invasion today!"
                : `Next invasion in ${daysUntilInvasion} ${daysUntilInvasion === 1 ? "day" : "days"}`}
            </p>
          )}
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-track">
          <div className="h-full bg-crimson" style={{ width: `${progress}%` }} />
        </div>
        {/* Time left today before the day ends on its own. */}
        <div
          role="progressbar"
          aria-label="Time left today"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(dayProgress * 100)}
          className="mt-1 h-1 overflow-hidden rounded-full bg-track"
        >
          <div
            className={`h-full transition-[width] duration-100 ease-linear ${clockRunning ? "bg-gold" : "bg-muted/60"}`}
            style={{ width: `${dayProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Full width below lg so the toggle group can sit at the right edge, even when it wraps. */}
      <div className="flex w-full flex-wrap items-center gap-2 lg:ml-auto lg:w-auto">
        <div className="overflow-hidden rounded-sm border-2 border-frame">
          <ControlButton active={paused} label={paused ? "Resume the game" : "Pause the game"} onClick={onTogglePause}>
            {paused ? "▶ Play" : "❚❚ Pause"}
          </ControlButton>
        </div>
        <div className="flex divide-x-2 divide-frame overflow-hidden rounded-sm border-2 border-frame">
          {SPEEDS.map((option) => (
            <ControlButton
              key={option}
              active={option === speed}
              label={`Speed ${option}×`}
              onClick={() => onSpeedChange(option)}
            >
              {option}×
            </ControlButton>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <div className="overflow-hidden rounded-sm border-2 border-frame">
            <ThemeToggle />
          </div>
          <div className="overflow-hidden rounded-sm border-2 border-frame">
            <MusicToggle />
          </div>
          <div className="overflow-hidden rounded-sm border-2 border-frame">
            <ControlButton>SFX</ControlButton>
          </div>
          <div className="overflow-hidden rounded-sm border-2 border-frame">
            <ControlButton label="Settings" onClick={onOpenSettings}>
              ⚙
            </ControlButton>
          </div>
        </div>
      </div>
    </header>
  );
}
