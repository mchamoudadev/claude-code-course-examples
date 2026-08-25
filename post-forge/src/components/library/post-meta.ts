/**
 * Pure display helpers shared across the post-browsing surfaces (Library grid +
 * list, Dashboard recent posts, analytics tiles). No JSX and no React imports,
 * so this module is safe to import from server or client components alike.
 */

import type { BadgeTone } from "@/components/ui";
import type { PostStatus } from "@/lib/dto";

/* -------------------------------------------------------------------------- */
/* Status → badge mapping                                                      */
/* -------------------------------------------------------------------------- */

export interface StatusMeta {
  /** Short pill label (matches the design's Published / Generating / Failed). */
  label: string;
  /** Design-system badge tone. */
  tone: BadgeTone;
  /** True for a run still in flight (drives a soft pulsing dot). */
  active: boolean;
}

/** The six in-flight statuses, keyed for a friendlier long-form label. */
const IN_FLIGHT_LABEL: Partial<Record<PostStatus, string>> = {
  researching: "Researching",
  verifying: "Verifying",
  writing: "Writing",
  editing: "Editing",
  illustrating: "Illustrating",
  publishing: "Publishing",
};

/** Map a post status to its pill label + tone. */
export function statusMeta(status: PostStatus): StatusMeta {
  if (status === "done") return { label: "Published", tone: "success", active: false };
  if (status === "failed") return { label: "Failed", tone: "error", active: false };
  return { label: "Generating", tone: "info", active: true };
}

/** Longer, human status label (for tooltips / aria text). */
export function statusLabel(status: PostStatus): string {
  if (status === "done") return "Published";
  if (status === "failed") return "Failed";
  return IN_FLIGHT_LABEL[status] ?? "Generating";
}

/* -------------------------------------------------------------------------- */
/* Deterministic poster gradient (fallback when no poster image exists)        */
/* -------------------------------------------------------------------------- */

/**
 * A small curated set of rich, editorial diagonal gradients — used as the poster
 * placeholder before Illustrate runs (failed / in-flight posts) and behind the
 * poster while its bytes load. Deep + saturated so white overlay text reads AA.
 */
const POSTER_GRADIENTS: readonly string[] = [
  "linear-gradient(135deg,#0f766e,#134e4a)",
  "linear-gradient(135deg,#1d4ed8,#312e81)",
  "linear-gradient(135deg,#7c3aed,#4c1d95)",
  "linear-gradient(135deg,#be123c,#7f1d1d)",
  "linear-gradient(135deg,#c2410c,#7c2d12)",
  "linear-gradient(135deg,#0369a1,#0c4a6e)",
  "linear-gradient(135deg,#047857,#064e3b)",
  "linear-gradient(135deg,#a21caf,#701a75)",
];

/** Stable 32-bit hash of a string (FNV-1a-ish). */
function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Pick a deterministic gradient for a post (keyed by id, falling back to topic). */
export function posterGradient(seed: string): string {
  return POSTER_GRADIENTS[hashString(seed) % POSTER_GRADIENTS.length];
}

/* -------------------------------------------------------------------------- */
/* Date / number formatting                                                    */
/* -------------------------------------------------------------------------- */

const MS_MIN = 60_000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

/** Compact relative time, e.g. "just now", "3h ago", "4d ago", "2w ago". */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  if (diff < MS_MIN) return "just now";
  if (diff < MS_HOUR) return `${Math.floor(diff / MS_MIN)}m ago`;
  if (diff < MS_DAY) return `${Math.floor(diff / MS_HOUR)}h ago`;
  const days = Math.floor(diff / MS_DAY);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** Short absolute date, e.g. "Jul 4" (or "Jul 4, 2025" across a year boundary). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** Label a `YYYY-MM-DD` activity-series day as "Jul 4". */
export function dayLabel(day: string): string {
  // Parse as UTC noon to avoid off-by-one from timezone rollover.
  const d = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Compact number, e.g. 2_400_000 → "2.4M", 5200 → "5.2K", 940 → "940". */
export function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(n / 1_000)}K`;
  return `${Math.round(n)}`;
}

/** Drop a trailing ".0" from a one-decimal string. */
function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

/** Humanize a duration in ms, e.g. 21_000 → "21s", 92_000 → "1m 32s". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec ? `${min}m ${sec}s` : `${min}m`;
}
