/**
 * GET /api/stats — dashboard analytics (T13).
 *
 * Aggregates over every post: totals + success/failed counts, average
 * generation time (from `telemetry.timingsByStage`, falling back to the
 * created→updated span), total tokens per agent, and a per-day activity series.
 *
 * Resilience (R-0008): failed / in-flight posts deliberately carry partial
 * telemetry (missing stages/agents). Every read is defensively defaulted so a
 * partial document never throws or skews an average.
 */

import { ObjectId } from "mongodb";
import { getDb, POSTS_COLLECTION } from "@/lib/mongo";
import { STAGES, type PostStatus } from "@/lib/state";
import { errorBody, type StatsActivityPoint, type StatsResponse } from "@/lib/dto";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_STATUSES: readonly PostStatus[] = [
  "researching",
  "verifying",
  "writing",
  "editing",
  "illustrating",
  "publishing",
  "done",
  "failed",
];

/** A minimal, defensively-typed view of the fields stats reads. */
interface StatsDoc {
  status?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  telemetry?: {
    tokensByAgent?: Record<string, unknown>;
    timingsByStage?: Record<string, unknown>;
  };
}

/** Coerce a possibly-missing numeric field to a finite number (else 0). */
function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** UTC calendar day (`YYYY-MM-DD`) for a date-ish value; null when unusable. */
function dayKey(value: Date | string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(errorBody("Authentication required.", "unauthorized"), {
      status: 401,
    });
  }
  const db = await getDb();
  const docs = (await db
    .collection(POSTS_COLLECTION)
    .find(
      { userId: new ObjectId(user.id) },
      {
        projection: {
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          "telemetry.tokensByAgent": 1,
          "telemetry.timingsByStage": 1,
        },
      },
    )
    .toArray()) as StatsDoc[];

  const byStatus = Object.fromEntries(
    ALL_STATUSES.map((s) => [s, 0]),
  ) as Record<PostStatus, number>;

  const tokensByAgent: Record<string, number> = {};
  let totalTokens = 0;

  // Per-stage timing accumulators (sum + count) for averages.
  const stageSum: Record<string, number> = {};
  const stageCount: Record<string, number> = {};

  // Total generation time per done post (for avgGenerationMs).
  let doneGenMsSum = 0;
  let doneCount = 0;
  let failedCount = 0;

  const activityByDay = new Map<string, StatsActivityPoint>();

  for (const doc of docs) {
    const status = doc.status as PostStatus | undefined;
    if (status && status in byStatus) byStatus[status] += 1;
    if (status === "done") doneCount += 1;
    if (status === "failed") failedCount += 1;

    // Tokens per agent (== stage id).
    const tokens = doc.telemetry?.tokensByAgent ?? {};
    let docTokens = 0;
    for (const [agent, raw] of Object.entries(tokens)) {
      const t = num(raw);
      if (t <= 0) continue;
      tokensByAgent[agent] = (tokensByAgent[agent] ?? 0) + t;
      docTokens += t;
    }
    totalTokens += docTokens;

    // Per-stage timings.
    const timings = doc.telemetry?.timingsByStage ?? {};
    let docGenMs = 0;
    for (const stage of STAGES) {
      const ms = num(timings[stage]);
      if (ms <= 0) continue;
      stageSum[stage] = (stageSum[stage] ?? 0) + ms;
      stageCount[stage] = (stageCount[stage] ?? 0) + 1;
      docGenMs += ms;
    }

    // Generation time for completed posts (fallback to created→updated span).
    if (status === "done") {
      if (docGenMs <= 0) {
        const created = doc.createdAt ? new Date(doc.createdAt).getTime() : NaN;
        const updated = doc.updatedAt ? new Date(doc.updatedAt).getTime() : NaN;
        if (Number.isFinite(created) && Number.isFinite(updated)) {
          docGenMs = Math.max(0, updated - created);
        }
      }
      doneGenMsSum += docGenMs;
    }

    // Per-day activity.
    const day = dayKey(doc.createdAt);
    if (day) {
      const point =
        activityByDay.get(day) ??
        { date: day, posts: 0, done: 0, failed: 0, tokens: 0 };
      point.posts += 1;
      if (status === "done") point.done += 1;
      if (status === "failed") point.failed += 1;
      point.tokens += docTokens;
      activityByDay.set(day, point);
    }
  }

  const avgStageMs: Record<string, number> = {};
  for (const stage of STAGES) {
    if (stageCount[stage]) {
      avgStageMs[stage] = Math.round(stageSum[stage] / stageCount[stage]);
    }
  }

  const terminal = doneCount + failedCount;
  const body: StatsResponse = {
    totals: {
      total: docs.length,
      done: doneCount,
      failed: failedCount,
      inProgress: docs.length - doneCount - failedCount,
    },
    byStatus,
    successRate: terminal > 0 ? doneCount / terminal : 0,
    avgGenerationMs: doneCount > 0 ? Math.round(doneGenMsSum / doneCount) : 0,
    avgStageMs,
    tokensByAgent,
    totalTokens,
    activity: [...activityByDay.values()].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    ),
  };

  return Response.json(body);
}
