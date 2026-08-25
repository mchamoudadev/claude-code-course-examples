import type { CSSProperties } from "react";
import { cn } from "./cn";

export interface SkeletonProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  /** Animated shimmer (default) vs. a flat placeholder. */
  shimmer?: boolean;
  style?: CSSProperties;
}

/** Shimmer placeholder. Shimmer collapses to a flat block under reduced-motion. */
export function Skeleton({
  className,
  width,
  height = 14,
  radius = 8,
  shimmer = true,
  style,
}: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(shimmer ? "pf-skeleton" : "bg-border-subtle", className)}
      style={{
        width,
        height,
        borderRadius: radius,
        ...(shimmer
          ? {
              background:
                "linear-gradient(90deg,#eef1f0,#e4e8e6,#eef1f0)",
              backgroundSize: "600px 100%",
              animation: "pf-shimmer 1.3s linear infinite",
            }
          : {}),
        ...style,
      }}
    />
  );
}

/** Multi-line text skeleton; last line is shortened. */
export function SkeletonText({
  lines = 3,
  className,
  gap = 11,
}: {
  lines?: number;
  className?: string;
  gap?: number;
}) {
  return (
    <div className={cn("flex flex-col", className)} style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          radius={6}
          shimmer={false}
          width={i === lines - 1 ? "82%" : "100%"}
        />
      ))}
    </div>
  );
}
