---
id: T15
title: Settings — integration status/test-connection, defaults & danger zone
status: blocked
wave: 6
depends_on: [T03, T06, T08]
blocks: [T16]
owner: unassigned
verify: screen
---

# T15 — Settings

## 1. Objective
Build the Settings screen: profile/account, integration **status + test-connection** (env-only keys, no entry), generation **defaults** that feed New Post, and a danger zone. Completes the runtime/user-facing half of the env/secrets concern.

## 2. Background & context
Locked decision: **API keys are env-only** — the UI shows integration status + a test-connection button, and never accepts or echoes keys. Defaults persist via `GET/PUT /api/settings` (T06) and feed T10. Test-connection probes providers server-side via the T02/T03 libs/tools.

## 3. Scope
**In scope:** Settings screen (profile, integrations status/test, defaults, danger zone), test-connection route(s).
**Out of scope:** entering/storing API keys; real auth/account backend (single-tenant stub).

## 4. Requirements — step-by-step spec
1. `src/app/(app)/settings/page.tsx` with sections:
   - **Profile/account** (static, cosmetic).
   - **Integrations:** OpenRouter, Serper, image provider, MongoDB shown as **status + a test-connection button**. **No key input fields.**
   - **Defaults:** default model, image provider, tone, length → persisted via `PUT /api/settings`.
   - **Danger zone:** e.g. delete-all-posts, with explicit confirmation.
2. `src/app/api/settings/test/route.ts`: server-side probe per provider using T02/T03 libs/tools (a tiny OpenRouter completion, a Serper ping, an image no-op/dry check, a Mongo ping). Return `{ provider, ok, message }` — **never echo stored secrets**.
3. Saved/error/validation states across fields; danger-zone actions confirm before executing.

## 5. Files to create / modify
- `post-forge/src/app/(app)/settings/page.tsx`
- `post-forge/src/app/api/settings/test/route.ts`
- (uses) `post-forge/src/lib/env.ts`, T02/T03 libs

## 6. Interfaces & contracts
- Consumes/produces the settings DTO (T06). Test-connection returns per-provider `{ok,message}`.

## 7. Acceptance criteria — Definition of Done
- [ ] Test-connection returns clear success/error per provider (OpenRouter, Serper, image, Mongo) using the real libs/tools and never echoes stored secrets.
- [ ] Defaults persist and are consumed by the New Post screen.
- [ ] Danger-zone actions confirm before executing; validation/saved/error states are shown.
- [ ] Responsive and AA. No key-entry fields exist anywhere.

## 8. Verification
1. Open Settings → integrations show status; click test-connection per provider → success with valid env, clear error when a key is unset.
2. Change defaults (e.g. tone) → save → open New Post → controls prefill with the new default.
3. Trigger a danger-zone action → confirmation required; on confirm, it executes.

**Screen verification:** launch the app; screenshot `/settings` — integration status + test-connection results (success + error), defaults, and a danger-zone confirmation; confirm no key-entry fields exist.

## 9. Dependencies & sequencing
`depends_on: [T03, T06, T08]`. `blocks: [T16]`. Wave 6, in parallel with the other data screens.

## 10. Risks & open questions
- Exact danger-zone actions (delete all posts? reset settings?) — confirm.
- Rate-limit the test-connection route to avoid provider spam.
