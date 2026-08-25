/**
 * PostForge scheduled-posts cron (T14).
 *
 * A single Inngest cron function polls on a short fixed interval and, on each
 * tick, fires every ENABLED schedule that is DUE (`nextRun <= now`). Firing a
 * schedule reuses the exact `POST /api/generate` effect (`createGeneration`):
 * it creates a normal post doc + mints a `runId` + emits
 * `post/generate.requested`, so a scheduled run is indistinguishable from a
 * manual one and appears in the library. After a fire, `nextRun` advances by
 * the cadence interval and `lastResult` is recorded.
 *
 * Why a fixed-interval poller rather than one Inngest cron per schedule: Inngest
 * cron triggers are declared statically at registration, so per-document cadence
 * is evaluated in the handler (against `nextRun`) instead. The short trigger
 * interval makes the function observable in the dev dashboard for the acceptance
 * test.
 *
 * Inngest v4 (R-0012): `createFunction` is 2-arg — the trigger lives in the
 * config object (`triggers: [{ cron }]`), the handler is the second arg.
 * Registered in `src/app/api/inngest/route.ts` alongside `generatePost`.
 */

import { inngest } from "@/inngest/client";
import { createGeneration } from "@/app/api/generate/core";
import {
  computeNextRun,
  listEnabledDueSchedules,
  markScheduleRun,
  resolveScheduleTopic,
} from "@/lib/schedules-repo";

/**
 * The cron trigger interval — every minute. Short on purpose so the function is
 * visibly firing in the Inngest dev dashboard and a due schedule turns into a
 * post within a minute (acceptance §8, short-interval test).
 */
export const CRON_SCHEDULE = "* * * * *" as const;

/** One schedule's fire outcome (JSON-safe; returned for observability). */
interface FireOutcome {
  scheduleId: string;
  status: "ok" | "failed" | "skipped";
  topic: string;
  postId?: string;
  error?: string;
}

export const cron = inngest.createFunction(
  {
    id: "scheduled-posts",
    // Inngest v4: the trigger lives inside options (2-arg createFunction).
    triggers: [{ cron: CRON_SCHEDULE }],
  },
  async ({ step }) => {
    const now = new Date();

    // 1. Load the enabled + due schedules, projected to a JSON-safe shape so the
    //    step result serializes cleanly (no ObjectId / Date in the memoized value).
    const due = await step.run("load-due-schedules", async () => {
      const schedules = await listEnabledDueSchedules(now);
      return schedules.map((s) => ({
        id: s._id.toString(),
        ownerUserId: s.ownerUserId.toString(),
        topic: resolveScheduleTopic(s),
        cadence: s.cadence,
        options: s.options ?? {},
      }));
    });

    // 2. Fire each due schedule in its own memoized step. The whole fire
    //    (create post + emit event + record result) is one step so a successful
    //    fire is never re-run on a function-level retry; failures are caught and
    //    recorded as `lastResult` rather than thrown, avoiding a retry storm.
    const fired: FireOutcome[] = [];
    for (const s of due) {
      const outcome = await step.run(
        `fire-${s.id}`,
        async (): Promise<FireOutcome> => {
          const next = computeNextRun(s.cadence, new Date());
          try {
            const result = await createGeneration(s.ownerUserId, {
              topic: s.topic,
              options: s.options,
            });
            // The rate/dedupe guard tripped (concurrency cap or an identical
            // recent topic). Skip this fire silently — no post is created and no
            // budget is spent — but still advance `nextRun` so the schedule
            // isn't re-attempted every tick, and record it as `skipped`.
            if (result.blocked) {
              console.log(
                `[cron] schedule ${s.id} skipped (guard): ${result.body.reason}`,
              );
              await markScheduleRun(
                s.id,
                {
                  at: new Date(),
                  status: "skipped",
                  error: result.body.reason.slice(0, 300),
                },
                next,
              );
              return {
                scheduleId: s.id,
                status: "skipped",
                topic: s.topic,
                error: result.body.reason,
              };
            }
            const postId = result.id;
            await markScheduleRun(
              s.id,
              { at: new Date(), status: "ok", postId },
              next,
            );
            return { scheduleId: s.id, status: "ok", topic: s.topic, postId };
          } catch (err) {
            const error =
              err instanceof Error ? err.message : "generation failed";
            await markScheduleRun(
              s.id,
              { at: new Date(), status: "failed", error: error.slice(0, 300) },
              next,
            );
            return {
              scheduleId: s.id,
              status: "failed",
              topic: s.topic,
              error,
            };
          }
        },
      );
      fired.push(outcome);
    }

    return { at: now.toISOString(), dueCount: due.length, fired };
  },
);
