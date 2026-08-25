"use client";

import { useEffect, useState } from "react";
import { Button, CalendarIcon } from "@/components/ui";
import { ErrorState } from "@/components/shell";
import { compactNumber } from "@/components/library/post-meta";
import type { PostListResponse, PostSummary, StatsResponse } from "@/lib/dto";
import { StartPostHero } from "./start-post-hero";
import { StatTiles } from "./stat-tiles";
import { RecentPosts } from "./recent-posts";
import { ChartCard, ChartBadge } from "./chart-kit";
import {
  ActivityAreaChart,
  OutcomesDonut,
  VolumeBarChart,
  TokensByAgentChart,
} from "./analytics-charts";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DashboardEmpty } from "./dashboard-empty";

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface DashboardData {
  stats: StatsResponse;
  recent: PostSummary[];
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    Promise.all([
      fetch("/api/stats", { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`stats ${r.status}`);
        return r.json() as Promise<StatsResponse>;
      }),
      fetch("/api/posts?page=1&pageSize=5", { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`posts ${r.status}`);
        return r.json() as Promise<PostListResponse>;
      }),
    ])
      .then(([stats, list]) => {
        setData({ stats, recent: list.items });
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1180px]">
        <div className="rounded-2xl border border-border bg-surface">
          <ErrorState
            title="Couldn’t load your dashboard"
            description="We couldn’t reach the analytics service. Please try again."
            action={<Button onClick={() => setReloadKey((k) => k + 1)}>Try again</Button>}
          />
        </div>
      </div>
    );
  }

  const { stats, recent } = data;

  if (stats.totals.total === 0) {
    return <DashboardEmpty />;
  }

  const greeting = now ? greetingFor(now.getHours()) : "Welcome back";
  const dateLabel = now
    ? now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
    : "";

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[27px] font-semibold tracking-[-0.025em] text-ink">{greeting}</h1>
          <p className="mt-1.5 text-[15px] text-secondary">
            Here’s what your agents have been up to.
          </p>
        </div>
        {dateLabel ? (
          <div className="hidden h-9 items-center gap-2 rounded-[10px] border border-border bg-surface px-3 text-[13px] text-secondary sm:flex">
            <CalendarIcon size={15} className="text-muted" />
            {dateLabel}
          </div>
        ) : null}
      </div>

      <StartPostHero />

      <div className="mt-3.5">
        <StatTiles stats={stats} />
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[1.7fr_1fr]">
        <ChartCard
          title="Agent activity"
          subtitle="Tokens processed · last 14 days"
          badge={<ChartBadge>{compactNumber(stats.totalTokens)} total</ChartBadge>}
        >
          <ActivityAreaChart activity={stats.activity} />
        </ChartCard>
        <ChartCard title="Run outcomes" subtitle="Success vs. failed">
          <OutcomesDonut done={stats.totals.done} failed={stats.totals.failed} />
        </ChartCard>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <ChartCard title="Runs by day" subtitle="Volume · last 7 days">
          <VolumeBarChart activity={stats.activity} />
        </ChartCard>
        <ChartCard title="Tokens by agent" subtitle="Total usage per pipeline stage">
          <TokensByAgentChart tokensByAgent={stats.tokensByAgent} />
        </ChartCard>
      </div>

      <div className="mt-3.5">
        <RecentPosts posts={recent} />
      </div>
    </div>
  );
}
