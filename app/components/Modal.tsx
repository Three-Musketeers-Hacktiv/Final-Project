import type { ReactNode } from "react";
import Panel from "./Panel";

type ModalProps = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  accent?: boolean;
  /** Clicking outside, Esc or × closes it. Turn off for screens the player must answer. */
  dismissible?: boolean;
  /** Adds a Hide button: the screen goes away for a look at the game, but stays unanswered. */
  onHide?: () => void;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

const SIZE_CLASS = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

/**
 * Dialog built on the native popover API, so it opens and closes without client JavaScript.
 * Open it with a button that has `popoverTarget={id}`.
 */
export default function Modal({
  id,
  title,
  subtitle,
  icon,
  accent = false,
  dismissible = true,
  onHide,
  size = "md",
  children,
}: ModalProps) {
  return (
    <div
      id={id}
      popover={dismissible ? "auto" : "manual"}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto border-0 bg-transparent p-0 text-parchment backdrop:bg-black/65 ${SIZE_CLASS[size]}`}
    >
      <Panel
        title={title}
        subtitle={subtitle}
        icon={icon}
        accent={accent}
        aside={
          onHide ? (
            <button
              type="button"
              onClick={onHide}
              className="rounded-sm border border-frame/60 px-2 py-0.5 text-sm text-muted hover:border-gold hover:text-parchment"
            >
              Hide
            </button>
          ) : (
            dismissible && (
              <button
                type="button"
                popoverTarget={id}
                popoverTargetAction="hide"
                aria-label="Close"
                className="px-1 text-2xl leading-none text-muted hover:text-parchment"
              >
                ×
              </button>
            )
          )
        }
      >
        {children}
      </Panel>
    </div>
  );
}
