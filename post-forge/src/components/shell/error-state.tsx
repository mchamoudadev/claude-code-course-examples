import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { AlertTriangleIcon } from "@/components/ui/icons";

export interface ErrorStateProps {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Recovery affordances (e.g. a "Try again" button + a link home). */
  action?: ReactNode;
  className?: string;
}

/**
 * Centered error / failure block — the error-toned sibling of EmptyState.
 * Reused by the route error boundaries and consumable by data screens (T10–T15).
 */
export function ErrorState({
  icon,
  title = "Something went wrong",
  description,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center px-5 py-16 text-center", className)}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-error-tint text-error-fg">
        {icon ?? <AlertTriangleIcon size={26} />}
      </div>
      <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-[420px] text-sm leading-relaxed text-secondary">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">{action}</div>
      ) : null}
    </div>
  );
}
