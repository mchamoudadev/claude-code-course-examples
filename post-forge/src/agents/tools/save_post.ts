/**
 * `save_post` tool — persist the finished post document.
 *
 * Used by the Publisher agent (final pipeline stage). It upserts the complete
 * `posts` document keyed by **`runId`** (the unique per-run correlation id) so a
 * retry with the same `runId` updates the one document instead of creating a
 * duplicate. On success it flips the post to `status:"done"`, writes the final
 * content, sets `network.state.data.published = true` (which stops the router)
 * and `network.state.data.postId`, and returns `{ postId }`.
 *
 * Idempotency: `posts` has a unique index on `runId` (T02), and this upsert
 * matches on `runId` — so the operation is safe to repeat.
 *
 * Repository note: the T02 repo helpers (`setStatus` / `saveSources` /
 * `saveFindings`) are all keyed by `_id`, and there is no `runId`-keyed helper,
 * so the idempotent upsert is done directly against the collection here. See
 * report R-0005 (suggestion) for adding an `upsertByRunId` repo helper.
 */

import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { ObjectId, type UpdateFilter } from "mongodb";
import { getDb, POSTS_COLLECTION } from "@/lib/mongo";
import { safeHttpUrl } from "@/lib/safe-url";
import { initialStages, type NetworkState, type Post } from "@/lib/state";

export const savePostTool = createTool({
  name: "save_post",
  description:
    "Persist the finished post as the final publishing step. Provide the edited " +
    "title, the final article body, and (optionally) the final source list. The " +
    "record is upserted idempotently and the run is marked done/published.",
  parameters: z.object({
    title: z.string().describe("The final, edited post title."),
    finalPost: z
      .string()
      .describe("The final, edited article body (markdown)."),
    draft: z
      .string()
      .optional()
      .describe("The pre-edit draft, if worth retaining."),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        }),
      )
      .optional()
      .describe("The final list of cited sources ({ title, url })."),
  }),
  handler: async (
    { title, finalPost, draft, sources },
    { network },
  ): Promise<{ postId: string }> => {
    const data = network.state.data as Partial<NetworkState>;
    const runId = data.runId;
    if (!runId) {
      throw new Error(
        "save_post: network.state.data.runId is required for idempotent upsert",
      );
    }

    const now = new Date();

    // Drop any source whose url is not http(s) before persisting — defense in
    // depth against XSS payloads (javascript:, data:, …) the LLM might emit.
    const safeSources = (sources ?? data.sources ?? []).filter(
      (s) => safeHttpUrl(s?.url) !== null,
    );

    // Fields that are always (re)written on save.
    const set: Record<string, unknown> = {
      status: "done",
      updatedAt: now,
      title,
      finalPost,
      sources: safeSources,
    };
    if (draft !== undefined) set.draft = draft;
    if (data.posterImageId) set.posterImageId = data.posterImageId;
    if (data.research) set.research = data.research;
    if (data.verifiedFindings) set.verifiedFindings = data.verifiedFindings;
    if (data.options) set.options = data.options;

    // Scaffold applied only when this run's document does not yet exist.
    // `runId` is supplied by the filter, so it is intentionally omitted here to
    // avoid a $set/$setOnInsert path conflict. Every path below is disjoint from
    // `set` above (guarded for the conditionally-set arrays/options).
    const setOnInsert: Record<string, unknown> = {
      _id: new ObjectId(),
      topic: data.topic ?? title,
      createdAt: now,
      stages: initialStages(),
      subProgress: [],
      telemetry: { tokensByAgent: {}, timingsByStage: {} },
    };
    if (set.research === undefined) setOnInsert.research = [];
    if (set.verifiedFindings === undefined) setOnInsert.verifiedFindings = [];
    if (set.options === undefined) setOnInsert.options = {};

    const db = await getDb();
    const col = db.collection<Post>(POSTS_COLLECTION);
    const doc = await col.findOneAndUpdate(
      { runId },
      { $set: set, $setOnInsert: setOnInsert } as unknown as UpdateFilter<Post>,
      { upsert: true, returnDocument: "after" },
    );

    const postId = doc?._id?.toString();
    if (!postId) {
      throw new Error("save_post: upsert did not return a document");
    }

    network.state.data.postId = postId;
    network.state.data.published = true;
    return { postId };
  },
});

// Use NON-strict function-calling for this tool. `draft` and `sources` are
// OPTIONAL, but OpenAI's STRICT mode (gpt-5.x) requires every property to be
// listed in `required` and rejects the schema otherwise ("Missing 'draft'" →
// 400 "Provider returned error"). AgentKit defaults strict→true for any tool
// with parameters; opting out here keeps the optional fields while staying
// compatible with every model. The handler already tolerates omitted fields,
// and the orchestration persists authoritative title/finalPost/sources from
// network state regardless of the exact tool args. (R-0031)
savePostTool.strict = false;
