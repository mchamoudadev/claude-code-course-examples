/**
 * GET    /api/schedules/[id] — read one schedule.
 * PATCH  /api/schedules/[id] — partial update (fields, cadence, enable/disable).
 * DELETE /api/schedules/[id] — remove a schedule.
 * POST   /api/schedules/[id] — run now: trigger an immediate generation for the
 *                              schedule's topic and record it as `lastResult`.
 *
 * Next 16: the dynamic route `params` is a Promise and MUST be awaited.
 */

import { z } from "zod";
import { createGeneration } from "@/app/api/generate/core";
import {
  deleteSchedule,
  getScheduleForUser,
  markScheduleRun,
  resolveScheduleTopic,
  toScheduleDTO,
  updateSchedule,
  type UpdateScheduleInput,
} from "@/lib/schedules-repo";
import { errorBody } from "@/lib/dto";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Resolve the caller or a 401 response. */
async function requireUser(): Promise<{ id: string } | Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(errorBody("Authentication required.", "unauthorized"), {
      status: 401,
    });
  }
  return user;
}

const optionsSchema = z
  .object({
    model: z.string().min(1).max(200).optional(),
    imageModel: z.string().min(1).max(200).optional(),
    tone: z.string().min(1).max(100).optional(),
    length: z.enum(["short", "medium", "long"]).optional(),
  })
  .optional();

const cadenceSchema = z.object({
  preset: z.enum(["hourly", "daily", "weekly", "monthly"]),
  cron: z.string().max(120).optional(),
});

/** Body schema for PATCH — every field optional; at least one required. */
const patchSchema = z
  .object({
    topic: z.string().max(500).optional(),
    themeSource: z.string().max(120).optional(),
    cadence: cadenceSchema.optional(),
    timezone: z.string().min(1).max(80).optional(),
    options: optionsSchema,
    enabled: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "No updatable fields provided",
  });

function zodMessage(error: z.ZodError): string {
  return error.issues
    .map((i) => {
      const path = i.path.join(".");
      return path ? `${path}: ${i.message}` : i.message;
    })
    .join("; ");
}

export async function GET(_request: Request, ctx: Ctx): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  const schedule = await getScheduleForUser(auth.id, id);
  if (!schedule) {
    return Response.json(errorBody("Schedule not found", "not_found"), {
      status: 404,
    });
  }
  return Response.json(toScheduleDTO(schedule));
}

export async function PATCH(request: Request, ctx: Ctx): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(errorBody("Invalid JSON body", "invalid_request"), {
      status: 400,
    });
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      errorBody(zodMessage(parsed.error) || "Invalid update", "invalid_request"),
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Translate to the repo's tri-state update. When a source field is explicitly
  // provided with a value, unset the counterpart so exactly one source remains.
  const patch: UpdateScheduleInput = {};
  const topic = body.topic?.trim();
  const themeSource = body.themeSource?.trim();
  if (topic) {
    patch.topic = topic;
    if (body.themeSource === undefined) patch.themeSource = null;
  } else if (body.topic !== undefined) {
    patch.topic = null;
  }
  if (themeSource) {
    patch.themeSource = themeSource;
    if (body.topic === undefined) patch.topic = null;
  } else if (body.themeSource !== undefined) {
    patch.themeSource = null;
  }
  if (body.cadence !== undefined) patch.cadence = body.cadence;
  if (body.timezone !== undefined) patch.timezone = body.timezone;
  if (body.options !== undefined) patch.options = body.options;
  if (body.enabled !== undefined) patch.enabled = body.enabled;

  const updated = await updateSchedule(auth.id, id, patch);
  if (!updated) {
    return Response.json(errorBody("Schedule not found", "not_found"), {
      status: 404,
    });
  }
  return Response.json(toScheduleDTO(updated));
}

export async function DELETE(_request: Request, ctx: Ctx): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  const removed = await deleteSchedule(auth.id, id);
  if (!removed) {
    return Response.json(errorBody("Schedule not found", "not_found"), {
      status: 404,
    });
  }
  return Response.json({ id, deleted: true });
}

/**
 * Run now — trigger an immediate generation for this schedule's topic, exactly
 * like `POST /api/generate`, then stamp `lastResult`. `nextRun` is left on its
 * cadence (a manual run is out-of-band). Works regardless of `enabled`.
 */
export async function POST(_request: Request, ctx: Ctx): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;

  const schedule = await getScheduleForUser(auth.id, id);
  if (!schedule) {
    return Response.json(errorBody("Schedule not found", "not_found"), {
      status: 404,
    });
  }

  const topic = resolveScheduleTopic(schedule);
  try {
    const result = await createGeneration(auth.id, {
      topic,
      options: schedule.options,
    });

    // The shared rate/dedupe guard tripped (concurrency cap or an identical
    // recent topic). No post was created; surface the canonical GenerateBlocked
    // shape (same contract as POST /api/generate) and record the skip.
    if (result.blocked) {
      await markScheduleRun(id, {
        at: new Date(),
        status: "skipped",
        error: result.body.reason.slice(0, 300),
      });
      return Response.json(result.body, { status: result.status });
    }

    const { id: postId, runId } = result;
    const updated = await markScheduleRun(id, {
      at: new Date(),
      status: "ok",
      postId,
    });
    return Response.json(
      {
        postId,
        runId,
        topic,
        schedule: updated ? toScheduleDTO(updated) : undefined,
      },
      { status: 201 },
    );
  } catch (err) {
    // Never leak internal driver/connection text to the client — log the real
    // error server-side and return a generic message.
    console.error(`POST /api/schedules/${id} run-now failed:`, err);
    await markScheduleRun(id, {
      at: new Date(),
      status: "failed",
      error: "Couldn't start generation.",
    });
    return Response.json(
      errorBody("Couldn't start generation.", "generation_failed"),
      { status: 502 },
    );
  }
}
