---
id: T11
title: Generation-in-progress pipeline showcase (hero) + live polling
status: blocked
wave: 6
depends_on: [T05, T06, T08]
blocks: [T12, T16]
owner: unassigned
verify: screen
---

# T11 — Pipeline showcase (hero) + live polling

## 1. Objective
Build the product centerpiece: the live 6-stage pipeline view that polls post state and reveals per-agent detail from persisted sub-progress, with per-stage accents, elapsed times, failed/retry and completion states. Also de-risks the live-progress polling integration. **Invest the most polish here.**

## 2. Background & context
Consumes T05's per-stage state + `subProgress` (via `GET /api/posts/[id]`, T06) and T07's `AgentTimelineNode`/`SourceCitationChip` (via T08 shell). "Streaming" = **reveal-on-stage-update via polling**, not token streaming (locked decision). Owns the `posts/[id]` route shell + status branching; T12 adds the done-state article.

## 3. Scope
**In scope:** the in-progress view, stepper, active-agent detail panel, timers, failed/completion states, the polling hook.
**Out of scope:** the finished-article rendering (T12 — done-state branch); orchestration internals (T05).

## 4. Requirements — step-by-step spec
1. `src/app/(app)/posts/[id]/page.tsx` (in-progress branch): a **6-stage stepper** — horizontal on desktop, vertical on mobile — each stage using `AgentTimelineNode` with icon + per-stage accent + status (queued/active/done/failed).
2. **Active-agent emphasis** (pulse/glow/motion) + a **streaming detail panel** fed by `subProgress`: Research (search queries + sources found), Verify (per-claim ✓/✗), Writer/Editor (partial text), Illustrator (poster render-in), Publisher (save confirm).
3. **Timers:** per-stage + overall elapsed (from server timestamps in `stages`). Completed stages shown as expandable/collapsed summaries.
4. **Failed/retry** state with clear messaging matching the failed doc; **completion** state (celebratory-but-tasteful) with a CTA to the finished post.
5. **Polling hook** (`usePostPolling(id)`): fetch `GET /api/posts/[id]` on an interval (e.g. 1.5–2s), **stop on terminal** (`done`/`failed`), handle navigate-away/return mid-run; reduced-motion fallback.
6. Branch on `status`: while not `done`, render the pipeline; when `done`, hand off to the T12 `PostView`.

## 5. Files to create / modify
- `post-forge/src/app/(app)/posts/[id]/page.tsx` — route shell + in-progress branch
- `post-forge/src/hooks/usePostPolling.ts`
- `post-forge/src/components/**` (pipeline stepper, detail panel)

## 6. Interfaces & contracts
- Consumes the `GET /api/posts/[id]` poll DTO (T06) and `AgentTimelineNode` (T07).
- Owns the shared `posts/[id]` route; T12 renders inside its `done` branch.

## 7. Acceptance criteria — Definition of Done
- [ ] The view polls and advances stages live (queued→active→done), with the active stage emphasized via motion and streaming detail.
- [ ] A failed stage shows the retry indicator and error messaging matching the failed doc state; polling stops once status is `done` or `failed`.
- [ ] Completion shows a CTA to the finished post.
- [ ] Per-agent accent colors match the design system; responsive, AA, with a reduced-motion alternative.

## 8. Verification
1. From `/new`, submit a topic → land on `/posts/[id]`; watch all six stages advance live with detail from sub-progress.
2. Force a failure (bad key via T05 path) → failed stage + error shown; polling stops.
3. Let a run complete → completion state + CTA; click → finished post (T12).
4. Enable reduce-motion → animations fall back; navigate away and back mid-run → state resumes from polling.

**Screen verification:** launch the app, start a run, and screenshot `/posts/[id]` during the live pipeline (active stage emphasized), plus the failed state and the completion state; verify per-stage accents, responsiveness, and reduced-motion.

## 9. Dependencies & sequencing
`depends_on: [T05, T06, T08]`. `blocks: [T12, T16]`. Wave 6, in parallel with T10/T13/T14/T15/T18/T19.

## 10. Risks & open questions
- Transport reality: polling cannot stream tokens — define "streaming" as reveal-on-update (done). SSE/Realtime is a later upgrade.
- Elapsed-timer source: prefer server timestamps to avoid client drift.
- Map `subProgress` entries cleanly to each agent's panel.
