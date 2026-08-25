---
id: T09
title: Public surface — marketing landing + auth (stub)
status: blocked
wave: 2
depends_on: [T07]
blocks: [T16]
owner: unassigned
verify: screen
---

# T09 — Public surface (landing + auth stub)

## 1. Objective
Build the unauthenticated surface on the design system: the marketing landing whose hero sells the multi-agent pipeline story, and sign-in / sign-up screens with **stubbed** submission that routes into the app.

## 2. Background & context
Composes T07. Public only — no app shell or API needed, so it runs in parallel with T08 and the data screens. **Auth is cosmetic** (locked decision): no real sessions, middleware, or user records.

## 3. Scope
**In scope:** marketing landing (`page.tsx`), sign-in + sign-up screens, responsive + accessible layouts.
**Out of scope:** real authentication/sessions/middleware; any per-user data.

## 4. Requirements — step-by-step spec
1. `src/app/page.tsx` — marketing landing:
   - Hero: topic-in → finished-post-out framing with a clear CTA into the app/auth.
   - **Animated pipeline preview** using the 6 per-agent accents (honor reduced-motion).
   - Feature sections: autonomous research, fact-verification with sources, auto-generated poster, your library, scheduling.
   - Social-proof section, pricing-style CTA, footer.
2. `src/app/(auth)/sign-in/page.tsx` and `sign-up/page.tsx`: single-column card, email + social auth buttons, validation/error/loading states. **Submit is stubbed** — it routes into the app (e.g. `/dashboard`) without creating a session.
3. Responsive (desktop/tablet/mobile) + AA accessibility throughout; add SEO/metadata for the landing.

## 5. Files to create / modify
- `post-forge/src/app/page.tsx` — landing
- `post-forge/src/app/(auth)/sign-in/page.tsx`, `post-forge/src/app/(auth)/sign-up/page.tsx`
- `post-forge/src/components/**` (landing sections, pipeline preview)

## 6. Interfaces & contracts
- Consumes only T07 components/tokens. No API contract (stub submit).

## 7. Acceptance criteria — Definition of Done
- [ ] Landing renders all sections responsively with the animated pipeline preview honoring reduced-motion, and a working CTA into the app/auth.
- [ ] Auth forms show validation, error, and loading states and are keyboard navigable; submit routes into the app (no real session).
- [ ] Both are light-theme, AA-contrast, and reuse the T07 design system.

## 8. Verification
1. Visit `/` → all sections render; resize across breakpoints; enable reduce-motion → preview degrades gracefully.
2. Visit `/sign-in` and `/sign-up` → validation on empty submit; loading state on submit; then redirect into the app.
3. Run a lighthouse pass → accessibility + basic SEO pass.

**Screen verification:** launch the app; screenshot `/`, `/sign-in`, `/sign-up` at desktop + mobile; toggle reduce-motion and re-screenshot the hero pipeline preview.

## 9. Dependencies & sequencing
`depends_on: [T07]`. `blocks: [T16]`. Wave 2, in parallel with T03/T08.

## 10. Risks & open questions
- Which social-auth providers to show (visual only).
- Landing pipeline-preview: static loop vs data-driven animation.
