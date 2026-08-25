"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AGENTS } from "@/components/pipeline";
import { compactNumber, dayLabel } from "@/components/library/post-meta";
import type { StatsActivityPoint } from "@/lib/dto";
import { CHART, ChartEmpty, ChartTooltip, type TooltipEntry } from "./chart-kit";

const AXIS_TICK = { fontSize: 11, fill: CHART.axis } as const;

/* -------------------------------------------------------------------------- */
/* Agent activity — tokens processed over time (area)                          */
/* -------------------------------------------------------------------------- */

export function ActivityAreaChart({ activity }: { activity: StatsActivityPoint[] }) {
  // Strip colons so the id is safe inside an SVG `url(#…)` reference.
  const gradientId = `pf-area-${useId().replace(/:/g, "")}`;
  const data = activity
    .slice(-14)
    .map((p) => ({ label: dayLabel(p.date), tokens: p.tokens }));
  const hasTokens = data.some((d) => d.tokens > 0);

  if (!hasTokens) {
    return <ChartEmpty message="No token activity yet" height={168} />;
  }

  return (
    <div role="img" aria-label="Tokens processed per day over the last 14 days">
      <ResponsiveContainer width="100%" height={168}>
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 6 }} accessibilityLayer>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.emerald} stopOpacity={0.22} />
              <stop offset="100%" stopColor={CHART.emerald} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={38}
            tickFormatter={(v: number) => compactNumber(v)}
          />
          <Tooltip
            cursor={{ stroke: CHART.emerald, strokeWidth: 1, strokeDasharray: "3 3" }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload as unknown as TooltipEntry[]}
                label={label}
                valueFormatter={(v) => `${compactNumber(v)} tokens`}
              />
            )}
          />
          <Area
            type="monotone"
            dataKey="tokens"
            name="Tokens"
            stroke={CHART.emerald}
            strokeWidth={2.4}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Run outcomes — success vs failed (donut + legend)                           */
/* -------------------------------------------------------------------------- */

export function OutcomesDonut({ done, failed }: { done: number; failed: number }) {
  const terminal = done + failed;
  if (terminal === 0) {
    return <ChartEmpty message="No completed runs yet" height={140} />;
  }
  const successPct = Math.round((done / terminal) * 100);
  const data = [
    { name: "Succeeded", value: done, color: CHART.success },
    { name: "Failed", value: failed, color: CHART.failed },
  ];

  return (
    <div className="flex items-center gap-5">
      <div
        className="relative h-[112px] w-[112px] shrink-0"
        role="img"
        aria-label={`${successPct}% success — ${done} succeeded, ${failed} failed`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={34}
              outerRadius={52}
              startAngle={90}
              endAngle={-270}
              paddingAngle={done > 0 && failed > 0 ? 2 : 0}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => (
                <ChartTooltip
                  active={active}
                  payload={payload as unknown as TooltipEntry[]}
                  valueFormatter={(v) => `${v} run${v === 1 ? "" : "s"}`}
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[19px] font-semibold leading-none text-ink">{successPct}%</span>
          <span className="mt-1 text-[10px] text-muted">success</span>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {data.map((d) => (
          <li key={d.name}>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: d.color }}
                aria-hidden
              />
              <span className="text-[13px] text-body">{d.name}</span>
            </div>
            <div className="ml-[18px] text-[18px] font-semibold tabular-nums text-ink">
              {d.value}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Runs by day — stacked volume (done + failed)                                */
/* -------------------------------------------------------------------------- */

export function VolumeBarChart({ activity }: { activity: StatsActivityPoint[] }) {
  const data = activity
    .slice(-7)
    .map((p) => ({ label: dayLabel(p.date), done: p.done, failed: p.failed }));
  const hasRuns = data.some((d) => d.done > 0 || d.failed > 0);

  if (!hasRuns) {
    return <ChartEmpty message="No runs in this window" height={150} />;
  }

  return (
    <div role="img" aria-label="Successful and failed runs per day, last 7 days">
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%" accessibilityLayer>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={24}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: CHART.cursor }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                payload={payload as unknown as TooltipEntry[]}
                label={label}
                hideZero
              />
            )}
          />
          <Bar dataKey="done" name="Succeeded" stackId="runs" fill={CHART.success} maxBarSize={26} />
          <Bar
            dataKey="failed"
            name="Failed"
            stackId="runs"
            fill={CHART.failed}
            maxBarSize={26}
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tokens by agent — categorical horizontal bars (plain HTML meters)           */
/* -------------------------------------------------------------------------- */

export function TokensByAgentChart({ tokensByAgent }: { tokensByAgent: Record<string, number> }) {
  const rows = AGENTS.map((a) => ({
    label: a.label,
    color: a.color,
    tokens: Math.max(0, tokensByAgent[a.id] ?? 0),
  }));
  const max = Math.max(...rows.map((r) => r.tokens), 1);
  const hasTokens = rows.some((r) => r.tokens > 0);

  if (!hasTokens) {
    return <ChartEmpty message="No token usage recorded yet" height={150} />;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-[12.5px] text-secondary">{r.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(r.tokens / max) * 100}%`, background: r.color }}
            />
          </div>
          <span className="w-11 shrink-0 text-right font-mono text-[11.5px] tabular-nums text-muted">
            {compactNumber(r.tokens)}
          </span>
        </li>
      ))}
    </ul>
  );
}
