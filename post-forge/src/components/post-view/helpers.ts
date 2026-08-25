/**
 * Pure, render-safe helpers for the finished-article view (T12).
 *
 * Everything here is dependency-free and side-effect-free so it can be unit
 * tested and imported from either the client component or a future server path.
 * Duration / token / date formatting, the copy-to-clipboard markdown builder,
 * a download-filename slug, and the source → verification-verdict mapping.
 */

import type { Finding, PostDetail } from "@/lib/dto";

/**
 * Fallback labels for the metadata strip when a run recorded no explicit model
 * override. These mirror the project's locked `.env` tiers (CLAUDE.md): the
 * SMART text tier and the poster image model. The client can't read env, so a
 * seed/run without `options.model` surfaces the effective default label.
 */
export const DEFAULT_MODEL_LABEL = "openai/gpt-5-mini";
export const DEFAULT_IMAGE_MODEL_LABEL = "google/gemini-3.1-flash-image";

/** Bare hostname for a citation (drops protocol + a leading `www.`). */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
  }
}

/** Human duration: "21.4s" under a minute, "1:07" at or above. Clamped at 0. */
export function formatDuration(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped < 60_000) return `${(clamped / 1000).toFixed(1)}s`;
  const total = Math.round(clamped / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Total generation time (ms): the sum of the per-stage wall-clock timings when
 * present, else the createdAt → updatedAt span as a fallback.
 */
export function generationMs(post: PostDetail): number {
  const sum = Object.values(post.telemetry.timingsByStage).reduce(
    (acc, v) => acc + (Number(v) || 0),
    0,
  );
  if (sum > 0) return sum;
  const start = Date.parse(post.createdAt);
  const end = Date.parse(post.updatedAt);
  return Number.isFinite(start) && Number.isFinite(end)
    ? Math.max(0, end - start)
    : 0;
}

/** Grand total tokens summed across every agent. */
export function totalTokens(post: PostDetail): number {
  return Object.values(post.telemetry.tokensByAgent).reduce(
    (acc, v) => acc + (Number(v) || 0),
    0,
  );
}

/** Compact token label: "18.2k" at/above 1000, else the raw count. */
export function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.max(0, Math.round(n)));
}

/** Rough word count of a plain-text body. */
export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Estimated reading time in whole minutes (>=1) at ~200 wpm. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

/** "Jul 4, 2026". Empty string on an unparseable input. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Four-digit year from an ISO timestamp (poster placeholder stamp). */
export function yearOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : String(d.getFullYear());
}

/** URL-safe slug for a download filename, with a sensible fallback. */
export function slugify(text: string, fallback = "postforge"): string {
  const slug = text
    .toLowerCase()
    .replace(/['"’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || fallback;
}

/** The whole post rendered as portable Markdown for the clipboard. */
export function toMarkdown(post: PostDetail): string {
  const title = post.title ?? post.topic;
  const lines: string[] = [`# ${title}`, "", (post.finalPost ?? "").trim()];
  if (post.sources.length > 0) {
    lines.push("", "## Sources", "");
    post.sources.forEach((s, i) => {
      lines.push(`${i + 1}. [${s.title}](${s.url})`);
    });
  }
  return `${lines.join("\n").trim()}\n`;
}

/* -------------------------------------------------------------------------- */
/* Source ↔ finding verification mapping                                       */
/* -------------------------------------------------------------------------- */

export type SourceVerdict = "verified" | "flagged" | "uncited";

/** Normalize a URL so a source matches its finding despite trailing slashes. */
function normUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

/**
 * Map each source URL to a verification verdict from the post's findings.
 * `verifiedFindings` (post-verify, authoritative) wins; `research` fills
 * coverage gaps. A `verified` verdict is never downgraded to `flagged`.
 */
export function sourceVerdicts(post: PostDetail): Map<string, SourceVerdict> {
  const map = new Map<string, SourceVerdict>();
  const apply = (findings: Finding[]) => {
    for (const f of findings) {
      const url = f.source?.url;
      if (!url) continue;
      const key = normUrl(url);
      if (map.get(key) === "verified") continue; // don't downgrade
      map.set(key, f.verified ? "verified" : "flagged");
    }
  };
  apply(post.research); // baseline coverage
  apply(post.verifiedFindings); // authoritative override (verified wins)
  return map;
}

/** Verdict for one source URL (unmatched → "uncited"). */
export function verdictFor(
  map: Map<string, SourceVerdict>,
  url: string,
): SourceVerdict {
  return map.get(normUrl(url)) ?? "uncited";
}

/** Count of verified findings (post-verify set, falling back to research). */
export function verifiedClaimCount(post: PostDetail): number {
  const fromVerified = post.verifiedFindings.filter((f) => f.verified).length;
  if (fromVerified > 0) return fromVerified;
  return post.research.filter((f) => f.verified).length;
}

/** Count of claims that failed verification (flagged and revised pre-publish). */
export function flaggedClaimCount(post: PostDetail): number {
  return post.research.filter((f) => !f.verified).length;
}
