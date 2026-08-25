/**
 * Posts repository — the persistence contract every backend task consumes
 * (T03 tools, T04 agents, T05 orchestration, T06 API, T14 schedules, T17 seed).
 *
 * All mutations are scoped with `$set` / `$push` / `$inc` on nested paths so a
 * single stage or field never clobbers its siblings, and every write bumps
 * `updatedAt`.
 */

import { Filter, ObjectId } from "mongodb";
import { getDb, POSTS_COLLECTION } from "./mongo";
import {
  Finding,
  GenerationOptions,
  initialStages,
  Post,
  PostError,
  PostStatus,
  Source,
  Stage,
  StageState,
  SubProgressEntry,
} from "./state";

/** Coerce a string | ObjectId into an ObjectId, or `null` if malformed. */
function toObjectId(id: string | ObjectId): ObjectId | null {
  if (id instanceof ObjectId) return id;
  if (typeof id === "string" && ObjectId.isValid(id)) return new ObjectId(id);
  return null;
}

async function collection() {
  const db = await getDb();
  return db.collection<Post>(POSTS_COLLECTION);
}

/**
 * Create a new post document for a generation run. The doc-ownership rule:
 * POST /api/generate creates this doc + mints `runId`; the Inngest function
 * only updates it afterwards.
 */
export async function createPost(
  userId: string | ObjectId,
  topic: string,
  runId: string,
  options: GenerationOptions = {},
): Promise<Post> {
  const owner = toObjectId(userId);
  if (!owner) throw new Error("createPost: a valid userId is required");
  const col = await collection();
  const now = new Date();
  const doc: Post = {
    _id: new ObjectId(),
    userId: owner,
    topic,
    status: "researching",
    stages: initialStages(),
    subProgress: [],
    research: [],
    verifiedFindings: [],
    sources: [],
    options,
    telemetry: { tokensByAgent: {}, timingsByStage: {} },
    runId,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return doc;
}

/**
 * Fetch one post by id, UNSCOPED. Internal/orchestration use only (the Inngest
 * function persisting a run it already owns). User-facing API routes MUST use
 * {@link getPostForUser} so one user can never read another's post.
 */
export async function getPostById(id: string | ObjectId): Promise<Post | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  const col = await collection();
  return col.findOne({ _id });
}

/** Fetch one post by id, scoped to its owner. `null` if missing or not owned. */
export async function getPostForUser(
  userId: string | ObjectId,
  id: string | ObjectId,
): Promise<Post | null> {
  const _id = toObjectId(id);
  const owner = toObjectId(userId);
  if (!_id || !owner) return null;
  const col = await collection();
  return col.findOne({ _id, userId: owner });
}

/** Find the post that owns a given GridFS poster id, scoped to `userId`. */
export async function findPostByPosterId(
  userId: string | ObjectId,
  posterImageId: string,
): Promise<Post | null> {
  const owner = toObjectId(userId);
  if (!owner) return null;
  const col = await collection();
  return col.findOne({ userId: owner, posterImageId });
}

/** Delete a post scoped to its owner. Returns true if a doc was removed. */
export async function deletePostForUser(
  userId: string | ObjectId,
  id: string | ObjectId,
): Promise<boolean> {
  const _id = toObjectId(id);
  const owner = toObjectId(userId);
  if (!_id || !owner) return false;
  const col = await collection();
  const res = await col.deleteOne({ _id, userId: owner });
  return res.deletedCount === 1;
}

/** Options for {@link listPosts}. */
export interface ListPostsOptions {
  /** Owner scope — required for user-facing listings. */
  userId?: string | ObjectId;
  search?: string;
  status?: PostStatus;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

/** A paginated slice of posts (newest first). */
export interface ListPostsResult {
  items: Post[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * List posts newest-first with optional substring/status/date filters and
 * pagination. `search` is a case-insensitive substring match on `topic`.
 */
export async function listPosts(
  opts: ListPostsOptions = {},
): Promise<ListPostsResult> {
  const col = await collection();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));

  const filter: Filter<Post> = {};
  if (opts.userId) {
    const owner = toObjectId(opts.userId);
    // A malformed owner scopes to "nothing" rather than leaking all posts.
    filter.userId = owner ?? new ObjectId("000000000000000000000000");
  }
  if (opts.search && opts.search.trim() !== "") {
    filter.topic = { $regex: escapeRegExp(opts.search.trim()), $options: "i" };
  }
  if (opts.status) filter.status = opts.status;
  if (opts.from || opts.to) {
    filter.createdAt = {};
    if (opts.from) filter.createdAt.$gte = opts.from;
    if (opts.to) filter.createdAt.$lte = opts.to;
  }

  const total = await col.countDocuments(filter);
  const items = await col
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return { items, total, page, pageSize };
}

/**
 * Patch a single stage's state/timestamps without touching sibling stages or
 * other fields. When `state` is provided and the caller omits the matching
 * timestamp, `startedAt` (on `active`) or `endedAt` (on `done`/`failed`) is
 * filled in automatically. Returns the updated post.
 */
export async function updateStage(
  id: string | ObjectId,
  stage: Stage,
  patch: Partial<StageState>,
): Promise<Post | null> {
  const _id = toObjectId(id);
  if (!_id) return null;

  const now = new Date();
  const set: Record<string, unknown> = { updatedAt: now };
  const prefix = `stages.${stage}`;

  if (patch.state !== undefined) set[`${prefix}.state`] = patch.state;
  if (patch.detail !== undefined) set[`${prefix}.detail`] = patch.detail;

  if (patch.startedAt !== undefined) {
    set[`${prefix}.startedAt`] = patch.startedAt;
  } else if (patch.state === "active") {
    set[`${prefix}.startedAt`] = now;
  }

  if (patch.endedAt !== undefined) {
    set[`${prefix}.endedAt`] = patch.endedAt;
  } else if (patch.state === "done" || patch.state === "failed") {
    set[`${prefix}.endedAt`] = now;
  }

  const col = await collection();
  return col.findOneAndUpdate(
    { _id },
    { $set: set },
    { returnDocument: "after" },
  );
}

/** Append a persisted sub-progress event (defaulting `at` to now). */
export async function appendSubProgress(
  id: string | ObjectId,
  entry: Omit<SubProgressEntry, "at"> & { at?: Date },
): Promise<Post | null> {
  const _id = toObjectId(id);
  if (!_id) return null;

  const now = new Date();
  const full: SubProgressEntry = {
    stage: entry.stage,
    kind: entry.kind,
    data: entry.data,
    at: entry.at ?? now,
  };

  const col = await collection();
  return col.findOneAndUpdate(
    { _id },
    { $push: { subProgress: full }, $set: { updatedAt: now } },
    { returnDocument: "after" },
  );
}

/** Set the post status, optionally recording an error. */
export async function setStatus(
  id: string | ObjectId,
  status: PostStatus,
  error?: PostError,
): Promise<Post | null> {
  const _id = toObjectId(id);
  if (!_id) return null;

  const set: Record<string, unknown> = { status, updatedAt: new Date() };
  if (error) set.error = error;

  const col = await collection();
  return col.findOneAndUpdate(
    { _id },
    { $set: set },
    { returnDocument: "after" },
  );
}

/** Replace the post's sources array. */
export async function saveSources(
  id: string | ObjectId,
  sources: Source[],
): Promise<Post | null> {
  const _id = toObjectId(id);
  if (!_id) return null;

  const col = await collection();
  return col.findOneAndUpdate(
    { _id },
    { $set: { sources, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
}

/** Options accumulated into a post's telemetry. */
export interface TelemetryPatch {
  /** Agent name whose token count to increment. */
  agent?: string;
  /** Tokens to add for `agent`. */
  tokens?: number;
  /** Stage whose timing to increment. */
  stage?: Stage;
  /** Milliseconds to add for `stage`. */
  ms?: number;
}

/**
 * Accumulate telemetry: `$inc` the per-agent token count and/or the per-stage
 * timing. Both are additive so it is safe to call repeatedly across a run.
 */
export async function recordTelemetry(
  id: string | ObjectId,
  patch: TelemetryPatch,
): Promise<Post | null> {
  const _id = toObjectId(id);
  if (!_id) return null;

  const inc: Record<string, number> = {};
  if (patch.agent && typeof patch.tokens === "number") {
    inc[`telemetry.tokensByAgent.${patch.agent}`] = patch.tokens;
  }
  if (patch.stage && typeof patch.ms === "number") {
    inc[`telemetry.timingsByStage.${patch.stage}`] = patch.ms;
  }

  const update: Record<string, unknown> = { $set: { updatedAt: new Date() } };
  if (Object.keys(inc).length > 0) update.$inc = inc;

  const col = await collection();
  return col.findOneAndUpdate({ _id }, update, { returnDocument: "after" });
}

/**
 * Record a terminal error for a stage: sets the `error` field and flips the
 * post to `failed`. (Use {@link setStatus} for non-error status changes.)
 */
export async function recordError(
  id: string | ObjectId,
  stage: Stage,
  message: string,
): Promise<Post | null> {
  const _id = toObjectId(id);
  if (!_id) return null;

  const col = await collection();
  return col.findOneAndUpdate(
    { _id },
    {
      $set: {
        error: { stage, message },
        status: "failed" as PostStatus,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
}

/** Append verified/research findings helper (used by T04/T05 persistence). */
export async function saveFindings(
  id: string | ObjectId,
  field: "research" | "verifiedFindings",
  findings: Finding[],
): Promise<Post | null> {
  const _id = toObjectId(id);
  if (!_id) return null;

  const col = await collection();
  return col.findOneAndUpdate(
    { _id },
    { $set: { [field]: findings, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
