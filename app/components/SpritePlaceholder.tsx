type SpritePlaceholderProps = {
  label: string;
  className?: string;
};

/** Dashed box marking where a sprite or icon will go. */
export default function SpritePlaceholder({ label, className = "size-8" }: SpritePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-sm border border-dashed border-muted/50 bg-track/40 p-0.5 text-center text-[10px] leading-tight text-muted ${className}`}
    >
      {label}
    </div>
  );
}
