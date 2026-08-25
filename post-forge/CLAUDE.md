@AGENTS.md

# PostForge — Project Contract & Conventions

PostForge is a greenfield **autonomous multi-agent content generator**: a user submits a topic → an
AgentKit network (**Research → Verify → Write → Edit → Illustrate → Publish**) runs inside an **Inngest**
durable function → the finished post + poster persist to **MongoDB**, and the UI shows live progress by
polling. Full architecture: `PLAN.md`. Design brief: `DESIGN_PROMPT.md`.

## ⚠️ Next.js 16 — breaking changes vs your training data
This project runs on **Next.js 16.2.10 (App Router, Turbopack), React 19.2, Tailwind v4 (CSS-first — `@import "tailwindcss"`, `@tailwindcss/postcss`, no `tailwind.config.js`)**. APIs, conventions, and file structure differ from the Next 14/15 you may remember (e.g. `lint` is `eslint` with flat config — `next lint` is removed; async request APIs; route handler signatures). **Before writing any Next.js / React / Tailwind code, read the relevant guide in `node_modules/next/dist/docs/`** and confirm against live docs. The imported `AGENTS.md` carries the same advisory.

## How this project is built (orchestration)
- The build is driven by the **Orchestrator** model in `ORCHESTRATOR.md`. Tasks **T01–T19** each have a BRD in `tasks/`.
- **`tasks/status.json` is the single source of truth** for task state — read it at the top of every cycle; never act from memory. Keep it and the status table in `tasks/README.md` in sync on **every** state change.
- Tasks run in **waves**; a task is `ready` only when every id in its `dependsOn` is `done`. Same-wave tasks run in isolated **git worktrees** branched off `main`, merged back after verification.
- Implementers never guess on a blocker / decision / broken-assumption / missing-dependency — they file a report in `tasks/reports.jsonl` (protocol: `tasks/REPORTS.md`); the orchestrator triages and escalates human decisions.
- **Verification is mandatory before `done`:** `command` tasks run build / typecheck / test / DB checks; `screen` (UI) tasks are screenshotted at **desktop + mobile** via Claude-in-Chrome and compared against the imported design.

## Locked decisions (apply everywhere)
- **Auth:** cosmetic stub, single-tenant — no sessions, no `userId`.
- **API keys:** env-only. Settings shows integration status + test-connection; **never** key entry.
- **Live progress:** poll `GET /api/posts/[id]` + persisted per-stage sub-progress (reveal-on-update; no token streaming).
- **Doc ownership:** `POST /api/generate` creates the post doc + mints `runId`; the Inngest function only *updates* it.
- **Design system:** imported from `PostForge.dc.html` via the **claude_design MCP (`DesignSync` tool)** — **NOT Figma**, and not a file on disk. Managed centrally in **T07**; no other task re-imports it.

## Design source
- claude_design project **"# PostForge Design System"** — projectId `2459fb43-a9b9-4b1f-8b86-416e75505ce2`, file **`PostForge.dc.html`** (+ `support.js`; reference screenshots under `scr/`).
- Use `DesignSync` (`list_files` / `get_file`) + the `/design-sync` skill. **Never** use the Figma MCP tools for this project.

## Env contract (`.env`, mirrored by `.env.example`)
**All AI — text AND poster image — routes through OpenRouter.** No direct Gemini/OpenAI SDK keys are needed. Read through `src/lib/env.ts` (`requireEnv` throws a named error when a required var is missing):
- `OPENROUTER_API_KEY` — the **single** key for every model call (text + image). **Alias:** the accessor also accepts the legacy name `OPEN_ROUTER` (the user's current `.env` uses that).
- `SERPER_API_KEY` — web search.
- `MONGODB_URI` — persistence + GridFS poster bytes (local dev: `mongodb://127.0.0.1:27017/postforge`).
- **Model tiers** (OpenRouter ids, env-overridable, set in `.env`): `LLM_MODEL_SMART`=`LLM_MODEL_CHEAP`=`LLM_MODEL`=`openai/gpt-5.4-mini` (user's choice; **verified LIVE end-to-end**) · `IMAGE_MODEL`=`google/gemini-3.1-flash-image` (poster). `google/gemini-2.5-flash-lite` remains a proven, cheaper alternative. **R-0031 (supersedes R-0017):** gpt-5.x models earlier failed with "Provider returned error" — the real cause was **OpenAI STRICT function-calling** rejecting two tool schemas (`fetch_url` `.url()`→`format:"uri"`; `save_post` optional fields), NOT the models. Both fixed (`fetch_url` uses plain `z.string()`; `savePostTool.strict=false`). Note: `models.ts` code fallbacks remain `gpt-5.5`/`gemini-2.5-flash-lite`; `.env` overrides them.
- `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` — only for non-local Inngest (optional in local dev).
- Superseded / optional (unused now that everything is OpenRouter): `GEMINI_API_KEY`, `OPENAI_API_KEY`, `IMAGE_PROVIDER`.

## Stack — verify against live docs before use (never training-data memory)
Next.js 16 (App Router, TS, Turbopack) · React 19.2 · Tailwind v4 · Inngest 4 + Inngest AgentKit · OpenRouter (all models, text + image) · Serper.dev · GridFS/MongoDB 7 · Vitest 4.
**Rule:** before using any external library / SDK / API, confirm current syntax, versions, and behavior via the **Context7 MCP** or web search. This applies to every task and every subagent.

## Scripts & local run
`npm run dev` · `build` · `start` · `lint` (`eslint`) · `typecheck` (`tsc --noEmit`) · `test` (vitest) · `seed` (`tsx scripts/seed.ts`).
Local end-to-end: `npm run dev` **+** `npx inngest-cli@latest dev` (Inngest dashboard).
