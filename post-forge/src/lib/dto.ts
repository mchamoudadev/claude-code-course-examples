/**
 * Shared API DTOs — the request/response contract between the T06 HTTP surface
 * and every data-driven screen (T10 New Post, T11 Pipeline Showcase, T12 Post
 * Detail, T13 Dashboard/Library, T15 Settings).
 *
 * This module is the single source of truth for what the API returns. It is
 * intentionally runtime-dependency-free (every import is `import type`), so it is
 * safe to import from client components as well as route handlers. Server-side
 * dates are serialized to ISO strings here, so the DTOs are exactly what a
 * `fetch(...).json()` call receives.
 */

import type {
  Finding,
  GenerationLength,
  GenerationOptions,
  Post,
  PostStatus,
  Source,
  Stage,
} from "@/lib/state";

/* -------------------------------------------------------------------------- */
/* Re-exported shared enums/value types (so UI files import from one place).   */
/* -------------------------------------------------------------------------- */

export type {
  Finding,
  GenerationLength,
  GenerationOptions,
  PostStatus,
  Source,
  Stage,
} from "@/lib/state";

/* -------------------------------------------------------------------------- */
/* Standard error shape                                                        */
/* -------------------------------------------------------------------------- */

/** The canonical error envelope every non-2xx API response uses. */
export interface ApiError {
  error: {
    message: string;
    /** Machine-readable code (e.g. "invalid_request", "not_found"). */
    code?: string;
  };
}

/** Build the standard error body. */
export function errorBody(message: string, code?: string): ApiError {
  return { error: code ? { message, code } : { message } };
}

/* -------------------------------------------------------------------------- */
/* Serialized (JSON-safe) variants of the persisted sub-shapes                 */
/* -------------------------------------------------------------------------- */

/** Per-stage execution state with ISO-string timestamps. */
export interface StageStateDTO {
  state: "queued" | "active" | "done" | "failed";
  startedAt?: string;
  endedAt?: string;
  detail?: string;
}

/** A reveal-on-update sub-progress event with an ISO-string timestamp. */
export interface SubProgressEntryDTO {
  stage: Stage;
  kind: string;
  data: unknown;
  at: string;
}

/** Per-run telemetry (keys are agent/stage ids; values are additive totals). */
export interface TelemetryDTO {
  /** Token usage keyed by agent id (== stage id). */
  tokensByAgent: Record<string, number>;
  /** Wall-clock ms keyed by stage id. */
  timingsByStage: Record<string, number>;
}

/** A terminal or stage-scoped error recorded on a post. */
export interface PostErrorDTO {
  stage?: Stage;
  message: string;
}

/* -------------------------------------------------------------------------- */
/* Posts                                                                       */
/* -------------------------------------------------------------------------- */

/** Lightweight list-row shape for the dashboard / library (GET /api/posts). */
export interface PostSummary {
  id: string;
  topic: string;
  title?: string;
  status: PostStatus;
  /** GridFS id of the poster; stream via GET /api/posters/[id]. */
  posterImageId?: string;
  /** Number of gathered citations (for a "N sources" chip). */
  sourceCount: number;
  createdAt: string;
  updatedAt: string;
  /** Present when `status === "failed"`. */
  error?: PostErrorDTO;
}

/** Paginated list response (GET /api/posts). Offset pagination. */
export interface PostListResponse {
  items: PostSummary[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Full post payload for the poll + detail views (GET /api/posts/[id]).
 * Carries the live poll shape (`status`, `stages`, `subProgress`, `error`) plus
 * the complete generated content when the run has produced it.
 */
export interface PostDetail {
  id: string;
  topic: string;
  status: PostStatus;
  /** Per-stage timeline (all six stages are always present). */
  stages: Record<Stage, StageStateDTO>;
  /** Ordered reveal-on-update progress events. */
  subProgress: SubProgressEntryDTO[];
  research: Finding[];
  verifiedFindings: Finding[];
  title?: string;
  draft?: string;
  finalPost?: string;
  sources: Source[];
  posterImageId?: string;
  telemetry: TelemetryDTO;
  options: GenerationOptions;
  runId: string;
  createdAt: string;
  updatedAt: string;
  error?: PostErrorDTO;
}

/** Result of DELETE /api/posts/[id]. */
export interface DeletePostResponse {
  id: string;
  deleted: true;
}

/* -------------------------------------------------------------------------- */
/* Generate                                                                    */
/* -------------------------------------------------------------------------- */

/** Per-run generation options accepted by POST /api/generate. */
export interface GenerateRequestOptions {
  /** OpenRouter text-model id override. */
  model?: string;
  /** OpenRouter image-model id override (NOT a provider enum). */
  imageModel?: string;
  tone?: string;
  length?: GenerationLength;
}

/** Body of POST /api/generate. */
export interface GenerateRequest {
  topic: string;
  options?: GenerateRequestOptions;
}

/** Response of POST /api/generate — a navigable post id + its run correlation id. */
export interface GenerateResponse {
  id: string;
  runId: string;
}

/**
 * Blocked/deduped response from POST /api/generate (T19 rate-limit + dedupe
 * guard). A normal submission returns {@link GenerateResponse}; a blocked one
 * returns this shape instead. Consumed by the New Post screen (T10), which
 * surfaces `reason` and, when present, links to `existingPostId`.
 *
 * HTTP status conveys which guard tripped:
 *   - **429** — concurrency cap: too many non-terminal runs in flight.
 *   - **409** — dedupe: an identical recent topic is already done or in flight
 *     (in which case `existingPostId` references it).
 */
export interface GenerateBlocked {
  /** Discriminant — always `true` on a blocked response. */
  blocked: true;
  /** Human-readable explanation to surface in the UI. */
  reason: string;
  /** Present on a dedupe block: the id of the existing post to link to. */
  existingPostId?: string;
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Generation defaults (GET/PUT /api/settings). Mirrors `GenerationOptions`.
 * Locked decision: NO API-key fields are ever read or written here.
 */
export interface SettingsDTO {
  tone?: string;
  length?: GenerationLength;
  /** OpenRouter text-model id. */
  model?: string;
  /** OpenRouter image-model id. */
  imageModel?: string;
  /**
   * Resolved env-driven defaults — what the "Default" option actually maps to.
   * Read-only: populated on GET so the New Post picker can reveal the concrete
   * model behind "Default (recommended)". Never accepted on PUT.
   */
  defaults?: SettingsDefaults;
}

/** The concrete model ids the env tiers resolve to (for labelling "Default"). */
export interface SettingsDefaults {
  /** Text model the SMART tier resolves to (Verify / Editor). */
  textModelSmart: string;
  /** Text model the CHEAP tier resolves to (Research / Writer). */
  textModelCheap: string;
  /** Image model the poster stage resolves to. */
  imageModel: string;
}

/* -------------------------------------------------------------------------- */
/* Stats                                                                       */
/* -------------------------------------------------------------------------- */

/** One day of aggregate activity for the dashboard time-series charts. */
export interface StatsActivityPoint {
  /** UTC calendar day, `YYYY-MM-DD`. */
  date: string;
  posts: number;
  done: number;
  failed: number;
  tokens: number;
}

/** Dashboard analytics (GET /api/stats). Resilient to partial telemetry. */
export interface StatsResponse {
  totals: {
    total: number;
    done: number;
    failed: number;
    /** Anything neither done nor failed (a run in flight). */
    inProgress: number;
  };
  /** Count per status (all statuses present, zero-filled). */
  byStatus: Record<PostStatus, number>;
  /** done / (done + failed); 0 when there are no terminal posts. */
  successRate: number;
  /** Average total generation time (ms) over completed posts. */
  avgGenerationMs: number;
  /** Average wall-clock ms per stage (over posts that recorded each stage). */
  avgStageMs: Record<string, number>;
  /** Total tokens summed per agent id (== stage id) across all posts. */
  tokensByAgent: Record<string, number>;
  /** Grand total of all tokens across all posts. */
  totalTokens: number;
  /** Per-day activity, ascending by date. */
  activity: StatsActivityPoint[];
}

/* -------------------------------------------------------------------------- */
/* Mappers: persisted `Post` document → serialized DTOs                        */
/* -------------------------------------------------------------------------- */

/** ISO-string an optional Date (returns undefined when absent). */
function isoOpt(d: Date | undefined): string | undefined {
  return d ? new Date(d).toISOString() : undefined;
}

/** ISO-string a required Date. */
function iso(d: Date): string {
  return new Date(d).toISOString();
}

/** Project a full post document down to its list-row summary. */
export function toPostSummary(post: Post): PostSummary {
  const summary: PostSummary = {
    id: post._id.toString(),
    topic: post.topic,
    status: post.status,
    sourceCount: post.sources?.length ?? 0,
    createdAt: iso(post.createdAt),
    updatedAt: iso(post.updatedAt),
  };
  if (post.title !== undefined) summary.title = post.title;
  if (post.posterImageId !== undefined) {
    summary.posterImageId = post.posterImageId;
  }
  if (post.error) {
    summary.error = post.error.stage
      ? { stage: post.error.stage, message: post.error.message }
      : { message: post.error.message };
  }
  return summary;
}

/** Serialize a post document into the full poll/detail payload. */
export function toPostDetail(post: Post): PostDetail {
  const stages = Object.fromEntries(
    Object.entries(post.stages ?? {}).map(([stage, s]) => {
      const dto: StageStateDTO = { state: s.state };
      if (s.startedAt) dto.startedAt = isoOpt(s.startedAt);
      if (s.endedAt) dto.endedAt = isoOpt(s.endedAt);
      if (s.detail !== undefined) dto.detail = s.detail;
      return [stage, dto];
    }),
  ) as Record<Stage, StageStateDTO>;

  const detail: PostDetail = {
    id: post._id.toString(),
    topic: post.topic,
    status: post.status,
    stages,
    subProgress: (post.subProgress ?? []).map((e) => ({
      stage: e.stage,
      kind: e.kind,
      data: e.data,
      at: iso(e.at),
    })),
    research: post.research ?? [],
    verifiedFindings: post.verifiedFindings ?? [],
    sources: post.sources ?? [],
    telemetry: {
      tokensByAgent: post.telemetry?.tokensByAgent ?? {},
      timingsByStage: post.telemetry?.timingsByStage ?? {},
    },
    options: post.options ?? {},
    runId: post.runId,
    createdAt: iso(post.createdAt),
    updatedAt: iso(post.updatedAt),
  };
  if (post.title !== undefined) detail.title = post.title;
  if (post.draft !== undefined) detail.draft = post.draft;
  if (post.finalPost !== undefined) detail.finalPost = post.finalPost;
  if (post.posterImageId !== undefined) {
    detail.posterImageId = post.posterImageId;
  }
  if (post.error) {
    detail.error = post.error.stage
      ? { stage: post.error.stage, message: post.error.message }
      : { message: post.error.message };
  }
  return detail;
}

/** Project effective generation options into the settings DTO. */
export function toSettingsDTO(opts: GenerationOptions): SettingsDTO {
  const dto: SettingsDTO = {};
  if (opts.tone !== undefined) dto.tone = opts.tone;
  if (opts.length !== undefined) dto.length = opts.length;
  if (opts.model !== undefined) dto.model = opts.model;
  if (opts.imageModel !== undefined) dto.imageModel = opts.imageModel;
  return dto;
}
