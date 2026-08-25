---
id: T12
title: Post detail (finished-article view)
status: blocked
wave: 7
depends_on: [T06, T11]
blocks: [T16]
owner: unassigned
verify: screen
---

# T12 — Post detail (finished-article view)

## 1. Objective
Render the finished deliverable like a real article — title, poster, editorial body, cited sources with per-claim verification, metadata, and actions — as the **done-state branch** of the `posts/[id]` route.

## 2. Background & context
Renders when `status === "done"` inside the shared `posts/[id]` route owned by T11 (avoids a file conflict). Consumes T06 posts/posters APIs and T07's `SourceCitationChip` + editorial typography.

## 3. Scope
**In scope:** the `PostView` finished-article component, sources + verification, actions, skeleton + not-found.
**Out of scope:** the in-progress pipeline (T11); API internals (T06).

## 4. Requirements — step-by-step spec
1. `PostView` (rendered by `posts/[id]/page.tsx` when `done`): title, hero **poster** via `/api/posters/[id]`, body in **editorial typography**.
2. **Sources** section: `SourceCitationChip` per source (title + domain, clickable) with a **per-claim verified indicator** — map `verifiedFindings` to the body claims to show which are verified.
3. **Metadata:** model used, generation time, timestamps.
4. **Actions:** copy (markdown/plain), download poster (filename), regenerate (define: new run/doc), delete (with GridFS cleanup via `DELETE /api/posts/[id]`).
5. **States:** loading skeleton; not-found (disambiguated from still-generating — if the doc exists but isn't done, defer to T11's pipeline view).

## 5. Files to create / modify
- `post-forge/src/app/(app)/posts/[id]/page.tsx` — done-state branch (+ `PostView`)
- `post-forge/src/components/PostView.tsx`
- (uses) `post-forge/src/app/api/posters/[id]/route.ts`

## 6. Interfaces & contracts
- Consumes the `done` `PostDetail` DTO (T06) + poster route. Renders inside T11's route branch.

## 7. Acceptance criteria — Definition of Done
- [ ] A completed post renders body + poster + clickable sources with per-claim verification badges.
- [ ] Copy, download poster, regenerate, and delete all work.
- [ ] Skeleton shows while loading; an unknown id shows the not-found state; a not-yet-done id shows the pipeline (T11), not not-found.
- [ ] Responsive and AA-accessible.

## 8. Verification
1. Open a completed post → article + poster + sources with verified/unverified badges.
2. Copy → clipboard has the post; download poster → file saves; delete → post removed + poster id no longer resolves.
3. Regenerate → a new run starts per the defined semantics.
4. Open an unknown id → not-found; open an in-progress id → pipeline view.

**Screen verification:** launch the app; screenshot `/posts/[id]` for a completed post — article body, poster, and sources with per-claim verification badges — plus the skeleton and not-found states.

## 9. Dependencies & sequencing
`depends_on: [T06, T11]`. `blocks: [T16]`. Wave 7 (serialized behind T11 due to the shared route).

## 10. Risks & open questions
- Regenerate semantics: new doc vs overwrite, and navigation target — confirm.
- Mapping `verifiedFindings` to inline body claims for badges.
- Copy target format (markdown vs plain).
