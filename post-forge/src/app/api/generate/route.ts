/**
 * POST /api/generate — trigger a generation run.
 *
 * Contract (locked): this route OWNS document creation + `runId` minting via
 * `createGeneration` (in `./core`); the T05 Inngest function only *updates* the
 * doc afterwards. The validation schema + core effect live in `./core` so T19
 * can layer rate-limiting / dedupe around them (route files may only export
 * HTTP-method/config fields).
 *
 * T19 guard: the concurrency cap (429) + topic dedupe (409) now live INSIDE
 * `createGeneration`, so every entry point (this route, the cron poller, and
 * schedule "run now") is gated by the same check. A blocked submission returns
 * the canonical `GenerateBlocked` shape and never mints a post doc; a normal run
 * still returns `{ id, runId }`.
 */

import { createGeneration, generateSchema } from "./core";
import { errorBody } from "@/lib/dto";
import { getCurrentUser } from "@/lib/auth";

// Mongo + Inngest need the Node.js runtime (not Edge). Never cache a mutation.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  // 0. Require an authenticated user (defense-in-depth behind the proxy gate).
  //    The post is stamped with this owner and all reads are scoped to it.
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(errorBody("Authentication required.", "unauthorized"), {
      status: 401,
    });
  }

  // 1. Parse the JSON body (malformed JSON → 400).
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(errorBody("Invalid JSON body", "invalid_request"), {
      status: 400,
    });
  }

  // 2. Validate the shape.
  const parsed = generateSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => {
        const path = i.path.join(".");
        return path ? `${path}: ${i.message}` : i.message;
      })
      .join("; ");
    return Response.json(
      errorBody(message || "Invalid request body", "invalid_request"),
      { status: 400 },
    );
  }

  // 3. A topic that is only whitespace is not a valid topic.
  if (parsed.data.topic.trim() === "") {
    return Response.json(
      errorBody("topic must not be empty", "invalid_request"),
      { status: 400 },
    );
  }

  // 4. Create the run. `createGeneration` runs the guard (concurrency cap +
  // topic dedupe) internally; a tripped guard short-circuits with the canonical
  // GenerateBlocked shape (429 cap / 409 dedupe) and creates no doc.
  try {
    const result = await createGeneration(user.id, parsed.data);
    if (result.blocked) {
      return Response.json(result.body, { status: result.status });
    }
    return Response.json(
      { id: result.id, runId: result.runId },
      { status: 201 },
    );
  } catch (err) {
    // Never leak internal driver/connection text to the client — log the real
    // error server-side and return a generic message.
    console.error("POST /api/generate failed to start generation:", err);
    return Response.json(
      errorBody("Couldn't start generation.", "generation_failed"),
      { status: 502 },
    );
  }
}
