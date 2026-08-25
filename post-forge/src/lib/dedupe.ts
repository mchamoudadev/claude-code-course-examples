/**
 * Pre-creation guard for POST /api/generate (T19).
 *
 * Layered ahead of `createGeneration` so a blocked submission never mints a
 * post doc or spends model/search/image budget. Two checks run in order:
 *
 *   1. **Concurrency cap** — count non-terminal (in-flight) posts; if the count
 *      is at/above `MAX_INFLIGHT_RUNS`, reject with an HTTP 429 block.
 *   2. **Topic dedupe** — normalize the submitted topic and compare it against
 *      recent posts (created within `DEDUPE_WINDOW_HOURS`) that are `done` or
 *      still in flight; on a match, reject with an HTTP 409 block that references
 *      the existing post.
 *
 * Both thresholds are read through `@/lib/env` so they stay env-configurable.
 * `failed` posts never dedupe-block (a failed topic should be freely retryable).
 */

import { ObjectId } from "mongodb";
import { dedupeWindowHours, maxInflightRuns } from "./env";
import { getDb, POSTS_COLLECTION } from "./mongo";
import type { Post, PostStatus } from "./state";
import type { GenerateBlocked } from "./dto";

/** Terminal statuses — a post in one of these is no longer "in flight". */
const TERMINAL_STATUSES: PostStatus[] = ["done", "failed"];

/** Cap on how many recent docs the dedupe scan pulls back for comparison. */
const DEDUPE_SCAN_LIMIT = 500;

/** A guard decision: the canonical blocked body plus the HTTP status to send. */
export interface GuardBlock {
  /** HTTP status: 429 (concurrency cap) or 409 (dedupe). */
  status: 429 | 409;
  /** The canonical {@link GenerateBlocked} body the route returns verbatim. */
  body: GenerateBlocked;
}

/**
 * Normalize a topic for dedupe comparison: lowercase, strip punctuation/symbols
 * (keeping Unicode letters, numbers, and whitespace), then collapse runs of
 * whitespace and trim. So `"  AI, and ML!! "` and `"ai and ml"` compare equal.
 */
export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Projection row for the dedupe scan (only the fields the guard needs). */
interface TopicRow {
  _id: ObjectId;
  topic: string;
  status: PostStatus;
}

/**
 * Run the concurrency-cap + dedupe guard for a submitted `topic`.
 *
 * Returns a {@link GuardBlock} to reject the request, or `null` when the
 * submission may proceed to `createGeneration`. Throws only on an infrastructure
 * error (e.g. the DB is unreachable); the caller maps that to a 5xx.
 */
export async function checkGenerateGuard(
  userId: string | ObjectId,
  topic: string,
): Promise<GuardBlock | null> {
  const owner = userId instanceof ObjectId ? userId : new ObjectId(userId);
  const db = await getDb();
  const col = db.collection<Post>(POSTS_COLLECTION);

  // (1) Concurrency cap — count this user's non-terminal (in-flight) posts.
  const cap = maxInflightRuns();
  const inflight = await col.countDocuments({
    userId: owner,
    status: { $nin: TERMINAL_STATUSES },
  });
  if (inflight >= cap) {
    return {
      status: 429,
      body: {
        blocked: true,
        reason:
          `Too many generations in progress (${inflight} of ${cap} slots in use). ` +
          `Wait for a run to finish, then try again.`,
      },
    };
  }

  // (2) Topic dedupe within the recent window. Normalization can't be expressed
  // as an index query, so scan the recent non-failed posts and compare in memory.
  const normalized = normalizeTopic(topic);
  if (normalized !== "") {
    const windowMs = dedupeWindowHours() * 60 * 60 * 1000;
    const since = new Date(Date.now() - windowMs);
    const recent = await col
      .find({ userId: owner, createdAt: { $gte: since }, status: { $ne: "failed" } })
      .sort({ createdAt: -1 })
      .limit(DEDUPE_SCAN_LIMIT)
      .project<TopicRow>({ topic: 1, status: 1 })
      .toArray();

    const match = recent.find((p) => normalizeTopic(p.topic) === normalized);
    if (match) {
      const inProgress = match.status !== "done";
      return {
        status: 409,
        body: {
          blocked: true,
          reason: inProgress
            ? "This topic is already being generated. Open the existing run instead."
            : "This topic was already generated recently. Open the existing post instead.",
          existingPostId: match._id.toString(),
        },
      };
    }
  }

  return null;
}
