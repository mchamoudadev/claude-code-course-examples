"use client";

import Link from "next/link";
import { ErrorState } from "@/components/shell";
import { Skeleton } from "@/components/ui";
import { usePostPolling } from "@/hooks/usePostPolling";
import { isTerminal } from "./helpers";
import { useNow } from "./use-now";
import { PipelineHeader } from "./pipeline-header";
import { StepperRail } from "./stepper-rail";
import { StageFeed } from "./stage-feed";
import { FailureBanner } from "./failure-banner";
import { PostView } from "@/components/post-view";

const SHELL = "mx-auto max-w-[1000px]";

/** First-load skeleton — the header + stepper silhouette while the first poll resolves. */
function PipelineSkeleton() {
  return (
    <div className={SHELL}>
      <div className="mb-[22px] flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <Skeleton width={120} height={13} radius={6} />
          <Skeleton width="70%" height={30} radius={9} className="mt-3" />
          <Skeleton width={320} height={15} radius={7} className="mt-3" />
        </div>
        <Skeleton width={64} height={44} radius={11} />
      </div>
      <div className="rounded-[18px] border border-border bg-surface px-6 py-7 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} width={52} height={52} radius={15} />
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={70} radius={16} />
        ))}
      </div>
    </div>
  );
}

const linkBtn =
  "inline-flex h-[42px] items-center justify-center rounded-[10px] px-[18px] text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * The live pipeline showcase (T11). Polls the run and branches on status:
 *   - first load → skeleton
 *   - 404 / hard fetch error with no data → recoverable error state
 *   - `done` → the finished article (T12's PostView)
 *   - otherwise → the live stepper + per-agent detail feed (with the failed
 *     banner layered in when the run stopped).
 */
export function PipelineView({ id }: { id: string }) {
  const { data, error, isInitialLoading, notFound, refetch } = usePostPolling(id);
  const live = Boolean(data && !isTerminal(data.status));
  const now = useNow(live);

  // First paint, before any data.
  if (isInitialLoading && !data) return <PipelineSkeleton />;

  // Nothing to show and the id is gone (or unreachable).
  if (!data) {
    return (
      <div className={SHELL}>
        <ErrorState
          title={notFound ? "We couldn't find this run" : "This run is unavailable"}
          description={
            notFound
              ? "The post may have been removed, or the link is out of date."
              : error ?? "Something went wrong reaching this run."
          }
          action={
            <>
              <Link href="/new-post" className={`${linkBtn} bg-primary text-white hover:bg-primary-700 focus-visible:outline-primary-700`}>
                Start a new post
              </Link>
              <Link href="/library" className={`${linkBtn} border border-border bg-surface text-ink hover:bg-surface-sunken focus-visible:outline-primary-600`}>
                Back to library
              </Link>
            </>
          }
        />
      </div>
    );
  }

  // Done → the finished article (T12). PostView owns its own editorial width.
  if (data.status === "done") {
    return (
      <div className={SHELL}>
        <PostView post={data} />
      </div>
    );
  }

  // In-progress (or failed): the live pipeline.
  return (
    <div className={SHELL}>
      <PipelineHeader post={data} now={now} live={live} onRefresh={refetch} />

      {live && error && !notFound ? (
        <div className="mb-4 rounded-[10px] border border-[#f5d9a8] bg-warning-tint px-3.5 py-2 text-[12.5px] text-warning-fg">
          Live updates were interrupted — retrying…
        </div>
      ) : null}

      <StepperRail post={data} now={now} />

      {data.status === "failed" ? <FailureBanner error={data.error} /> : null}

      <StageFeed post={data} now={now} />
    </div>
  );
}
