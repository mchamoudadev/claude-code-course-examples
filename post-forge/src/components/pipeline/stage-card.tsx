"use client";

import { useState, type ReactNode } from "react";
import { cn } from "../ui/cn";
import { ChevronDownIcon } from "../ui/icons";
import { AgentIcon } from "./agent-icon";
import { AGENT_MAP, stageStatus, type AgentId, type AgentState } from "./agents";

export interface StageCardProps {
  agent: AgentId;
  state: AgentState;
  /** Override the default agent label / description. */
  title?: ReactNode;
  description?: ReactNode;
  /** Right-aligned collapsed summary (e.g. "6 sources"). */
  summary?: ReactNode;
  /** Expandable body (search queries, claims, streamed text…). */
  children?: ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state; provide with `onOpenChange`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * Expandable per-stage card used down the pipeline feed: colored left accent,
 * agent icon tile, status pill and a collapsible detail body. Completed stages
 * read as collapsed summaries you can expand.
 */
export function StageCard({
  agent,
  state,
  title,
  description,
  summary,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  className,
}: StageCardProps) {
  const meta = AGENT_MAP[agent];
  const status = stageStatus(meta, state);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const dim = state === "queued";

  const toggle = () => {
    if (!children) return;
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const accent =
    state === "failed"
      ? "#f43f5e"
      : state === "done" || state === "active"
        ? meta.color
        : "#e7eae9";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300",
        state === "active" && "shadow-md",
        dim && "opacity-60",
        className,
      )}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} aria-hidden />
      <button
        type="button"
        onClick={toggle}
        aria-expanded={children ? isOpen : undefined}
        className={cn(
          "flex w-full items-center gap-3.5 px-[18px] py-4 text-left",
          children ? "cursor-pointer" : "cursor-default",
        )}
      >
        <span
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: meta.tint, color: meta.color }}
        >
          <AgentIcon agent={agent} size={19} strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">{title ?? meta.label}</span>
          <span className="mt-px block text-[12.5px] text-muted">{description ?? meta.description}</span>
        </span>
        {summary ? <span className="mr-1 text-[12.5px] text-muted">{summary}</span> : null}
        <span
          className="shrink-0 rounded-full px-[11px] py-1 text-[11.5px] font-semibold leading-none"
          style={{ color: status.fg, background: status.bg }}
        >
          {status.label}
        </span>
        {children ? (
          <ChevronDownIcon
            size={16}
            className={cn("shrink-0 text-muted transition-transform", isOpen && "rotate-180")}
          />
        ) : null}
      </button>
      {children && isOpen ? (
        <div className="border-t border-divider px-[18px] pb-[18px] pt-3.5">{children}</div>
      ) : null}
    </div>
  );
}
