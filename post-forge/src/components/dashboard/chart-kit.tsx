import type { ReactNode } from "react";
import { cn } from "@/components/ui";

/**
 * Shared chart tokens + primitives for the Dashboard analytics. Colors are pulled
 * from the PostForge palette (globals.css) so every chart reads as one system.
 * The categorical agent palette is validated by the dataviz skill's checker.
 */
export const CHART = {
  /** Recessive cartesian grid. */
  grid: "#eef1f0",
  /** Axis tick text. */
  axis: "#a2a9a5",
  /** Primary time-series hue (emerald / "verify" green). */
  emerald: "#059669",
  emeraldSoft: "#34d399",
  /** Reserved status hues (good / bad) — never reused as a categorical series. */
  success: "#059669",
  failed: "#f43f5e",
  cursor: "rgba(11,18,16,0.04)",
} as const;

/** Card wrapper for a single chart: title + subtitle + optional trailing badge. */
export function ChartCard({
  title,
  subtitle,
  badge,
  children,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14.5px] font-semibold text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p> : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Small emerald pill used in a chart header (e.g. a running total). */
export function ChartBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[12px] font-semibold text-primary-700">
      {children}
    </span>
  );
}

/** Centered fallback for a chart with no plottable data (resilience path). */
export function ChartEmpty({
  message = "Not enough data yet",
  height = 150,
}: {
  message?: string;
  height?: number;
}) {
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-surface-sunken/50 text-[13px] text-muted"
      style={{ height }}
    >
      {message}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tooltip                                                                     */
/* -------------------------------------------------------------------------- */

export interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  fill?: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
  /** Hide entries whose value is 0 (keeps stacked tooltips tidy). */
  hideZero?: boolean;
}

/** Themed Recharts tooltip content. Pass via `content={(p) => <ChartTooltip … />}`. */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
  hideZero,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const rows = hideZero ? payload.filter((e) => Number(e.value) !== 0) : payload;
  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-md">
      {label != null && label !== "" ? (
        <div className="mb-1.5 text-[11px] font-medium text-muted">
          {labelFormatter ? labelFormatter(String(label)) : label}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        {rows.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            <span
              className="h-2 w-2 shrink-0 rounded-[3px]"
              style={{ background: entry.color ?? entry.fill ?? CHART.axis }}
            />
            <span className="text-secondary">{entry.name}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums text-ink">
              {valueFormatter ? valueFormatter(Number(entry.value)) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
