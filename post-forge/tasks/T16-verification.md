---
id: T16
title: README/dev-setup & end-to-end verification
status: blocked
wave: 8
depends_on: [T09, T10, T11, T12, T13, T14, T15, T17, T18, T19]
blocks: []
owner: unassigned
verify: mixed
---

# T16 — README/dev-setup & end-to-end verification

## 1. Objective
Document developer setup and verify the whole product end-to-end across the pipeline, UI, persistence, failure path, cron, memory, and rate-limit — no new features. This is the final gate.

## 2. Background & context
Depends on every leaf task, which transitively cover the entire backend. Validates the integrated product surface last.

## 3. Scope
**In scope:** README + finalized `.env.example`, the executed E2E verification, a gaps/known-issues note.
**Out of scope:** production deployment (deferred); new features.

## 4. Requirements — step-by-step spec
1. **README:** architecture overview, env/secret setup, running Next.js + `npx inngest-cli dev` + MongoDB, provider keys, poster-provider switch, and the verification checklist; finalize `.env.example`.
2. **Execute end-to-end verification** and record results:
   - Submit a topic → watch the live pipeline advance in the UI **and** as durable steps in the Inngest dashboard.
   - Confirm the finished post + poster + cited sources render on `/posts/[id]`.
   - Mongo doc `status:"done"`; poster served from GridFS; sources + verification present.
   - **Failure path:** set a bad `SERPER_API_KEY` → Inngest retries → doc `status:"failed"` + UI error → restore key → a fresh run recovers.
   - **Memory:** a second topic appears in the library; dedupe (T19) behaves.
   - **Cron:** a scheduled run fires and produces a post.
   - **Rate-limit:** rapid repeat submits are throttled/deduped.
   - **Tests:** `npm run test` is green.
3. Write a note of any gaps/known issues surfaced.

## 5. Files to create / modify
- `post-forge/README.md`
- `post-forge/.env.example` (finalized)
- (references) `post-forge/src/inngest/functions.ts`

## 6. Interfaces & contracts
- No new interfaces — exercises the full integrated contract.

## 7. Acceptance criteria — Definition of Done
- [ ] A fresh developer can run the full stack from the README (env from `.env.example`, both dev servers, a successful generation) without missing steps.
- [ ] The documented happy-path E2E passes for a real topic, producing a `done` post with poster + verified sources, visible live in the UI and the Inngest dashboard.
- [ ] The failure path reproducibly yields Inngest retries then `status:"failed"` with the error surfaced in the UI, and recovers when the key is restored.
- [ ] A second post appears in the library (memory), a schedule/cron run is demonstrated, rate-limit/dedupe is observed, and `npm run test` is green.
- [ ] Every screen of the full product surface is reachable and functioning.

## 8. Verification
This task **is** the verification. Execute the checklist above against a running stack (Next dev + `inngest-cli dev` + Mongo, seeded via T17) and record pass/fail with notes for each item.

**Screen verification:** during the E2E run, capture browser screenshots of every screen (landing, auth, dashboard, new-post, live pipeline, post detail, library, scheduled, settings) as evidence, alongside the Inngest dashboard + Mongo checks.

## 9. Dependencies & sequencing
`depends_on: [T09, T10, T11, T12, T13, T14, T15, T17, T18, T19]`. `blocks: []`. Wave 8 (final).

## 10. Risks & open questions
- Deployment/production verification (INNGEST_*_KEY path) is out of scope for v1 — note it as a known gap.
- Some acceptance items require real provider keys; document which.
