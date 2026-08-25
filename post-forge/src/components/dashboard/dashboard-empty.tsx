import { EmptyState, SparkLogo } from "@/components/ui";
import { StartPostHero } from "./start-post-hero";

/**
 * First-run dashboard — shown when no posts exist yet. Keeps the prominent
 * start-a-post entry, then explains that analytics fill in once agents run.
 */
export function DashboardEmpty() {
  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-6">
        <h1 className="text-[27px] font-semibold tracking-[-0.025em] text-ink">
          Welcome to PostForge
        </h1>
        <p className="mt-1.5 text-[15px] text-secondary">
          Give your agents a topic and they’ll research, verify, write and illustrate a post.
        </p>
      </div>

      <StartPostHero />

      <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface">
        <EmptyState
          icon={<SparkLogo size={26} />}
          title="No posts yet"
          description="Start your first post above. Once your agents finish a run, your stats, charts and recent posts will appear here."
        />
      </div>
    </div>
  );
}
