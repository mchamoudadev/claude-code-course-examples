---
id: T07
title: Design system — import PostForge.dc.html via claude_design MCP
status: blocked
wave: 1
depends_on: [T01]
blocks: [T08, T09]
owner: unassigned
verify: screen
---

# T07 — Design system (import via claude_design MCP)

## 1. Objective
Import the finished PostForge design from the Claude Design project through the **claude_design MCP** and materialize it as the app's reusable, **light-theme** design system: tokens plus the full component library and the signature pipeline/citation primitives that every screen composes from. **Mandatory design-system task.**

## 2. Background & context
The design brief is `../DESIGN_PROMPT.md`; the finished design is `PostForge.dc.html` in a Claude Design project. It is imported via the MCP (`DesignSync` / `/design-login`) — **NOT** a file on disk. Depends only on the scaffold (T01), so it runs fully parallel to the backend track. Every UI screen depends on it (via T08 for authed screens, directly for T09/T11).

## 3. Scope
**In scope:** MCP import, design tokens, component library, signature primitives (timeline node + citation chip), accessibility + reduced-motion baked in, a component gallery.
**Out of scope:** any screen assembly (T08/T09/T10–T15); data wiring.

## 4. Requirements — step-by-step spec
1. Run `/design-login`; use `DesignSync` (`list_projects` → `get_file`/`list_files`) to import `PostForge.dc.html` from the Claude Design project and reconcile it into the codebase (do not wholesale-replace; port incrementally into React/Tailwind).
2. **Tokens** in the Tailwind theme + `globals.css`: neutral scale; one primary brand accent; semantic colors (success/warning/error/info); **6 per-agent/stage accents** (Research/Verify/Write/Edit/Illustrate/Publish); typography scale (UI sans + editorial face for article body + mono for URLs/model names); 8px spacing scale; radii; elevation/shadow scale; motion durations/easing.
3. **Core components** in `src/components`: buttons (variants/sizes/loading), inputs/textareas, the hero prompt/topic field, selects (model + image-provider pickers), tabs, cards, pills/badges (status + verified/unverified), toasts, modals/drawers, tooltips, avatars, empty-state block, skeleton loaders, pagination/filters, form validation states.
4. **Signature primitives:** `AgentTimelineNode` (per-stage accent; states queued/active/done/failed) and `SourceCitationChip` (title + domain, clickable, verified indicator) — exported for T11 and T12.
5. Bake in **WCAG AA** contrast + visible focus states and **reduced-motion** variants for animated components. Light theme only (no dark mode).
6. Build a **component gallery** route/page rendering every primitive with the real tokens for review.
7. Write a short rationale for the accent choice, the pipeline visualization approach, and the article typography.

## 5. Files to create / modify
- `post-forge/src/app/globals.css` — token layer
- `post-forge/tailwind.config` (theme extension) — tokens
- `post-forge/src/components/**` — component library + `AgentTimelineNode`, `SourceCitationChip`
- `post-forge/src/app/layout.tsx` — fonts + base styles
- A gallery page (e.g. `src/app/(app)/_gallery/page.tsx` or a dev-only route)

## 6. Interfaces & contracts
- Exported components + token names are the contract every UI task composes from.
- The 6 per-agent accent tokens + `AgentTimelineNode` + `SourceCitationChip` are consumed by T11/T12.

## 7. Acceptance criteria — Definition of Done
- [ ] `PostForge.dc.html` is imported via the claude_design MCP and its tokens/components are reflected in a rendered component gallery using the **real tokens**.
- [ ] Every component in the design brief exists, is typed, light-theme only, reusable, and meets WCAG AA contrast with visible focus states.
- [ ] The six per-agent accent tokens plus the timeline-node and citation-chip primitives are available for downstream screens.
- [ ] The component gallery renders all primitives without errors; reduced-motion path defined for animated components.

## 8. Verification
1. `/design-login` succeeds; `DesignSync list_projects` shows the project; import the file.
2. Run the app, open the gallery page → every primitive renders with the imported tokens.
3. Toggle OS "reduce motion" → animated primitives fall back gracefully.
4. Run an accessibility check (axe/lighthouse) on the gallery → AA contrast + focus pass.

**Screen verification:** launch the app and open the component gallery in the browser (Claude-in-Chrome); screenshot it and confirm every primitive renders with the imported cloud-design tokens (light theme, AA) at desktop + mobile.

## 9. Dependencies & sequencing
`depends_on: [T01]`. `blocks: [T08, T09]`. Wave 1, in parallel with the entire backend track (T02+).

## 10. Risks & open questions
- Confirm `PostForge.dc.html` exists in the Claude Design project and matches `DESIGN_PROMPT.md`.
- Decide how MCP-imported markup becomes React/Tailwind (hand-port vs codegen) and the token-naming contract shared with the Tailwind theme.
- Editorial-serif + mono font loading/licensing; icon-set source.
