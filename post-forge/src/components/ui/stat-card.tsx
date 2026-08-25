import type { ReactNode } from "react";
import { cn } from "./cn";

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Trailing delta / sub-value (e.g. "↑ 12%", "123 / 128"). */
  delta?: ReactNode;
  deltaTone?: "positive" | "negative" | "neutral";
  className?: string;
}

const deltaTones = {
  positive: "text-primary-600 font-semibold",
  negative: "text-error-fg font-semibold",
  neutral: "text-muted",
} as const;

/** Dashboard KPI tile (posts generated, success rate, avg time…). */
export function StatCard({ label, value, delta, deltaTone = "neutral", className }: StatCardProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-[18px]", className)}>
      <div className="text-[12.5px] text-muted">{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
          {value}
        </span>
        {delta ? (
          <span className={cn("mb-0.5 text-xs", deltaTones[deltaTone])}>{delta}</span>
        ) : null}
      </div>
    </div>
  );
}
