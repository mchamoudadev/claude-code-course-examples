import type { ReactNode } from "react";
import { cn } from "../ui/cn";
import { CheckIcon, XIcon } from "../ui/icons";
import { Spinner } from "../ui/spinner";
import { AgentIcon } from "./agent-icon";
import { AGENT_MAP, nodeStyle, type AgentId, type AgentState } from "./agents";

export interface AgentTimelineNodeProps {
  agent: AgentId;
  state: AgentState;
  /** Mono sub-label under the name (e.g. elapsed "4.2s"). */
  sublabel?: ReactNode;
  /** 0–100 mini progress under the label. Omit to hide the bar. */
  progress?: number;
  /** Hide the label + sublabel (compact rail). */
  hideLabel?: boolean;
  className?: string;
}

/**
 * A single pipeline stage node: a 52px accent tile with the agent icon, a
 * state badge (spinner / green check / red ✗), name, mono sub-label and an
 * optional progress bar. States: queued · active · done · failed.
 * Exported for T11 (pipeline showcase).
 */
export function AgentTimelineNode({
  agent,
  state,
  sublabel,
  progress,
  hideLabel = false,
  className,
}: AgentTimelineNodeProps) {
  const meta = AGENT_MAP[agent];
  const s = nodeStyle(meta, state);
  const active = state === "active";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative h-[52px] w-[52px]">
        {active ? (
          <span
            aria-hidden
            className="absolute -inset-[7px] rounded-[19px] blur-[9px] animate-pulse-soft"
            style={{ background: meta.color, opacity: 0.16 }}
          />
        ) : null}
        <div
          className="relative flex h-[52px] w-[52px] items-center justify-center rounded-[15px] border-[1.5px] transition-all duration-300"
          style={{ background: s.bg, borderColor: s.border, color: s.icon }}
        >
          <AgentIcon agent={agent} size={22} strokeWidth={1.9} />
        </div>

        {state === "done" ? (
          <span
            className="absolute -right-[5px] -top-[5px] flex h-[19px] w-[19px] items-center justify-center rounded-full border-2 border-white bg-success animate-scale-in"
            aria-label="Done"
          >
            <CheckIcon size={11} className="text-white" strokeWidth={3.5} />
          </span>
        ) : null}
        {active ? (
          <span
            className="absolute -right-[5px] -top-[5px] flex h-[19px] w-[19px] items-center justify-center rounded-full border-[1.5px] border-border bg-white"
            aria-label="In progress"
          >
            <Spinner size={9} color={meta.color} />
          </span>
        ) : null}
        {state === "failed" ? (
          <span
            className="absolute -right-[5px] -top-[5px] flex h-[19px] w-[19px] items-center justify-center rounded-full border-2 border-white bg-error animate-scale-in"
            aria-label="Failed"
          >
            <XIcon size={10} className="text-white" strokeWidth={3.5} />
          </span>
        ) : null}
      </div>

      {!hideLabel ? (
        <>
          <div
            className="mt-[11px] text-[12.5px] font-semibold transition-colors duration-300"
            style={{ color: s.name }}
          >
            {meta.label}
          </div>
          <div className="mt-0.5 h-[13px] font-mono text-[10.5px] text-faint">{sublabel}</div>
        </>
      ) : null}

      {typeof progress === "number" ? (
        <div className="mt-1.5 h-[3px] w-[46px] overflow-hidden rounded-full bg-border-subtle">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%`, background: s.icon }}
          />
        </div>
      ) : null}
    </div>
  );
}
