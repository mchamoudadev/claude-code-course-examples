"use client";

import Link from "next/link";
import type { PostErrorDTO } from "@/lib/dto";
import { AGENT_MAP } from "@/components/pipeline";
import { AlertTriangleIcon, RefreshIcon } from "@/components/ui";

export interface FailureBannerProps {
  error?: PostErrorDTO;
}

/**
 * The failed-run banner. Reads the persisted `error{stage,message}` off the doc
 * (per R-0014 the doc itself is `status:"failed"` — there's no separate Inngest
 * error badge). Names the agent that stopped the run and offers a fresh retry.
 */
export function FailureBanner({ error }: FailureBannerProps) {
  const agentLabel = error?.stage ? AGENT_MAP[error.stage]?.label : undefined;
  const heading = agentLabel ? `The ${agentLabel} agent hit an error` : "This run stopped early";
  const message =
    error?.message ??
    "The run was stopped before publishing so nothing unverified was saved.";

  return (
    <div
      role="alert"
      className="mb-5 flex flex-col gap-4 rounded-2xl border border-error-border bg-error-tint p-5 sm:flex-row sm:items-center"
      style={{ animation: "pf-up 0.4s ease both" }}
    >
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-[#ffe4e6] text-error-strong">
        <AlertTriangleIcon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15.5px] font-semibold text-error-fg">{heading}</div>
        <p className="mt-1 text-[13.5px] leading-relaxed text-[#b4535f]">{message}</p>
      </div>
      <Link
        href="/new-post"
        className="inline-flex h-[42px] flex-none items-center justify-center gap-1.5 rounded-[10px] bg-error-strong px-[18px] text-[14px] font-semibold text-white transition-colors hover:bg-error-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error-fg"
      >
        <RefreshIcon size={15} />
        Retry run
      </Link>
    </div>
  );
}
