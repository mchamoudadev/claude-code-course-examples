/**
 * PostForge shared data model — the canonical document shapes consumed by
 * agents, tools, orchestration, API routes, analytics, and the UI.
 *
 * This module is the single source of truth for the `posts` document shape and
 * the AgentKit network-state shape. It has no runtime dependencies (the only
 * import is a type-only `ObjectId`), so it is safe to import from any layer,
 * including client components.
 */

import type { ObjectId } from "mongodb";

/** A single source-backed claim produced by the Research/Verify agents. */
export interface Finding {
  claim: string;
  source: Source;
  verified: boolean;
}

/** A citation / reference (title + url). Reused across posts + findings. */
export interface Source {
  title: string;
  url: string;
}

/**
 * High-level lifecycle status of a post document. Mirrors the pipeline phase
 * currently running (or the terminal `done` / `failed`).
 */
export type PostStatus =
  | "researching"
  | "verifying"
  | "writing"
  | "editing"
  | "illustrating"
  | "publishing"
  | "done"
  | "failed";

/** The six pipeline stages, in execution order. */
export type Stage =
  | "research"
  | "verify"
  | "write"
  | "edit"
  | "illustrate"
  | "publish";

/** Ordered list of the six pipeline stages. */
export const STAGES: readonly Stage[] = [
  "research",
  "verify",
  "write",
  "edit",
  "illustrate",
  "publish",
] as const;

/** Per-stage execution state + timestamps, tracked for the live UI timeline. */
export interface StageState {
  state: "queued" | "active" | "done" | "failed";
  startedAt?: Date;
  endedAt?: Date;
  detail?: string;
}

/** Generation length presets. */
export type GenerationLength = "short" | "medium" | "long";

/**
 * Per-run generation options. Threaded end-to-end from the New Post advanced
 * options → the repository → the model + image factories.
 *
 * NOTE (orchestrator amendment): all AI routes through OpenRouter, so the image
 * provider is expressed as `imageModel` (an OpenRouter model id), NOT a
 * `"gemini" | "openai"` provider enum. `model` is an OpenRouter text-model id.
 */
export interface GenerationOptions {
  /** OpenRouter text-model id override (falls back to the SMART/CHEAP tiers). */
  model?: string;
  /** OpenRouter image-model id override (falls back to `IMAGE_MODEL`). */
  imageModel?: string;
  tone?: string;
  length?: GenerationLength;
}

/** A persisted, reveal-on-update sub-progress event within a stage. */
export interface SubProgressEntry {
  stage: Stage;
  kind: string;
  data: unknown;
  at: Date;
}

/** Per-run telemetry accumulated across agents + stages. */
export interface Telemetry {
  /** Token usage keyed by agent name. */
  tokensByAgent: Record<string, number>;
  /** Wall-clock duration (ms) keyed by stage. */
  timingsByStage: Record<string, number>;
}

/** A terminal or stage-scoped error recorded on the post. */
export interface PostError {
  stage?: Stage;
  message: string;
}

/**
 * The canonical `posts` document. One document per generation run, updated as
 * stages complete so the UI can poll live progress.
 */
export interface Post {
  _id: ObjectId;
  /** Owner — the user who created this post. Every query is scoped by it. */
  userId: ObjectId;
  topic: string;
  status: PostStatus;
  stages: Record<Stage, StageState>;
  subProgress: SubProgressEntry[];
  research: Finding[];
  verifiedFindings: Finding[];
  title?: string;
  draft?: string;
  finalPost?: string;
  sources: Source[];
  posterImageId?: string;
  options: GenerationOptions;
  telemetry: Telemetry;
  runId: string;
  createdAt: Date;
  updatedAt: Date;
  error?: PostError;
}

/**
 * The AgentKit network state shape. The deterministic router inspects these
 * keys to pick the next agent; each agent writes its output here. Keys are
 * optional because they fill in as the pipeline advances.
 */
export interface NetworkState {
  /** The user's topic (seed input). */
  topic?: string;
  /** Correlation id minted by POST /api/generate. */
  runId?: string;
  /** The `posts` document id (string form of `_id`). */
  postId?: string;
  /** Per-run generation options. */
  options?: GenerationOptions;
  /** Research agent output. */
  research?: Finding[];
  /** Verify agent output. */
  verifiedFindings?: Finding[];
  /** Writer agent output. */
  draft?: string;
  /** Editor agent output. */
  finalPost?: string;
  /** Editor-produced title. */
  title?: string;
  /** De-duplicated citations gathered across the run. */
  sources?: Source[];
  /** GridFS id of the generated poster. */
  posterImageId?: string;
  /** Set true by the Publisher agent → router stops. */
  published?: boolean;
}

/** Build a fresh `stages` map with every stage `queued`. */
export function initialStages(): Record<Stage, StageState> {
  return {
    research: { state: "queued" },
    verify: { state: "queued" },
    write: { state: "queued" },
    edit: { state: "queued" },
    illustrate: { state: "queued" },
    publish: { state: "queued" },
  };
}
