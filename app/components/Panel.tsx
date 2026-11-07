import type { ReactNode } from "react";

type PanelProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  aside?: ReactNode;
  accent?: boolean;
  className?: string;
  children: ReactNode;
};

/** Framed box shared by every section of the game screen. */
export default function Panel({
  title,
  subtitle,
  icon,
  aside,
  accent = false,
  className = "",
  children,
}: PanelProps) {
  return (
    <section
      className={`flex flex-col rounded-sm border-2 border-frame bg-panel shadow-[inset_0_0_0_2px_rgb(0_0_0/0.35)] ${className}`}
    >
      <header
        className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-frame px-4 py-2 ${accent ? "bg-crimson" : "bg-panel-head"}`}
      >
        {icon}
        <h2 className="text-xl font-semibold text-parchment">{title}</h2>
        {subtitle && <span className="text-sm text-muted">{subtitle}</span>}
        {aside && <div className="ml-auto">{aside}</div>}
      </header>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}
