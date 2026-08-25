---
id: T14
title: Scheduled / cron management (screen + cron function + schedules API)
status: blocked
wave: 6
depends_on: [T02, T05, T08]
blocks: [T16]
owner: unassigned
verify: mixed
---

# T14 — Scheduled / cron management

## 1. Objective
Deliver automatic recurring posts end-to-end: the Inngest cron function, schedule persistence + CRUD API, and the management screen — reusing the `generatePost` event rather than a new pipeline.

## 2. Background & context
Adds a `schedules` collection to the T02 persistence layer, reuses the `post/generate.requested` event contract (T05), and registers `cron.ts` via the same `/api/inngest` serve handler (T01/T05). Composes T08 shell.

## 3. Scope
**In scope:** `cron.ts`, `schedules` collection + CRUD API, the Scheduled screen.
**Out of scope:** the generation pipeline (reused from T05); per-user ownership (single-tenant).

## 4. Requirements — step-by-step spec
1. **`schedules` collection** + data-access helpers: `{ _id, topic|themeSource, cadence, timezone, options, enabled, nextRun, lastResult, createdAt }`.
2. **CRUD API** `src/app/api/schedules/route.ts` (+ `[id]`): create/read/update/delete, enable/disable, **run-now**, and next-run/last-result tracking.
3. **`src/inngest/cron.ts`**: a scheduled Inngest function (cron) that, per enabled schedule, emits `post/generate.requested` for the configured topic/trending theme; register it in the serve handler. Represent cadence as presets (+ optional raw cron) with a timezone.
4. **Scheduled screen** `src/app/(app)/scheduled/page.tsx`: list (topic/theme, cadence, next run, last result); create/edit form (topic or trending-theme source, frequency, model/image options); enable/disable toggle; run-now action; empty state.
5. Runs launched by a schedule create normal posts (appear in the library).

## 5. Files to create / modify
- `post-forge/src/inngest/cron.ts`
- `post-forge/src/app/api/schedules/route.ts` (+ `[id]/route.ts`)
- `post-forge/src/app/(app)/scheduled/page.tsx`
- `post-forge/src/app/api/inngest/route.ts` — register `cron`
- (uses) settings/repository from T02

## 6. Interfaces & contracts
- Produces `post/generate.requested` (same contract as T06 → consumed by T05).
- `schedules` CRUD DTOs for the screen.

## 7. Acceptance criteria — Definition of Done
- [ ] Creating an enabled schedule persists it and drives the Inngest cron, which fires on cadence in the Inngest dev dashboard (verified via a short-interval test).
- [ ] Run-now triggers a generation via `generatePost`; enable/disable toggles active state; next-run/last-result reflect reality.
- [ ] The list shows schedules with an empty state when none exist; runs launched by a schedule appear as normal posts in the library.
- [ ] Responsive and AA.

## 8. Verification
1. Create a schedule with a short cadence → watch the cron fire in the Inngest dashboard and a post appear in the library.
2. Toggle disable → no fire; enable → fires again.
3. Run-now → immediate generation; check next-run/last-result update.

**Screen verification:** launch the app; screenshot `/scheduled` (list, create/edit form, empty state); also observe the Inngest dashboard firing the cron on a short interval.

## 9. Dependencies & sequencing
`depends_on: [T02, T05, T08]`. `blocks: [T16]`. Wave 6, in parallel with the other data screens.

## 10. Risks & open questions
- Define "trending-theme source" (how a topic is auto-picked).
- Cadence representation (presets vs raw cron) + timezone handling.
- Run-now idempotency/concurrency with manual runs.
