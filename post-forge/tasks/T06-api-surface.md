---
id: T06
title: "API surface: generate, posts, poster streaming, stats, settings"
status: blocked
wave: 5
depends_on: [T02, T05]
blocks: [T10, T11, T12, T13, T15, T18, T19]
owner: unassigned
verify: command
---

# T06 — API surface

## 1. Objective
Expose the HTTP routes the frontend consumes — trigger a generation run, list posts (search/filter/paginate), fetch one post for live polling, stream poster bytes from GridFS, provide dashboard analytics, and read/write generation defaults — with locked response shapes so every UI task builds against a stable contract.

## 2. Background & context
The contract layer between backend (T02 repository/GridFS, T05 event) and every data-driven screen (T10–T15). `POST /api/generate` **owns doc creation + `runId` minting**; the Inngest function (T05) only updates. Analytics read the telemetry T05 records.

## 3. Scope
**In scope:** `generate`, `posts` (list), `posts/[id]` (get + delete), `posters/[id]` (stream), a stats endpoint, `settings` (get/put), shared DTO types, standard error shape.
**Out of scope:** UI (T10–T15); rate-limit/dedupe (T19, layered onto `generate`); test-connection route (T15).

## 4. Requirements — step-by-step spec
1. **`POST /api/generate`** (`app/api/generate/route.ts`): validate `{ topic, options }` with zod (options: `model?`, `imageProvider?`, `tone?`, `length?`). **Create** the post doc via `createPost(topic, runId, options)`, **mint `runId`** (e.g. `crypto.randomUUID()`), emit `inngest.send({ name: "post/generate.requested", data: { postId, runId, topic, options } })`, return `{ id, runId }`.
2. **`GET /api/posts`** (`app/api/posts/route.ts`): query `listPosts` with `search`, `status`, `from`/`to`, `page`/`pageSize`; return `{ items, page, pageSize, total }`.
3. **`GET /api/posts/[id]`** (`app/api/posts/[id]/route.ts`): return the **poll shape** — live `status`, `stages`, `subProgress`, plus the full payload (`finalPost`, `sources`, `title`, `posterImageId`, `telemetry`) when `done`. **`DELETE`**: remove the post **and** its GridFS poster bytes.
4. **`GET /api/posters/[id]`** (`app/api/posters/[id]/route.ts`): stream bytes from GridFS with correct `Content-Type` (from metadata `mime`) and caching headers; clean `404` for unknown ids.
5. **Stats endpoint** (`app/api/stats/route.ts`): aggregate totals, success vs failed counts, avg generation time (from `timingsByStage`/timestamps), tokens/agent-activity over time (from `telemetry`).
6. **`GET/PUT /api/settings`** (`app/api/settings/route.ts`): read/write generation defaults via the settings store (T02). No key fields.
7. Export **shared DTO types** (request/response) from a `src/lib/dto.ts` so UI tasks import them. Define a standard error-response shape `{ error: { message, code? } }`.

## 5. Files to create / modify
- `post-forge/src/app/api/generate/route.ts`
- `post-forge/src/app/api/posts/route.ts`
- `post-forge/src/app/api/posts/[id]/route.ts`
- `post-forge/src/app/api/posters/[id]/route.ts`
- `post-forge/src/app/api/stats/route.ts`
- `post-forge/src/app/api/settings/route.ts`
- `post-forge/src/lib/dto.ts` — shared request/response types

## 6. Interfaces & contracts
- Event produced: `post/generate.requested` (consumed by T05).
- Response DTOs (`PostSummary`, `PostDetail`, `StatsResponse`, `SettingsDTO`, error shape) are the contract for T10–T15.
- Pagination scheme (offset `page`/`pageSize`) fixed here.

## 7. Acceptance criteria — Definition of Done
- [ ] `POST /api/generate` validates input, creates the doc + mints `runId`, emits the event, returns a navigable id.
- [ ] `GET /api/posts/[id]` reflects live `status`/`stages`/`subProgress` on repeated polls during a run; `DELETE` removes the post + poster bytes.
- [ ] `GET /api/posts` supports topic search + status/date filter + stable pagination.
- [ ] `GET /api/posters/[id]` streams image bytes with correct headers and 404s cleanly for unknown ids.
- [ ] Stats endpoint returns the analytics figures the dashboard needs.
- [ ] `GET/PUT /api/settings` round-trips generation defaults; shared DTO types compile and are importable by the UI.

## 8. Verification
1. `curl -XPOST /api/generate -d '{"topic":"World Cup 2026"}'` → returns an id; a run starts (Inngest dashboard).
2. Poll `GET /api/posts/<id>` repeatedly during the run → status/stages/subProgress change.
3. `GET /api/posts?search=world&status=done&page=1` → filtered page.
4. `GET /api/posters/<posterImageId>` → image bytes + correct content-type; unknown id → 404.
5. `DELETE /api/posts/<id>` → post gone; poster id no longer resolves.
6. `PUT /api/settings {tone:"witty"}` then `GET` → returns it.

## 9. Dependencies & sequencing
`depends_on: [T02, T05]`. `blocks: [T10, T11, T12, T13, T15, T18, T19]`. Wave 5 (alone). Lock response shapes here so UI tasks can be built in parallel.

## 10. Risks & open questions
- Ensure `DELETE` also removes GridFS bytes (avoid orphans).
- Add poster cache headers/ETag for perf.
- Rate-limit/dedupe is layered onto `generate` by T19 — keep the handler composable.
