/**
 * Composable core for POST /api/generate — the validation schema + the
 * guard/create-doc/mint-runId/emit-event effect, factored OUT of `route.ts` so:
 *   1. Next.js route files may only export HTTP-method/config fields, and
 *   2. every entry point (HTTP route, cron poller, schedule "run now") shares
 *      one implementation without re-implementing it.
 *
 * The T19 rate/dedupe guard (`checkGenerateGuard`) runs INSIDE this effect so
 * NO caller can mint a post doc or spend model/search/image budget past the
 * concurrency cap or dedupe window — an unauthenticated schedule fire is gated
 * by the exact same check as a manual submission.
 *
 * Contract (locked): this owns document creation + `runId` minting; the T05
 * Inngest function only *updates* the doc afterwards.
 */

import { z } from "zod";
import { ObjectId } from "mongodb";
import { inngest } from "@/inngest/client";
import {
  GENERATE_POST_EVENT,
  type GeneratePostEventData,
} from "@/inngest/functions";
import { createPost } from "@/lib/posts-repo";
import { getDb, POSTS_COLLECTION } from "@/lib/mongo";
import { checkGenerateGuard } from "@/lib/dedupe";
import type { GenerationOptions } from "@/lib/state";
import type { GenerateBlocked, GenerateResponse } from "@/lib/dto";

/** Per-run generation options (uses `imageModel`, an OpenRouter image-model id). */
const optionsSchema = z
  .object({
    model: z.string().min(1).max(200).optional(),
    imageModel: z.string().min(1).max(200).optional(),
    tone: z.string().min(1).max(100).optional(),
    length: z.enum(["short", "medium", "long"]).optional(),
  })
  .optional();

/** Request-body schema for POST /api/generate. */
export const generateSchema = z.object({
  topic: z.string().min(1).max(500),
  options: optionsSchema,
});

/** The validated input to {@link createGeneration}. */
export type GenerateInput = z.infer<typeof generateSchema>;

/**
 * The guard tripped: the submission was rejected before any doc was created.
 * Mirrors the `checkGenerateGuard` decision so a caller can surface the exact
 * `GenerateBlocked` body (and choose the HTTP status) it returns today.
 */
export interface GenerationBlockedResult {
  blocked: true;
  /** HTTP status the guard maps to: 429 (concurrency cap) or 409 (dedupe). */
  status: 429 | 409;
  /** The canonical {@link GenerateBlocked} body to return verbatim. */
  body: GenerateBlocked;
}

/** The submission passed the guard and a run was created. */
export interface GenerationCreatedResult extends GenerateResponse {
  blocked: false;
}

/**
 * Discriminated result of {@link createGeneration}: either the guard blocked the
 * submission (no doc, no spend) or a run was created. Callers branch on
 * `blocked` — see `/api/generate` (maps a block to its canonical JSON), the cron
 * poller (skips silently), and schedule "run now".
 */
export type CreateGenerationResult =
  | GenerationBlockedResult
  | GenerationCreatedResult;

/**
 * Core effect: enforce the rate/dedupe guard, then (when clear) mint a `runId`,
 * create the post doc, and emit the generation event. On an emit failure the
 * just-created doc is removed so no orphan "researching" post is stranded, and
 * the error propagates to the caller.
 *
 * Returns a {@link CreateGenerationResult}: `{ blocked: true, ... }` when the
 * guard trips (no doc created, no budget spent), otherwise
 * `{ blocked: false, id, runId }`.
 */
export async function createGeneration(
  userId: string,
  input: GenerateInput,
): Promise<CreateGenerationResult> {
  const topic = input.topic.trim();
  const options: GenerationOptions = input.options ?? {};

  // T19 guard runs for EVERY caller (route, cron, run-now) so no path can mint a
  // doc or spend model/search/image budget past the concurrency cap / dedupe
  // window. Throws only on infrastructure error — propagates to the caller.
  // The guard is now scoped per-user (each user gets their own inflight cap +
  // dedupe window). TODO(rate-limit): TOCTOU residual — the cap is checked here
  // and the doc created a few lines later, so a user's concurrent submissions
  // can briefly exceed MAX_INFLIGHT_RUNS. Closing it needs an atomic reservation.
  const block = await checkGenerateGuard(userId, topic);
  if (block) {
    return { blocked: true, status: block.status, body: block.body };
  }

  const runId = crypto.randomUUID();
  const post = await createPost(userId, topic, runId, options);
  const postId = post._id.toString();

  const eventData: GeneratePostEventData = { postId, runId, topic, options };
  try {
    await inngest.send({ name: GENERATE_POST_EVENT, data: eventData });
  } catch (err) {
    // Roll back the orphan doc so a failed emit doesn't strand a stuck post.
    try {
      const db = await getDb();
      await db
        .collection(POSTS_COLLECTION)
        .deleteOne({ _id: new ObjectId(postId) });
    } catch {
      // Best-effort cleanup; surface the original emit error below.
    }
    throw err;
  }

  return { blocked: false, id: postId, runId };
}
