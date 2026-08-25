"use client";

import type { PostDetail } from "@/lib/dto";
import { RefreshIcon } from "@/components/ui";
import { formatDuration, overallElapsedMs, statusPresentation } from "./helpers";

export interface PipelineHeaderProps {
  post: PostDetail;
  now: number;
  /** True while the poller is actively scheduled (shows the "live" pulse). */
  live: boolean;
  onRefresh: () => void;
}

/**
 * The run header: a status eyebrow with a pulsing dot in the active stage's
 * accent, the topic as the page title, a supporting line, and the overall
 * elapsed timer (server-timestamp derived). A refresh control forces an
 * out-of-band poll.
 */
export function PipelineHeader({ post, now, live, onRefresh }: PipelineHeaderProps) {
  const { label, color } = statusPresentation(post.status);
  const elapsed = formatDuration(overallElapsedMs(post, now));
  const subtitle =
    post.status === "failed"
      ? "This run stopped before finishing — see what happened below."
      : "Six agents are researching, verifying and writing your post — live.";

  return (
    <header className="mb-[22px] flex items-start justify-between gap-5">
      <div className="min-w-0">
        <div
          className="mb-[9px] inline-flex items-center gap-[7px] font-mono text-[12px] font-semibold uppercase tracking-[0.06em]"
          style={{ color }}
        >
          <span
            aria-hidden
            className="h-[7px] w-[7px] rounded-full"
            style={{ background: color, animation: live ? "pf-pulse 1.3s ease-in-out infinite" : undefined }}
          />
          <span role="status">{label}</span>
        </div>
        <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.025em] text-ink">
          {post.title ?? post.topic}
        </h1>
        <p className="mt-[7px] text-[14px] text-secondary">{subtitle}</p>
      </div>

      <div className="flex flex-none items-center gap-3">
        <div className="text-right">
          <div className="font-mono text-[24px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
            {elapsed}
          </div>
          <div className="mt-[3px] text-[11px] text-faint">elapsed</div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh now"
          aria-label="Refresh now"
          className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-border bg-surface text-secondary transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          <RefreshIcon size={18} />
        </button>
      </div>
    </header>
  );
}
