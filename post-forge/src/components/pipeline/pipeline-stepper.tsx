import type { ReactNode } from "react";
import { cn } from "../ui/cn";
import { AgentTimelineNode } from "./agent-timeline-node";
import { AGENTS, connectorColor, type AgentId, type AgentState } from "./agents";

export interface PipelineStepperProps {
  /** Per-agent state. Any omitted agent defaults to "queued". */
  states?: Partial<Record<AgentId, AgentState>>;
  /** Per-agent progress (0–100). */
  progress?: Partial<Record<AgentId, number>>;
  /** Per-agent mono sub-labels (e.g. elapsed). */
  sublabels?: Partial<Record<AgentId, ReactNode>>;
  className?: string;
}

/**
 * The horizontal six-stage pipeline: Research → Verify → Write → Edit →
 * Illustrate → Publish, with accent connectors that fill as stages complete.
 * Scrolls horizontally on narrow viewports (matches the design's mobile rule).
 * The hero component for T11.
 */
export function PipelineStepper({ states, progress, sublabels, className }: PipelineStepperProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between overflow-x-auto rounded-[18px] border border-border bg-surface px-6 pb-[22px] pt-[26px] shadow-sm",
        className,
      )}
    >
      {AGENTS.map((agent, i) => {
        const state = states?.[agent.id] ?? "queued";
        const isLast = i === AGENTS.length - 1;
        return (
          <div key={agent.id} className="flex flex-1 items-start last:flex-none">
            <AgentTimelineNode
              agent={agent.id}
              state={state}
              progress={progress?.[agent.id]}
              sublabel={sublabels?.[agent.id]}
              className="flex-none basis-[92px]"
            />
            {!isLast ? (
              <div
                className="mx-[-6px] mt-[26px] h-0.5 min-w-3 flex-1 rounded-full transition-colors duration-500"
                style={{ background: connectorColor(agent, state) }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
