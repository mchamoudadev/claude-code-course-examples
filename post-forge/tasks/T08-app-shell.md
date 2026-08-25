---
id: T08
title: App shell, navigation & global states
status: blocked
wave: 2
depends_on: [T07]
blocks: [T10, T11, T13, T14, T15]
owner: unassigned
verify: screen
---

# T08 — App shell, navigation & global states

## 1. Objective
Build the persistent app frame (topbar + sidebar + mobile nav) and the reusable global states plus route-level error/not-found pages, all on the design system, so every screen only composes. Single-tenant (no auth gating).

## 2. Background & context
Composes T07's design system. Owns the UI half of the global empty/error/toast/skeleton cross-cutting concern. All authed screen tasks (T10–T15) mount inside this shell. Auth is a cosmetic stub (T09) — the shell does **not** gate on a session.

## 3. Scope
**In scope:** app shell layout, sidebar/topbar/mobile nav, toast provider, error boundary, 404/500 pages, reusable empty + skeleton states.
**Out of scope:** the screens themselves; real authentication/sessions.

## 4. Requirements — step-by-step spec
1. `src/app/(app)/layout.tsx`: render the shell around all authed routes and mount the **toast provider** + an **error boundary**.
2. **Topbar:** logo, global **New Post** primary CTA, a search field (wired to `/api/posts` search or navigates to Library with a query), avatar/menu (cosmetic).
3. **Sidebar:** links to Dashboard, New Post, Library, Scheduled, Settings, with active-route highlighting; collapsed/mobile nav (drawer) with accessible toggles.
4. **Global states** (in `src/components`): `EmptyState`, `ErrorState`, `Toast`/`ToastProvider` (success/error/info), `Skeleton` loaders — consumable by all data screens.
5. `src/app/not-found.tsx` (on-brand 404) and `src/app/error.tsx` (friendly 500 / agent-failure boundary that catches thrown errors).

## 5. Files to create / modify
- `post-forge/src/app/(app)/layout.tsx`
- `post-forge/src/app/not-found.tsx`, `post-forge/src/app/error.tsx`
- `post-forge/src/components/{EmptyState,ErrorState,Toast,Skeleton,AppShell,Sidebar,Topbar}.tsx`

## 6. Interfaces & contracts
- `ToastProvider` + a `useToast()` hook — the contract every screen uses for notifications.
- `EmptyState`/`Skeleton`/`ErrorState` props — reused by T10–T15.

## 7. Acceptance criteria — Definition of Done
- [ ] The shell renders on every authed route, is fully keyboard navigable, and collapses correctly at tablet/mobile with accessible toggles.
- [ ] The toast provider surfaces success/error/info app-wide; the error boundary catches thrown errors and shows the 500/agent-failure page.
- [ ] 404 and 500 pages render on-brand; empty + skeleton primitives are reusable by data screens.
- [ ] All states are light-theme, AA-contrast.

## 8. Verification
1. Navigate all sidebar routes (placeholder pages) → active highlight + shell persist; resize to mobile → drawer nav works via keyboard.
2. Trigger `useToast()` from a test button → success/error/info toasts appear.
3. Throw in a child component → `error.tsx` renders; visit a bad URL → `not-found.tsx` renders.

**Screen verification:** launch the app; screenshot the shell on a route at desktop + mobile, plus a triggered toast, the 404, and the 500 / agent-failure page — confirm each matches the design.

## 9. Dependencies & sequencing
`depends_on: [T07]`. `blocks: [T10, T11, T13, T14, T15]`. Wave 2, in parallel with T03/T09.

## 10. Risks & open questions
- Global search scope/behavior (live vs navigate-to-library) — confirm.
- Nav active-state rules and exact tablet/mobile breakpoints from the design.
