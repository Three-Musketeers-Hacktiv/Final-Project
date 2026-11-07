import type { ReactNode } from "react";

type ControlButtonProps = {
  active?: boolean;
  label?: string;
  onClick?: () => void;
  children: ReactNode;
};

/** Small framed button used in the top bar controls. */
export default function ControlButton({ active = false, label, onClick, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`h-9 border-frame px-3 text-sm transition-colors ${
        active ? "bg-gold/80 font-bold text-zinc-900" : "bg-panel text-parchment hover:bg-panel-head"
      }`}
    >
      {children}
    </button>
  );
}
