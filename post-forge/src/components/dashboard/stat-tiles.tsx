import { StatCard } from "@/components/ui";
import { compactNumber, formatDuration } from "@/components/library/post-meta";
import type { StatsResponse } from "@/lib/dto";

/** The four headline KPI tiles across the top of the dashboard. */
export function StatTiles({ stats }: { stats: StatsResponse }) {
  const { totals, successRate, avgGenerationMs, totalTokens } = stats;
  const terminal = totals.done + totals.failed;
  const successLabel = terminal > 0 ? `${Math.round(successRate * 100)}%` : "—";

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <StatCard
        label="Posts generated"
        value={totals.total}
        delta={totals.inProgress > 0 ? `${totals.inProgress} active` : `${totals.done} done`}
        deltaTone={totals.inProgress > 0 ? "neutral" : "positive"}
      />
      <StatCard
        label="Success rate"
        value={successLabel}
        delta={terminal > 0 ? `${totals.done} / ${terminal}` : "no runs yet"}
      />
      <StatCard
        label="Avg. generation time"
        value={avgGenerationMs > 0 ? formatDuration(avgGenerationMs) : "—"}
        delta="per post"
      />
      <StatCard
        label="Tokens processed"
        value={compactNumber(totalTokens)}
        delta="all runs"
      />
    </div>
  );
}
