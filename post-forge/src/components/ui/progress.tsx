import { cn } from "./cn";

export interface ProgressBarProps {
  /** 0–100. */
  value: number;
  /** Track height in px. Default 6. */
  height?: number;
  /** Bar fill — a solid color or a CSS gradient. Default emerald. */
  color?: string;
  className?: string;
  label?: string;
}

/** Determinate progress bar (poster render, quota usage, stage progress). */
export function ProgressBar({
  value,
  height = 6,
  color = "linear-gradient(90deg,#059669,#10b981)",
  className,
  label,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("w-full overflow-hidden rounded-full bg-divider", className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
