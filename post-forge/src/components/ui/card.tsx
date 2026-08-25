import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Apply default 24px inner padding. */
  padded?: boolean;
  /** Add hover elevation + pointer for clickable cards. */
  interactive?: boolean;
  /** Elevation. Default "xs". */
  elevation?: "none" | "xs" | "sm" | "md" | "lg";
}

const elevations = {
  none: "",
  xs: "shadow-xs",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
} as const;

export function Card({
  padded = false,
  interactive = false,
  elevation = "xs",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface",
        elevations[elevation],
        padded && "p-6",
        interactive &&
          "cursor-pointer transition-[box-shadow,border-color] duration-200 hover:border-[#c2c8c5] hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex items-start justify-between gap-4", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h3 className={cn("text-[14.5px] font-semibold text-ink", className)}>{children}</h3>;
}

export function CardDescription({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("mt-0.5 text-[12.5px] text-muted", className)}>{children}</p>;
}
