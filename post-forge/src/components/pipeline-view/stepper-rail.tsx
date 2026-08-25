"use client";

import type { ReactNode } from "react";
import type { PostDetail, Stage } from "@/lib/dto";
import { STAGES } from "@/lib/state";
import {
  AGENTS,
  AGENT_MAP,
  AgentTimelineNode,
  PipelineStepper,
  connectorColor,
  nodeStyle,
  stageStatus,
  type AgentState,
} from "@/components/pipeline";
import { cn } from "@/components/ui";
import { formatDuration, stageElapsedMs } from "./helpers";

export interface StepperRailProps {
  post: PostDetail;
  now: number;
}

function stateOf(post: PostDetail, stage: Stage): AgentState {
  return (post.stages[stage]?.state ?? "queued") as AgentState;
}

function sublabelOf(post: PostDetail, stage: Stage, now: number): string {
  const s = post.stages[stage];
  if (!s) return "";
  const ms = stageElapsedMs(s, now);
  return ms === null ? "" : formatDuration(ms);
}

/**
 * The six-stage rail. Horizontal on desktop (the shared PipelineStepper, whose
 * AgentTimelineNodes glow on the active stage), vertical on mobile (a stacked
 * timeline with the same nodes + accent connectors). Elapsed sub-labels come
 * from server timestamps.
 */
export function StepperRail({ post, now }: StepperRailProps) {
  const states: Partial<Record<Stage, AgentState>> = {};
  const sublabels: Partial<Record<Stage, ReactNode>> = {};
  for (const stage of STAGES) {
    states[stage] = stateOf(post, stage);
    sublabels[stage] = sublabelOf(post, stage, now);
  }

  return (
    <div className="mb-5">
      {/* Desktop: horizontal stepper (design-system hero component). */}
      <div className="hidden lg:block">
        <PipelineStepper states={states} sublabels={sublabels} />
      </div>

      {/* Mobile / tablet: vertical timeline. */}
      <ol className="rounded-[18px] border border-border bg-surface px-4 py-4 shadow-sm lg:hidden">
        {AGENTS.map((agent, i) => {
          const state = states[agent.id] ?? "queued";
          const meta = AGENT_MAP[agent.id];
          const ns = nodeStyle(meta, state);
          const pill = stageStatus(meta, state);
          const isLast = i === AGENTS.length - 1;
          const sub = sublabels[agent.id];
          return (
            <li key={agent.id} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <AgentTimelineNode agent={agent.id} state={state} hideLabel />
                {!isLast ? (
                  <div
                    className="my-1 w-[2px] flex-1 rounded-full transition-colors duration-500"
                    style={{ background: connectorColor(meta, state), minHeight: 18 }}
                    aria-hidden
                  />
                ) : null}
              </div>
              <div className={cn("min-w-0 flex-1 pt-1", isLast ? "pb-1" : "pb-4")}>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[14px] font-semibold transition-colors"
                    style={{ color: ns.name }}
                  >
                    {meta.label}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold leading-none"
                    style={{ color: pill.fg, background: pill.bg }}
                  >
                    {pill.label}
                  </span>
                  {sub ? (
                    <span className="ml-auto font-mono text-[11px] text-faint tabular-nums">{sub}</span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-muted">{meta.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
