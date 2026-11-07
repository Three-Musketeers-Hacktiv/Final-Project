import ControlButton from "./ControlButton";
import SpritePlaceholder from "./SpritePlaceholder";
import ThemeToggle from "./ThemeToggle";

type TopBarProps = {
  day: number;
  lastDay: number;
  daysUntilInvasion: number;
};

const SPEEDS = ["1×", "2×", "4×", "8×", "16×"];

export default function TopBar({ day, lastDay, daysUntilInvasion }: TopBarProps) {
  const progress = Math.min(100, (day / lastDay) * 100);

  return (
    <header className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b-2 border-frame/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <SpritePlaceholder label="Logo" className="size-11" />
        <h1 className="text-3xl font-bold tracking-wide text-parchment">100 NIGHTS</h1>
      </div>

      <div className="w-full max-w-xl sm:w-auto sm:min-w-80 sm:flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6">
          <p className="text-2xl text-parchment">
            DAY <span className="text-3xl font-bold">{String(day).padStart(2, "0")}</span>
            <span className="text-muted"> / {lastDay}</span>
          </p>
          <p className="text-muted">Next invasion in {daysUntilInvasion} days</p>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-track">
          <div className="h-full bg-crimson" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
        <div className="overflow-hidden rounded-sm border-2 border-frame">
          <ControlButton>❚❚ Pause</ControlButton>
        </div>
        <div className="flex divide-x-2 divide-frame overflow-hidden rounded-sm border-2 border-frame">
          {SPEEDS.map((speed, i) => (
            <ControlButton key={speed} active={i === 0}>
              {speed}
            </ControlButton>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="overflow-hidden rounded-sm border-2 border-frame">
            <ThemeToggle />
          </div>
          {["Music", "SFX", "⚙"].map((label) => (
            <div key={label} className="overflow-hidden rounded-sm border-2 border-frame">
              <ControlButton>{label}</ControlButton>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
