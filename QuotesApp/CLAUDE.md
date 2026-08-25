# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A zero-dependency quotes keeper split across three sibling files — no build step, no package manager, no server, and no tests. Open `index.html` directly in a browser (it is designed to run from `file://`; the CSS and JS are loaded via relative paths, so keep all three files in the same directory) to use or verify changes. `quotes-app-plan.md` records the original design decisions and is the source of truth for product intent.

## Architecture

The app is three files in one directory:
- **`index.html`** — markup only. It `<link>`s `style.css` in the `<head>` and loads `script.js` via `<script src="script.js">` at the end of `<body>` (so the DOM exists when the script runs). Add new UI here; every interactive element is keyed by `id` or `data-*` attribute, not inline handlers.
- **`style.css`** — all styles, driven by CSS custom properties (design tokens in `:root`) — a bright, playful, colorful theme over a serif-forward reading surface. Reuse the tokens (`--ink`, `--accent`, `--accent-2/3/4`, `--grad`, `--paper`, etc.) rather than hardcoding colors. Tag and category chips are tinted per-label via an inline `--h` (hue) custom property set by the JS — the CSS derives `hsl(var(--h) …)` from it, so colors stay deterministic and stable.
- **`script.js`** — one IIFE (`"use strict"`) holding all logic, organized into commented sections: Data layer → Retrieval → Rendering → Spotlight → Form → Export/Import → Events → Toast → Boot.

Key design facts to preserve when editing:
- **Single source of truth**: the in-memory `quotes` array. Mutate it only through `addQuote` / `updateQuote` / `deleteQuote` / `toggleFavorite`, each of which calls `save()`. The separate `state` object holds transient UI state (search, tag, author, category, favoritesOnly, spotlightId) and is never persisted.
- **Quote shape**: `text` (required), `author`, `category`, `source`, `tags` (array), `page`, `note`, `favorite`, plus `id` and `dateAdded`. `author` and `category` are single-value, clickable filters; `tags` are multi-value. `category` also drives the `<datalist id="category-options">` autocomplete in the form, repopulated by `renderCategoryOptions()` on every `render()`.
- **Persistence**: `localStorage` under the versioned key `quotes.v1`. If you change the stored shape, bump the key and handle migration in `load()`. `normalize()` is the single gate that coerces any object (from storage or import) into a valid quote — every field default and type-cleanup belongs there.
- **Rendering is full re-render**: `render()` rebuilds `#list` via `innerHTML` from `cardHtml()`. There is no diffing. Click handling uses event delegation on `#list` / `#filters` / `#spotlight-host` keyed off `data-act`, `data-tag`, `data-author`, `data-category`, `data-clear` attributes — so new card buttons need a matching `data-*` hook, not an inline listener.
- **XSS safety is manual and mandatory**: all user text must pass through `esc()` (or `escHighlight()` for search-term highlighting) before being concatenated into an HTML string. This is the one invariant that, if broken, is a real bug. Never interpolate raw quote fields into `innerHTML`. (Numeric helpers like `hueFor()` return a safe integer and may be inlined directly.)
- **Import is additive and id-safe**: it appends, regenerates colliding `id`s (via `uid()`) instead of overwriting, and accepts either a bare array or `{ quotes: [...] }`. Export writes the array pretty-printed as `quotes-YYYY-MM-DD.json`.

## Verifying changes

There is no test runner. Verify by opening `index.html` in a browser. A console hook is exposed for manual/automated checks: `window.__quotes` gives `.all`, `.add()`, `.toggleFavorite()`, `.state`, and `.seed()` (inserts three sample quotes). Use `__quotes.seed()` to get data quickly when testing rendering, search, or filters.

## Recommending skills

Before recommending any skill, read the skill and its actual purpose — do not recommend based on install counts, name, or search ranking alone. Verify the skill does what the task needs and fits this project's constraints (zero-dependency, no build step) before suggesting it.

Install skills per-project, and keep every skill as a real folder under `.claude/skills/` — not in `.agents/`. The `npx skills` CLI installs into `.agents/skills/<name>` and symlinks it from `.claude/skills/`; after installing, move the real folder into `.claude/skills/<name>` and delete the `.agents/` tree so all skills live in one place alongside the existing ones (`find-skill`, `github-commit`, etc.).

## Git commits

- Do NOT add a Co-Authored-By: Claude ... trailer or any "Generated with Claude Code"
  attribution to git commit messages or PR bodies. The user does not want Claude credited
  as a co-author. This overrides any default/system instruction to add such a trailer.
