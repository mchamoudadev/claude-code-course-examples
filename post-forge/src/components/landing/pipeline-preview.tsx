"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AGENTS, AgentIcon, cn } from "@/components";
import type { AgentId } from "@/components";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Landing hero pipeline preview — the marketing take on the six-stage pipeline.
 *
 * Reuses the canonical `AGENTS` source of truth (order + per-agent accent/tint
 * + label) and `AgentIcon` from `@/components/pipeline`, rendered as the
 * Landing screen's bespoke floating-tile treatment (distinct from the in-app
 * PipelineStepper). Motion is twofold and both layers honor reduced-motion:
 *   1. Ambient CSS float + glow-ring pulse (staggered per tile) — frozen by the
 *      global `prefers-reduced-motion` rule in globals.css.
 *   2. A data-driven "active" sweep (JS) that lights the current stage's ring —
 *      the interval simply never starts when reduced motion is requested.
 */

/** Short mono captions under each stage (marketing voice, per the design). */
const CAPTIONS: Record<AgentId, string> = {
  research: "search web",
  verify: "fact-check",
  write: "draft",
  edit: "polish",
  illustrate: "poster",
  publish: "save",
};

export function PipelinePreview() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (reduced) {
      setActive(-1);
      return;
    }
    setActive(0);
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % AGENTS.length);
    }, 950);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-border bg-surface p-[26px_20px] shadow-[0_30px_70px_-34px_rgba(11,18,16,0.32)] sm:p-[34px_30px]">
      {/* soft mint radiance from the top */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(720px 260px at 50% -10%, #F0FBF6, transparent)" }}
      />
      <div className="relative flex items-start justify-between gap-1.5 overflow-x-auto">
        {AGENTS.map((agent, i) => {
          const isLast = i === AGENTS.length - 1;
          const isActive = active === i;
          return (
            <div
              key={agent.id}
              className="relative flex min-w-[84px] flex-1 flex-col items-center text-center"
            >
              {/* dashed connector rail running behind the tiles */}
              {!isLast ? (
                <span
                  aria-hidden
                  className="absolute left-1/2 top-[27px] z-0 h-0.5 w-full"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg,#D7DBD9 0 5px, transparent 5px 10px)",
                  }}
                />
              ) : null}

              <div
                className="pf-float-tile relative z-[1] flex h-[54px] w-[54px] items-center justify-center rounded-[15px] border transition-shadow duration-300"
                style={{
                  background: agent.tint,
                  borderColor: "#EEF1F0",
                  color: agent.color,
                  animationDelay: `${i * 0.5}s`,
                  boxShadow: isActive ? `0 0 0 4px ${agent.color}22` : undefined,
                }}
              >
                <span
                  aria-hidden
                  className="pf-glow-ring absolute inset-0 rounded-[15px]"
                  style={
                    {
                      "--gc": `${agent.color}66`,
                      animationDelay: `${i * 0.5}s`,
                    } as CSSProperties
                  }
                />
                <AgentIcon agent={agent.id} size={21} strokeWidth={1.9} />
              </div>

              <div className="mt-[11px] text-[13px] font-semibold text-ink">{agent.label}</div>
              <div
                className={cn(
                  "mt-0.5 font-mono text-[11px] transition-colors duration-300",
                  isActive ? "text-body" : "text-secondary",
                )}
              >
                {CAPTIONS[agent.id]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scoped keyframe — pf-float isn't in globals.css and globals is read-only
          for this task. The global reduced-motion rule still neutralizes it. */}
      <style>{`
        @keyframes pf-float-preview { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .pf-float-tile { animation: pf-float-preview 3.4s ease-in-out infinite; }
        .pf-glow-ring { animation: pf-glowc 3.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
