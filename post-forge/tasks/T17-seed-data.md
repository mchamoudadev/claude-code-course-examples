---
id: T17
title: Seed / demo data & fixtures
status: blocked
wave: 3
depends_on: [T02, T03]
blocks: [T16]
owner: unassigned
verify: screen
---

# T17 — Seed / demo data & fixtures

## 1. Objective
Populate sample posts (varied statuses incl. `done`/`failed`), posters in GridFS, and schedules so the dashboard analytics + library look real immediately and empty-vs-populated states are exercisable.

## 2. Background & context
Uses the T02 repository + GridFS and the T03 `generate_poster` path (or direct `image.ts`). High demo value for a course project. Consumed by T13 (analytics/library) and T16 (E2E prerequisites).

## 3. Scope
**In scope:** an idempotent seed script + a README note.
**Out of scope:** running the real pipeline (seed inserts fixtures directly).

## 4. Requirements — step-by-step spec
1. `scripts/seed.ts`: insert a handful of `Post` docs spanning statuses (`done`, `failed`, one `in-progress`) with realistic `stages`, `subProgress`, `sources`, `telemetry` (tokens/timings) so charts render.
2. Generate or embed a few poster images into GridFS (with `{mime,postId}` metadata) so thumbnails + poster routes resolve. For offline seeding, embed small placeholder images rather than calling the paid image API.
3. Insert a couple of sample `schedules` (T14 collection) — enabled + disabled.
4. Make it **idempotent** (clear-and-reseed or upsert by a stable seed key) so re-running doesn't duplicate.
5. Wire `npm run seed` (T01 placeholder) to run it; document in the README.

## 5. Files to create / modify
- `post-forge/scripts/seed.ts`
- `post-forge/package.json` — `seed` script
- (uses) T02 repository/GridFS

## 6. Interfaces & contracts
- Writes only through the canonical repository/GridFS shapes (T02) so seeded data is indistinguishable from real runs.

## 7. Acceptance criteria — Definition of Done
- [ ] Running the script yields a populated dashboard + library.
- [ ] Re-running does not duplicate.
- [ ] Seeded posters render via the posters route; seeded schedules appear on the Scheduled screen.

## 8. Verification
1. `npm run seed` → dashboard shows analytics + recent posts; library lists seeded posts across statuses.
2. Re-run `npm run seed` → counts unchanged (idempotent).
3. Open a seeded post → poster renders; open Scheduled → sample schedules present.

**Screen verification:** after `npm run seed`, launch the app and screenshot `/dashboard` + `/library` populated (and a seeded schedule on `/scheduled`).

## 9. Dependencies & sequencing
`depends_on: [T02, T03]`. `blocks: [T16]`. Wave 3, in parallel with T04.

## 10. Risks & open questions
- Use embedded placeholder images to avoid paid image calls during seeding.
- Keep seed volume small but varied enough for meaningful charts.
