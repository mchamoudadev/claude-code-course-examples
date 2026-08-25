import type { ReactNode } from "react";
import { cn } from "./cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Centered empty / zero-data block (first-run, no schedules, no results). */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-5 py-16 text-center", className)}>
      {icon ? (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-sunken text-muted">
          {icon}
        </div>
      ) : null}
      <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-[400px] text-sm leading-relaxed text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex items-center gap-2.5">{action}</div> : null}
    </div>
  );
}
