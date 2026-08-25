/**
 * Pure, render-safe helpers for the pipeline showcase (T11): duration
 * formatting, per-stage / overall elapsed derivation from SERVER timestamps
 * (avoids client drift), status → accent mapping, and typed extraction of the
 * reveal-on-update `subProgress` payloads emitted by the orchestrator (T05).
 */

import type { PostDetail, PostStatus, StageStateDTO, Stage } from "@/lib/dto";
import { AGENT_MAP } from "@/components/pipeline";

/* -------------------------------------------------------------------------- */
/* Duration formatting                                                         */
/* -------------------------------------------------------------------------- */

/** "4.2s" under a minute, "1:07" at or above. Clamped at zero. */
export function formatDuration(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped < 60_000) return `${(clamped / 1000).toFixed(1)}s`;
  const totalSeconds = Math.round(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const parse = (iso: string | undefined): number | null =>
  iso ? Date.parse(iso) : null;

/**
 * Elapsed ms for one stage. `null` while queued (never started); frozen at
 * end − start once finished; live (now − start) while active.
 */
export function stageElapsedMs(stage: StageStateDTO, now: number): number | null {
  const started = parse(stage.startedAt);
  if (started === null) return null;
  const ended = parse(stage.endedAt);
  return (ended ?? now) - started;
}

/** Overall run elapsed: createdAt → updatedAt when terminal, else → now. */
export function overallElapsedMs(post: PostDetail, now: number): number {
  const start = parse(post.createdAt) ?? now;
  const end = isTerminal(post.status) ? (parse(post.updatedAt) ?? now) : now;
  return end - start;
}

/* -------------------------------------------------------------------------- */
/* Status                                                                      */
/* -------------------------------------------------------------------------- */

export function isTerminal(status: PostStatus): boolean {
  return status === "done" || status === "failed";
}

interface StatusMeta {
  label: string;
  /** The stage this status maps to (absent for the terminal statuses). */
  stage?: Stage;
}

const STATUS_META: Record<PostStatus, StatusMeta> = {
  researching: { label: "Researching", stage: "research" },
  verifying: { label: "Verifying", stage: "verify" },
  writing: { label: "Writing", stage: "write" },
  editing: { label: "Editing", stage: "edit" },
  illustrating: { label: "Illustrating", stage: "illustrate" },
  publishing: { label: "Publishing", stage: "publish" },
  done: { label: "Complete" },
  failed: { label: "Failed" },
};

/** Eyebrow label + pulsing-dot color for the header, keyed off status. */
export function statusPresentation(status: PostStatus): { label: string; color: string } {
  const meta = STATUS_META[status];
  if (status === "done") return { label: meta.label, color: "#059669" };
  if (status === "failed") return { label: meta.label, color: "#e11d48" };
  const color = meta.stage ? AGENT_MAP[meta.stage].color : "#8a928e";
  return { label: meta.label, color };
}

/* -------------------------------------------------------------------------- */
/* subProgress extraction (shapes emitted by src/inngest/functions.ts)         */
/* -------------------------------------------------------------------------- */

export interface SourceItem {
  title: string;
  url: string;
}
export interface ClaimItem {
  claim: string;
  verified: boolean;
}

export interface ResearchSub {
  count: number;
  sources: SourceItem[];
}
export interface VerifySub {
  count: number;
  claims: ClaimItem[];
}
export interface WriteSub {
  chars: number;
}
export interface EditSub {
  title: string;
  chars: number;
}
export interface PosterSub {
  status: string;
  posterImageId?: string;
}
export interface SavedSub {
  status: string;
  postId?: string;
}

/** Latest sub-progress `data` for a stage+kind, or null. */
function latestSub(post: PostDetail, stage: Stage, kind: string): unknown {
  for (let i = post.subProgress.length - 1; i >= 0; i--) {
    const e = post.subProgress[i];
    if (e.stage === stage && e.kind === kind) return e.data;
  }
  return null;
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

export function researchSub(post: PostDetail): ResearchSub | null {
  const d = latestSub(post, "research", "sources");
  if (d === null) return null;
  const r = asRecord(d);
  const sources = Array.isArray(r.sources) ? (r.sources as SourceItem[]) : [];
  return { count: typeof r.count === "number" ? r.count : sources.length, sources };
}

export function verifySub(post: PostDetail): VerifySub | null {
  const d = latestSub(post, "verify", "claims");
  if (d === null) return null;
  const r = asRecord(d);
  const claims = Array.isArray(r.claims) ? (r.claims as ClaimItem[]) : [];
  return { count: typeof r.count === "number" ? r.count : claims.length, claims };
}

export function writeSub(post: PostDetail): WriteSub | null {
  const d = latestSub(post, "write", "draft");
  if (d === null) return null;
  const r = asRecord(d);
  return { chars: typeof r.chars === "number" ? r.chars : 0 };
}

export function editSub(post: PostDetail): EditSub | null {
  const d = latestSub(post, "edit", "final");
  if (d === null) return null;
  const r = asRecord(d);
  return {
    title: typeof r.title === "string" ? r.title : "",
    chars: typeof r.chars === "number" ? r.chars : 0,
  };
}

export function posterSub(post: PostDetail): PosterSub | null {
  const d = latestSub(post, "illustrate", "poster");
  if (d === null) return null;
  const r = asRecord(d);
  return {
    status: typeof r.status === "string" ? r.status : "",
    posterImageId: typeof r.posterImageId === "string" ? r.posterImageId : undefined,
  };
}

export function savedSub(post: PostDetail): SavedSub | null {
  const d = latestSub(post, "publish", "saved");
  if (d === null) return null;
  const r = asRecord(d);
  return {
    status: typeof r.status === "string" ? r.status : "",
    postId: typeof r.postId === "string" ? r.postId : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

/** Bare hostname for a citation (drops protocol + leading www.). */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
  }
}

/** Rough word count for a chars-only progress readout ("~5 words"). */
export function approxWords(chars: number): number {
  return Math.max(0, Math.round(chars / 5.5));
}

/** First `max` characters of `text`, ellipsised on a word boundary. */
export function excerpt(text: string, max = 460): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
