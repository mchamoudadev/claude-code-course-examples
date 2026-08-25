---
id: T19
title: Rate-limit + dedupe guard on /api/generate
status: blocked
wave: 6
depends_on: [T06]
blocks: [T16]
owner: unassigned
verify: mixed
---

# T19 — Rate-limit + dedupe guard on /api/generate

## 1. Objective
Protect generation cost/concurrency and enforce duplicate-topic dedupe using prior posts (the "memory"), so runs don't stack up or needlessly repeat.

## 2. Background & context
Every generation spends money across OpenRouter + Serper + the image provider. Layers onto `POST /api/generate` (T06). PLAN emphasizes memory/dedupe of prior topics; this enforces it at submit time (Inngest step retries are not request-level rate limiting).

## 3. Scope
**In scope:** a concurrency/quota cap + duplicate-topic dedupe on `generate`, surfaced in the UI.
**Out of scope:** per-user quotas (single-tenant); the generation pipeline itself.

## 4. Requirements — step-by-step spec
1. On `POST /api/generate`, before creating a doc:
   - **Concurrency/quota cap:** limit in-flight runs (count docs with non-terminal status) to a configurable max; if exceeded, return a clear `429`-style response with a message.
   - **Dedupe:** normalize the topic and check recent posts; if an identical/near-identical topic is `done` or in-flight within a window, return a "already generated / in progress" response referencing the existing post id (configurable: block vs allow-force).
2. Make thresholds configurable via env (e.g. `MAX_INFLIGHT_RUNS`, `DEDUPE_WINDOW_HOURS`).
3. Surface the blocked/deduped response in the New Post UI (T10) as a message (with a link to the existing post when deduped).

## 5. Files to create / modify
- `post-forge/src/app/api/generate/route.ts` — guard layer
- `post-forge/src/lib/env.ts` — new config vars
- (coordinates with) `post-forge/src/app/(app)/new/page.tsx` (T10) for messaging

## 6. Interfaces & contracts
- Extends the `generate` response with a blocked/deduped shape `{ blocked: true, reason, existingPostId? }` consumed by T10.

## 7. Acceptance criteria — Definition of Done
- [ ] Rapid repeat submits are throttled/deduped with a clear message.
- [ ] A genuinely new topic proceeds normally.
- [ ] Limits/window are configurable via env.

## 8. Verification
1. Submit the same topic twice quickly → second is deduped with a link to the first.
2. Start several runs beyond the cap → further submits are throttled with a message.
3. Submit a distinct new topic → proceeds.
4. Change `MAX_INFLIGHT_RUNS`/`DEDUPE_WINDOW_HOURS` → behavior changes accordingly.

**Screen verification:** launch the app; screenshot the New Post screen showing the throttled/deduped message (with the link to the existing post) after a rapid repeat submit.

## 9. Dependencies & sequencing
`depends_on: [T06]`. `blocks: [T16]`. Wave 6, in parallel with the UI screens. Coordinate the response shape with T10.

## 10. Risks & open questions
- Topic normalization strategy for dedupe (casing, punctuation, near-duplicates).
- Whether dedupe blocks hard or allows a "generate anyway" override.
