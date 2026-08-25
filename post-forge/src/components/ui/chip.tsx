import type { ReactNode } from "react";
import { cn } from "./cn";

export interface ChipProps {
  children: ReactNode;
  icon?: ReactNode;
  /** Monospace label (e.g. search queries, model names). */
  mono?: boolean;
  /** Clickable variant (suggestion chips) — renders a <button>. */
  onClick?: () => void;
  className?: string;
  title?: string;
}

/**
 * Small bordered pill used for suggested topics, search queries, tags.
 * Interactive when `onClick` is provided (emerald hover, à la the New Post
 * suggestion chips); otherwise a static token chip.
 */
export function Chip({ children, icon, mono, onClick, className, title }: ChipProps) {
  const shared = cn(
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-[13px] py-1.5 text-[13px] text-body",
    mono && "font-mono text-[12.5px]",
    onClick && "cursor-pointer transition-colors hover:border-primary-200 hover:bg-primary-50/60",
    className,
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title} className={shared}>
        {icon}
        {children}
      </button>
    );
  }
  return (
    <span title={title} className={shared}>
      {icon}
      {children}
    </span>
  );
}
