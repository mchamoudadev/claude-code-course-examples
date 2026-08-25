import type { ReactNode } from "react";
import { cn } from "./cn";
import { CheckIcon, ShieldCheckIcon } from "./icons";

export type BadgeTone = "neutral" | "success" | "info" | "warning" | "error" | "primary";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  /** Small colored leading dot. */
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}

const tones: Record<BadgeTone, string> = {
  neutral: "text-secondary bg-divider",
  success: "text-success-fg bg-success-tint",
  info: "text-info-fg bg-info-tint",
  warning: "text-warning-fg bg-warning-tint",
  error: "text-error-fg bg-error-tint",
  primary: "text-primary-700 bg-primary-50",
};

const dotColor: Record<BadgeTone, string> = {
  neutral: "bg-muted",
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  error: "bg-error",
  primary: "bg-primary",
};

/**
 * Status pill. Maps a semantic tone to its tint + foreground.
 * Maps to the design's status badges: Published(success), Generating(info),
 * Queued(warning), Failed(error).
 */
export function Badge({ tone = "neutral", children, dot, icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-[11px] py-1 text-[11.5px] font-semibold leading-none",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[tone])} /> : null}
      {icon}
      {children}
    </span>
  );
}

/** "Verified" / "Fact-checked" chip — softer mint with a hairline border. */
export function VerifiedBadge({
  children = "Verified",
  icon = "check",
  className,
}: {
  children?: ReactNode;
  icon?: "check" | "shield";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-verified-border bg-verified-tint px-2.5 py-[3px] text-[11.5px] font-semibold text-verified-fg",
        className,
      )}
    >
      {icon === "shield" ? <ShieldCheckIcon size={12} strokeWidth={2.4} /> : <CheckIcon size={11} />}
      {children}
    </span>
  );
}
