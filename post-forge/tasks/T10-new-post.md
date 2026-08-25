---
id: T10
title: New Post screen + generation trigger flow
status: blocked
wave: 6
depends_on: [T06, T08]
blocks: [T16]
owner: unassigned
verify: screen
---

# T10 — New Post screen + generation trigger flow

## 1. Objective
Build the focused, hero-grade topic-input experience with advanced generation options and wire it to trigger the pipeline and route into the live showcase.

## 2. Background & context
Composes the T07/T08 design + shell; calls `POST /api/generate` (T06) and reads defaults from `GET /api/settings` (T06). Navigates into the pipeline showcase (T11) via `/posts/[id]`.

## 3. Scope
**In scope:** the New Post page, advanced options, validation, submit + navigation, settings-defaults prefill.
**Out of scope:** the pipeline view itself (T11); the generate route internals (T06).

## 4. Requirements — step-by-step spec
1. `src/app/(app)/new/page.tsx`: large hero prompt field + helper/suggested topics.
2. **Advanced controls:** model (OpenRouter slug), image provider (Nano Banana vs GPT Image), post tone, post length — using the design-system selects. Options shape matches `GenerationOptions` (T02) + the generate DTO (T06).
3. **Prefill** advanced controls from `GET /api/settings` defaults when present.
4. Inline validation (block empty/too-short topic). Clear **Generate** primary action.
5. On submit: `POST /api/generate` with `{ topic, options }`, show a button loading state, then `router.push('/posts/' + id)`. Handle enqueue failure with a toast.
6. Respect T19's rate-limit/dedupe response (show the returned message if blocked/deduped).

## 5. Files to create / modify
- `post-forge/src/app/(app)/new/page.tsx`
- `post-forge/src/components/**` (prompt field, options controls)

## 6. Interfaces & contracts
- Consumes generate DTO + settings DTO (T06). Produces navigation to `/posts/[id]`.

## 7. Acceptance criteria — Definition of Done
- [ ] Submitting a valid topic calls `/api/generate` with the selected options and routes to `/posts/[id]`.
- [ ] Empty/invalid topic is blocked with inline validation; the Generate button shows a loading state during submission.
- [ ] Advanced options are carried into the request and honored by the pipeline; defaults from Settings prefill controls when present.
- [ ] Responsive and AA-accessible.

## 8. Verification
1. Open `/new` → controls prefill from settings; suggested topics render.
2. Submit empty → blocked with validation; submit a valid topic → button loading → lands on `/posts/[id]` and a run starts.
3. Change model/tone/length → confirm they reach the request (network tab) and affect output.

**Screen verification:** launch the app; screenshot `/new` in default, inline-validation, and button-loading states; confirm the advanced controls + prefilled defaults render per the design.

## 9. Dependencies & sequencing
`depends_on: [T06, T08]`. `blocks: [T16]`. Wave 6, in parallel with T11/T13/T14/T15/T18/T19.

## 10. Risks & open questions
- Source of the OpenRouter model list + tone/length enums (share with T06 validation).
- Suggested-topics source (static list vs trending).
