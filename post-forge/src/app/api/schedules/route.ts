/**
 * GET  /api/schedules — list all schedules (enabled first, newest-updated).
 * POST /api/schedules — create a schedule (topic OR themeSource + cadence).
 *
 * Backs the Scheduled management screen (T14). A created enabled schedule is
 * picked up by the cron poller on its next tick.
 */

import { z } from "zod";
import { createSchedule, listSchedules, toScheduleDTO } from "@/lib/schedules-repo";
import { errorBody } from "@/lib/dto";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Per-run generation options (uses `imageModel`, an OpenRouter image-model id). */
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

/** Body schema for POST /api/schedules. */
const createSchema = z
  .object({
    topic: z.string().max(500).optional(),
    themeSource: z.string().max(120).optional(),
    cadence: cadenceSchema,
    timezone: z.string().min(1).max(80).default("UTC"),
    options: optionsSchema,
    enabled: z.boolean().default(true),
  })
  .refine(
    (d) => Boolean(d.topic?.trim()) || Boolean(d.themeSource?.trim()),
    { message: "Provide a topic or a themeSource", path: ["topic"] },
  );

/** Flatten a ZodError into a single human-readable message. */
function zodMessage(error: z.ZodError): string {
  return error.issues
    .map((i) => {
      const path = i.path.join(".");
      return path ? `${path}: ${i.message}` : i.message;
    })
    .join("; ");
}

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(errorBody("Authentication required.", "unauthorized"), {
      status: 401,
    });
  }
  const schedules = await listSchedules(user.id);
  return Response.json({ items: schedules.map(toScheduleDTO) });
}

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(errorBody("Authentication required.", "unauthorized"), {
      status: 401,
    });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(errorBody("Invalid JSON body", "invalid_request"), {
      status: 400,
    });
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      errorBody(zodMessage(parsed.error) || "Invalid schedule", "invalid_request"),
      { status: 400 },
    );
  }

  const { topic, themeSource, cadence, timezone, options, enabled } = parsed.data;
  const created = await createSchedule(user.id, {
    topic,
    themeSource,
    cadence,
    timezone,
    options,
    enabled,
  });

  return Response.json(toScheduleDTO(created), { status: 201 });
}
