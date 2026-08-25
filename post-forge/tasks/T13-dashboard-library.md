---
id: T13
title: Dashboard/home + Library (browse & analytics)
status: blocked
wave: 6
depends_on: [T06, T08]
blocks: [T16]
owner: unassigned
verify: screen
---

# T13 — Dashboard/home + Library (browse & analytics)

## 1. Objective
Build the two post-browsing surfaces: the dashboard/home overview with lightweight analytics, and the searchable/filterable library of past posts.

## 2. Background & context
Composes T07/T08; reads `GET /api/posts` (list) + the stats endpoint (T06). Analytics data comes from telemetry recorded in T05. Follow the **dataviz** skill so charts read as one system.

## 3. Scope
**In scope:** dashboard (overview + analytics + empty state), library (grid/list + search/filter + empty + skeleton).
**Out of scope:** the stats computation (T06); post detail (T12).

## 4. Requirements — step-by-step spec
1. **Dashboard** `src/app/(app)/dashboard/page.tsx`: prominent start-new-post entry; recent posts; **analytics** — total posts, success vs failed, avg generation time, agent activity/tokens over time — as tasteful on-system charts (Recharts, dataviz palette). First-run **empty state** for new users.
2. **Library** `src/app/(app)/library/page.tsx`: searchable/filterable grid + list of past posts (poster thumbnail via poster route, title, topic, status, date); filters by status/date; topic search; card/list view toggle; empty state; skeleton grid.
3. Wire both to `/api/posts` (search/filter/pagination) + stats endpoint; clicking an item navigates to `/posts/[id]`.

## 5. Files to create / modify
- `post-forge/src/app/(app)/dashboard/page.tsx`
- `post-forge/src/app/(app)/library/page.tsx`
- `post-forge/src/components/**` (charts, post cards, filters)

## 6. Interfaces & contracts
- Consumes list DTO + stats DTO (T06). Uses poster route for thumbnails.

## 7. Acceptance criteria — Definition of Done
- [ ] Dashboard reads the stats endpoint + recent posts and renders charts consistent with the design system; the first-run empty state shows for new users.
- [ ] Library search + status/date filters query `/api/posts` and update results; the card/list toggle works.
- [ ] Skeletons render while loading; clicking any item navigates to the correct post detail.
- [ ] Both screens are responsive and AA.

## 8. Verification
1. With seeded data (T17), open the dashboard → charts + recent posts render; wipe data → empty state.
2. Open the library → search a topic, filter by `done`/`failed`, toggle card/list → results update; click an item → detail.
3. Throttle network → skeletons show.

**Screen verification:** with seed data, launch the app; screenshot `/dashboard` (charts + recent) and `/library` (grid + list), plus their empty states and a loading skeleton.

## 9. Dependencies & sequencing
`depends_on: [T06, T08]`. `blocks: [T16]`. Wave 6, in parallel with the other data screens. Benefits from T17 seed data for meaningful analytics.

## 10. Risks & open questions
- Specific metrics + their data sources depend on telemetry (T05) — keep charts resilient to missing fields.
- Time-range controls + recent-posts count.
