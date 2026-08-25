"use client";

import type { PostDetail, Stage } from "@/lib/dto";
import { AGENTS, StageCard, type AgentState } from "@/components/pipeline";
import {
  approxWords,
  editSub,
  formatDuration,
  posterSub,
  researchSub,
  savedSub,
  stageElapsedMs,
  verifySub,
  writeSub,
} from "./helpers";
import { StageDetail } from "./stage-detail";

export interface StageFeedProps {
  post: PostDetail;
  now: number;
}

/** Right-aligned collapsed summary for a completed stage (e.g. "6 sources"). */
function summaryFor(post: PostDetail, stage: Stage): string | undefined {
  switch (stage) {
    case "research": {
      const r = researchSub(post);
      return r ? `${r.count} source${r.count === 1 ? "" : "s"}` : undefined;
    }
    case "verify": {
      const v = verifySub(post);
      return v ? `${v.claims.filter((c) => c.verified).length}/${v.count} verified` : undefined;
    }
    case "write": {
      const w = writeSub(post);
      return w ? `~${approxWords(w.chars).toLocaleString()} words` : undefined;
    }
    case "edit": {
      const e = editSub(post);
      return e ? `~${approxWords(e.chars).toLocaleString()} words` : undefined;
    }
    case "illustrate":
      return posterSub(post)?.posterImageId || post.posterImageId ? "poster ready" : undefined;
    case "publish":
      return savedSub(post) ? "saved" : undefined;
  }
}

/**
 * The vertical feed of expandable stage cards. Each carries the stage's live
 * detail panel; the active (or failed) stage auto-expands while completed
 * stages collapse to a one-line summary you can re-open. Re-keying on state
 * flips the default open/closed as a stage transitions.
 */
export function StageFeed({ post, now }: StageFeedProps) {
  return (
    <div className="flex flex-col gap-3">
      {AGENTS.map((agent) => {
        const stage = agent.id as Stage;
        const s = post.stages[stage];
        const state = (s?.state ?? "queued") as AgentState;
        const elapsedMs = s ? stageElapsedMs(s, now) : null;
        const summary =
          state === "done"
            ? [summaryFor(post, stage), elapsedMs !== null ? formatDuration(elapsedMs) : undefined]
                .filter(Boolean)
                .join(" · ")
            : undefined;

        return (
          <StageCard
            key={`${stage}-${state}`}
            agent={agent.id}
            state={state}
            summary={summary}
            defaultOpen={state === "active" || state === "failed"}
          >
            {state === "queued" ? undefined : (
              <StageDetail stage={stage} post={post} active={state === "active"} />
            )}
          </StageCard>
        );
      })}
    </div>
  );
}
