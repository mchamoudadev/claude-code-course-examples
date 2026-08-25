/**
 * The six PostForge pipeline agents — the single source of truth for their
 * order, labels, and accent colors. Imported by AgentTimelineNode, PipelineStepper,
 * StageCard and consumed by T11 (pipeline showcase) and T12 (post detail).
 *
 * Accent mapping taken verbatim from PostForge.dc.html:
 *   Research → blue · Verify → emerald · Write → violet
 *   Edit → amber · Illustrate → pink · Publish → indigo
 */
export type AgentId = "research" | "verify" | "write" | "edit" | "illustrate" | "publish";

export type AgentState = "queued" | "active" | "done" | "failed";

export interface AgentMeta {
  id: AgentId;
  label: string;
  /** One-line description shown on the stage card. */
  description: string;
  /** Solid accent (icon, border, connector when complete). */
  color: string;
  /** Pale tint background. */
  tint: string;
}

export const AGENTS: readonly AgentMeta[] = [
  { id: "research", label: "Research", description: "Searches the web for primary sources", color: "#2563eb", tint: "#eff6ff" },
  { id: "verify", label: "Verify", description: "Fact-checks every claim against sources", color: "#059669", tint: "#ecfdf5" },
  { id: "write", label: "Write", description: "Drafts the post from verified findings", color: "#7c3aed", tint: "#f5f3ff" },
  { id: "edit", label: "Edit", description: "Tightens prose, tone and structure", color: "#d97706", tint: "#fffbeb" },
  { id: "illustrate", label: "Illustrate", description: "Generates an original poster image", color: "#db2777", tint: "#fdf2f8" },
  { id: "publish", label: "Publish", description: "Saves the finished post to your library", color: "#4f46e5", tint: "#eef2ff" },
] as const;

export const AGENT_MAP: Record<AgentId, AgentMeta> = AGENTS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<AgentId, AgentMeta>,
);

export const AGENT_IDS: AgentId[] = AGENTS.map((a) => a.id);

export interface NodeStyle {
  bg: string;
  border: string;
  icon: string;
  name: string;
}

/** Resolve the timeline-node tile palette for a given agent + state. */
export function nodeStyle(agent: AgentMeta, state: AgentState): NodeStyle {
  switch (state) {
    case "active":
    case "done":
      return { bg: agent.tint, border: agent.color, icon: agent.color, name: "#0b1210" };
    case "failed":
      return { bg: "#fff1f2", border: "#fecdd3", icon: "#e11d48", name: "#9f1239" };
    case "queued":
    default:
      return { bg: "#f4f6f5", border: "#e7eae9", icon: "#a2a9a5", name: "#8a928e" };
  }
}

export interface StatusPill {
  label: string;
  fg: string;
  bg: string;
}

/** Status pill (fg/bg) for the stage card header. Active adopts the agent hue. */
export function stageStatus(agent: AgentMeta, state: AgentState): StatusPill {
  switch (state) {
    case "active":
      return { label: "Active", fg: agent.color, bg: agent.tint };
    case "done":
      return { label: "Done", fg: "#047857", bg: "#ecfdf5" };
    case "failed":
      return { label: "Failed", fg: "#be123c", bg: "#fff1f2" };
    case "queued":
    default:
      return { label: "Queued", fg: "#b45309", bg: "#fffbeb" };
  }
}

/** Connector color between two stages: filled with the accent once complete. */
export function connectorColor(agent: AgentMeta, state: AgentState): string {
  return state === "done" || state === "active" ? agent.color : "#eef1f0";
}
