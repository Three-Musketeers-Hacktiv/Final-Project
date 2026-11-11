import Link from "next/link";
import type { ReactNode } from "react";

const VARIANT_CLASS = {
  primary: "border-gold bg-gold/85 font-bold text-zinc-900 hover:bg-gold",
  secondary: "border-gold/60 bg-panel-head text-parchment hover:border-gold hover:bg-track",
  danger: "border-crimson bg-crimson font-semibold text-white hover:brightness-110",
};

type GameButtonProps = {
  variant?: keyof typeof VARIANT_CLASS;
  /** Renders a link instead of a button. */
  href?: string;
  type?: "button" | "submit";
  /** Opens (or with `popoverTargetAction="hide"`, closes) the dialog with this id. */
  popoverTarget?: string;
  popoverTargetAction?: "show" | "hide" | "toggle";
  /** Only usable from client components. */
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

/** Large framed button for menus, forms and dialogs. */
export default function GameButton({
  variant = "secondary",
  href,
  type = "button",
  popoverTarget,
  popoverTargetAction,
  onClick,
  disabled,
  className = "",
  children,
}: GameButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-sm border-2 px-4 py-2 text-lg leading-tight transition-colors disabled:cursor-wait disabled:opacity-60 ${VARIANT_CLASS[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      data-sfx="button"
      popoverTarget={popoverTarget}
      popoverTargetAction={popoverTargetAction}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
}
