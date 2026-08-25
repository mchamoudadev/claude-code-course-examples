# Design Brief / Prompt — PostForge

> Paste this whole document to the designer agent. It is the single source of truth for the end-to-end design. Design **every screen, state, and component** described here — do not stop at a subset.

---

## 1. Your task

You are the product designer for **PostForge**, a web app that turns a single topic into a fully-researched, verified, illustrated, and published post using a network of autonomous AI agents. Design the **complete, end-to-end system**: a cohesive design system plus every screen, in every meaningful state (default, loading, empty, error, success), fully responsive (desktop-first, but define tablet + mobile), and accessible (WCAG AA).

Deliver a single, consistent design language — nothing half-finished. If a screen implies a component, design that component.

## 2. Product in one paragraph

A user types a topic (e.g. "World Cup 2026"). PostForge runs a **6-agent pipeline** end-to-end and fully autonomously: **Research → Verify → Write → Edit → Illustrate → Publish**. Research searches the web, Verify fact-checks each claim, Writer drafts the post, Editor polishes it, Illustrator generates a poster image, Publisher saves the finished piece. The user watches the agents work live, then reads the finished post with its poster and cited sources. Past posts form a searchable library. Power users can schedule automatic posts and manage settings.

**Users:** solo creators, marketers, and developers who want on-demand, sourced content without doing the research themselves. Tone should feel trustworthy (it cites sources and verifies facts) and cutting-edge (multi-agent AI).

## 3. Design direction

- **Aesthetic:** Modern, clean, minimal SaaS — think Linear / Vercel / Notion. Generous whitespace, crisp typography, restrained palette, purposeful subtle motion. Product-y and professional, never cluttered.
- **Theme:** **Light only.** Do not design a dark mode. Make the single light theme excellent — get contrast, elevation, and hierarchy right without relying on dark surfaces.
- **Signature move:** The **live multi-agent pipeline is the hero of the product.** It must feel alive and impressive — the emotional payoff is watching AI agents collaborate in real time. Invest your best design energy here.
- **Principles:** (1) Clarity over decoration. (2) Trust through transparency — always show sources, verification status, and what each agent did. (3) Motion communicates progress, never distracts. (4) One consistent system across all screens.

## 4. Design system to define

Produce a documented design system, then apply it everywhere.

- **Color (light):** a neutral gray scale (background, surface, border, muted text, primary text), one **primary brand accent** (pick a confident, modern hue — e.g. an electric indigo/blue or a fresh green; choose and justify one), plus **semantic colors**: success, warning, error, info. Define per-agent/stage accent colors (6 distinct but harmonious hues for Research/Verify/Write/Edit/Illustrate/Publish) used consistently in the pipeline. Ensure AA contrast for all text.
- **Typography:** a modern sans (e.g. Inter/Geist-like) for UI; optionally a slightly editorial serif or distinct display face for the rendered post content to make finished posts feel like real articles. Define a type scale (display, h1–h4, body, small, mono/caption) with weights and line-heights. A monospace face for source URLs, model names, and technical labels.
- **Spacing & layout:** an 8px spacing scale, max content widths, a grid, and consistent gutters.
- **Radius, elevation, borders:** define corner radii (cards, inputs, buttons, pills), a soft shadow scale for elevation, and hairline border treatment.
- **Iconography:** a single clean line-icon set; define per-agent icons (search/magnifier, shield-check, pencil, sparkle-edit, image, send/publish).
- **Motion:** define durations/easing for state transitions, the pipeline "activation" animation, skeleton shimmer, and micro-interactions (hover, press, success checkmarks).

## 5. Component library to design

Buttons (primary/secondary/ghost/destructive + sizes + loading state), inputs & textareas, the topic **search/prompt field** (prominent, hero-grade), select/dropdown (model + image-provider pickers), tabs, cards, pills/badges (status: researching/verifying/…/done/failed; verified/unverified), toasts/notifications, modals/drawers, tooltips, avatars, empty-state blocks, skeleton loaders, the **agent step/timeline node**, a **source citation chip**, pagination/filters, the top navigation + sidebar app shell, and forms with validation states.

## 6. Screens to design (full product surface)

Design each screen in its key states.

1. **Marketing landing page (public).** Hero that sells the multi-agent story (topic-in → finished post-out), an animated/illustrated preview of the agent pipeline, feature sections (autonomous research, fact-verification with sources, auto-generated poster, your library, scheduling), social-proof/section, pricing-style CTA, footer. This is the first impression — make it striking but on-brand.

2. **Auth — Sign in & Sign up.** Clean, minimal, single-column card; email + social auth buttons; validation and error states; loading state.

3. **App shell.** Persistent top bar (logo, global "New Post" primary action, search, user avatar/menu) + left sidebar nav (Dashboard, New Post, Library, Scheduled, Settings). Define collapsed/mobile nav.

4. **Dashboard / Home.** Overview with: a prominent "Start a new post" entry, recent posts, and lightweight **analytics** (counts of posts generated, success vs failed runs, avg generation time, agent activity/tokens over time — use tasteful charts consistent with the system). Include empty state (first-time user, no posts yet).

5. **New Post / topic input.** A focused, hero-grade prompt experience: large topic field with helper examples/suggested topics, optional advanced controls (model via OpenRouter, image provider Nano Banana vs GPT Image, post length/tone). Clear primary "Generate" action. Show validation.

6. **★ Generation in progress — the AGENT PIPELINE SHOWCASE (hero screen).** This is the centerpiece. Design a live view of the 6 agents working:
   - A visual **pipeline** (horizontal stepper on desktop, vertical on mobile — or a subtle node graph) showing all six stages: **Research → Verify → Write → Edit → Illustrate → Publish**, each with its icon, per-stage accent color, and a live status (queued / active / done / failed).
   - The **active agent** is emphasized (pulse/glow/motion) with a streaming detail panel: what it's doing right now (e.g. Research showing search queries + sources found; Verify showing claims being checked ✓/✗; Writer/Editor streaming text; Illustrator showing the poster rendering in; Publisher confirming save).
   - Show elapsed time per stage and overall. Show completed stages as collapsed summaries you can expand.
   - Design the **error/failed** state (a stage fails, retry indicator, clear messaging) and the **completion** state (celebratory but tasteful, CTA to view the post).
   - This screen should make the user feel the intelligence and collaboration of the system. Make it memorable.

7. **Post detail.** The finished deliverable, presented like a real article: title, hero **poster image**, the post body (editorial typography), and a clearly separated **Sources** section with citation chips (title + domain, clickable), plus a **verification** indicator per claim/source. Secondary info: which model wrote it, generation metadata, timestamps. Actions: copy, download poster, regenerate, delete. Include loading skeleton and a not-found state.

8. **Library (past posts).** Searchable, filterable grid/list of previous posts (poster thumbnail, title, topic, status, date). Filters by status/date; search by topic. Card and list views. Include empty state and a loading skeleton grid.

9. **Scheduled / Cron management.** Manage automatic recurring posts: list of schedules (topic/theme, cadence, next run, last result), create/edit schedule form (topic or trending-theme source, frequency, model/image options), enable/disable toggles, run-now action. Empty state for no schedules.

10. **Settings.** Sections for: profile/account, **API keys / integrations** (OpenRouter, Serper, image provider, MongoDB — masked inputs with test-connection states), **defaults** (default model, default image provider, default post tone/length), and danger zone. Show saved/error/validation states.

11. **Global states.** Design reusable **empty states**, **error states** (including a friendly 500/agent-failure and 404), **toast notifications** (success/error/info), and **skeleton loaders** for each data-heavy screen.

## 7. Responsive & accessibility

- Define layouts at desktop (primary), tablet, and mobile for every screen; specify how the sidebar, pipeline, and library grids adapt.
- Meet WCAG AA: contrast, visible focus states, keyboard navigability, adequate touch targets, and reduced-motion alternatives for the pipeline animation.

## 8. Deliverables

1. A documented **design system** (color, type, spacing, radius, elevation, icons, motion, components) with usage notes.
2. **High-fidelity designs for all 11 screen groups** above, in their key states, responsive.
3. A short rationale for the key choices (accent color, the pipeline visualization approach, article typography).

Keep everything within one coherent, modern-minimal, light-theme system. The multi-agent pipeline is the star — make the whole product feel trustworthy, fast, and intelligent.
