import type { CSSProperties } from "react";
import { cn } from "./cn";

export interface SpinnerProps {
  /** Diameter in px. Default 16. */
  size?: number;
  /** Active arc color. Default emerald primary. */
  color?: string;
  /** Track (remaining ring) color. */
  trackColor?: string;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

/** Indeterminate ring spinner. Honors reduced-motion via the global rule. */
export function Spinner({
  size = 16,
  color = "var(--color-primary-600)",
  trackColor = "#e4e7e6",
  className,
  style,
  label = "Loading",
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-block rounded-full animate-spin-fast align-[-0.15em]", className)}
      style={{
        width: size,
        height: size,
        borderStyle: "solid",
        borderWidth: Math.max(2, Math.round(size / 8)),
        borderColor: trackColor,
        borderTopColor: color,
        ...style,
      }}
    />
  );
}
