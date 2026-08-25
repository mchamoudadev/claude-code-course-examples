---
id: T05
title: "Durable orchestration: generatePost, per-stage persistence, telemetry, retries & failure"
status: blocked
wave: 4
depends_on: [T02, T04]
blocks: [T06, T11, T14, T18]
owner: unassigned
verify: command
---

# T05 — Durable orchestration

## 1. Objective
Wrap the agent network in a durable Inngest function so every model/tool call is a retryable, observable step; persist per-stage progress, **sub-progress artifacts**, and **telemetry** to Mongo so the UI can poll live; and handle retries plus terminal failure (`status:"failed"` + error, partial stages intact). This owns the `post/generate.requested` event contract.

## 2. Background & context
Runs `buildNetwork(options).run(topic)` from T04, persists via the T02 repository. The post doc is **created by `POST /api/generate` (T06)** with `runId` + options; this function only **updates** it. Consumed live by the pipeline hero (T11) and reused by cron (T14). Backend half of the retries/failure + observability cross-cutting concern.

## 3. Scope
**In scope:** `inngest/functions.ts` (`generatePost`), incremental persistence, sub-progress, telemetry, retry/failure handling, step instrumentation, serve-handler registration.
**Out of scope:** creating the doc / minting runId (T06); the UI (T11); cron scheduling (T14).

## 4. Requirements — step-by-step spec
1. `src/inngest/functions.ts`: `export const generatePost = inngest.createFunction({ id: "generate-post", retries: N }, { event: "post/generate.requested" }, async ({ event, step }) => {...})`. Event payload: `{ postId, runId, topic, options }`.
2. Load the post doc (created by T06). Build the network with `options` (`buildNetwork(options)`), seeding `state.data` with `{ runId, options, postId }`.
3. Run the network. Instrument so **each agent/tool call is a named, inspectable Inngest `step.run(...)`** (durable + retryable). Prefer running the network with an `onStep`/lifecycle hook (or per-stage `step.run`) so stages map to steps.
4. **Per-stage persistence:** as each agent completes, update `posts.status` (`researching → verifying → … → publishing → done`) and the corresponding `stages[stage]` `{state,startedAt,endedAt}` via the repository — written **incrementally** so a poller sees intermediate states.
5. **Sub-progress artifacts:** append `subProgress` entries during a stage (Research: search queries + sources found; Verify: per-claim ✓/✗; Writer/Editor: partial text chunks; Illustrator: "poster-ready"; Publisher: "saved") so T11 can reveal live detail (polling; no token streaming).
6. **Telemetry:** capture tokens per agent (from model usage) and per-stage timings; persist via `recordTelemetry`. Feeds the stats endpoint (T06) + dashboard (T13).
7. **Retries/failure:** configure step retries with backoff. On unrecoverable error, set `status:"failed"` + structured `error {stage,message}` and mark the failing stage `failed`, preserving partial state. Idempotency: keyed on `runId` so retries don't duplicate work or docs.
8. Register `generatePost` in the `serve({ functions: [generatePost] })` handler (T01 route).

## 5. Files to create / modify
- `post-forge/src/inngest/functions.ts` — `generatePost`
- `post-forge/src/app/api/inngest/route.ts` — add `generatePost` to functions
- (uses) `post-forge/src/agents/network.ts`, `post-forge/src/lib/posts-repo.ts`

## 6. Interfaces & contracts
- **Event `post/generate.requested`** `{ postId, runId, topic, options }` — produced by T06 and T14, consumed here.
- Writes the `Post` doc's `status`/`stages`/`subProgress`/`telemetry`/`sources`/`finalPost`/`posterImageId`/`error` — the shape T11/T12/T13 read.

## 7. Acceptance criteria — Definition of Done
- [ ] The Inngest dev server discovers `generatePost`; emitting the event runs it to completion with the doc advancing `researching → … → done` and `finalPost`/`sources`/`posterImageId` populated.
- [ ] Progress is written **incrementally** — a poller observes intermediate statuses and `subProgress`, not just the final state.
- [ ] Injecting a failing tool (bad `SERPER_API_KEY`) triggers retries, then the doc goes `status:"failed"` with populated `error` and partial stages intact; transient errors recover without duplicate docs.
- [ ] Each agent/tool call appears as a discrete named durable step in the Inngest dashboard.
- [ ] `telemetry.tokensByAgent` and `timingsByStage` are populated.

## 8. Verification
1. With T06 stubbed or by inserting a doc + emitting the event manually, run `npx inngest-cli dev`; trigger and watch the run advance step-by-step in the dashboard.
2. Poll `getPostById` during the run → observe intermediate `status`/`stages`/`subProgress`.
3. Break `SERPER_API_KEY` → observe retries then `status:"failed"` + `error`; restore → a fresh run completes.
4. Confirm telemetry fields populated on a completed doc.

## 9. Dependencies & sequencing
`depends_on: [T02, T04]`. `blocks: [T06, T11, T14, T18]`. Wave 4 (alone).

## 10. Risks & open questions
- Mapping AgentKit's run lifecycle to Inngest steps — confirm the hook/step granularity that yields per-stage durability.
- Decide which stage failures are terminal vs retryable.
- Keep sub-progress writes bounded (don't write on every token).
