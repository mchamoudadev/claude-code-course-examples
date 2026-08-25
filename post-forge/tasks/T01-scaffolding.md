---
id: T01
title: Project scaffolding, Inngest wiring & env contract
status: ready
wave: 0
depends_on: []
blocks: [T02, T07]
owner: unassigned
verify: mixed
---

# T01 — Project scaffolding, Inngest wiring & env contract

## 1. Objective
Stand up the greenfield `post-forge/` Next.js (App Router, TypeScript) project with every runtime dependency, config file, the full target folder skeleton, a reachable Inngest client + serve route, and one centralized, typed env/secrets contract. This is the **root of the whole dependency graph** — every other task assumes a compiling, runnable base and a single source of truth for secrets. **Mandatory scaffolding task.**

## 2. Background & context
The project lives alongside sibling demos in `claude-planning-demos/`. Architecture is in `../PLAN.md`. Nothing here is reused from siblings. All later tasks import from `src/lib`, register Inngest functions in the serve handler created here, and read env through the accessor defined here.

## 3. Scope
**In scope:** project bootstrap, dependencies, tooling scripts, folder skeleton, Inngest wiring with zero functions, `.env.example`, typed env accessor, README stub.
**Out of scope:** any agent/tool/screen logic (later tasks); runtime key-management UI (T15); the actual Inngest `generatePost` function (T05).

## 4. Requirements — step-by-step spec
1. Scaffold with `create-next-app` in `post-forge/`: TypeScript, App Router, Tailwind, ESLint, `src/` dir, import alias `@/*`.
2. Install runtime deps: `@inngest/agent-kit`, `inngest`, `mongodb`, `zod`, `@google/genai`, `openai`. Install extraction + viz + test deps required by later tasks so the base is complete: `@mozilla/readability`, `jsdom` (fetch_url, T03), `recharts` (analytics, T13), `vitest` + `@vitest/coverage-v8` (tests, T18).
3. Add `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest`), and a placeholder `seed` (`tsx scripts/seed.ts`, wired in T17).
4. Configure `tsconfig.json` (strict), `next.config.ts`, Tailwind/PostCSS, a base `src/app/globals.css`, and a minimal `src/app/layout.tsx`.
5. Create the **full folder skeleton** (empty index/placeholder files where needed so imports resolve):
   - `src/app/(app)/` and `src/app/(auth)/` route groups
   - `src/app/api/{generate,posts,posts/[id],posters/[id],inngest,settings,schedules}/`
   - `src/inngest/`, `src/agents/`, `src/agents/tools/`, `src/lib/`, `src/components/`, `scripts/`
6. Create `src/inngest/client.ts`: `export const inngest = new Inngest({ id: "post-forge" })`.
7. Create `src/app/api/inngest/route.ts`: `serve({ client: inngest, functions: [] })` exporting `GET/POST/PUT`. Zero functions registered — later tasks add to the array.
8. Create `.env.example` enumerating **all** vars with comments: `OPENROUTER_API_KEY`, `LLM_MODEL=openai/gpt-5.5`, `SERPER_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `IMAGE_PROVIDER` (`gemini`|`openai`, default `gemini`), `MONGODB_URI`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`.
9. Create `src/lib/env.ts`: a typed accessor `env(key)` (or a validated `getEnv()` object) that reads `process.env`, and a `requireEnv(name)` that **throws a clear named error** (e.g. `MissingEnvError: SERPER_API_KEY is not set`) when a required var is missing. Do not throw at import time for optional vars.
10. Ensure `.gitignore` ignores `.env*` except `.env.example`.
11. Write a README stub: prerequisites (Node version, MongoDB, provider keys) and initial dev-setup steps (`cp .env.example .env`, `npm run dev`, `npx inngest-cli@latest dev`).

## 5. Files to create / modify
- `post-forge/package.json` — deps + scripts
- `post-forge/tsconfig.json`, `next.config.ts`, Tailwind/PostCSS config, `src/app/globals.css`, `src/app/layout.tsx`
- `post-forge/src/inngest/client.ts` — Inngest client
- `post-forge/src/app/api/inngest/route.ts` — serve handler (empty functions array)
- `post-forge/.env.example`, `post-forge/.gitignore`
- `post-forge/src/lib/env.ts` — typed env accessor
- Empty skeleton dirs/files per step 5

## 6. Interfaces & contracts
- Exports `inngest` (client) consumed by every Inngest function (T05, T14) and the serve route.
- Exports `env` / `requireEnv` consumed by all libs, tools, and routes.
- Env var names are the canonical contract for all provider integrations.

## 7. Acceptance criteria — Definition of Done
- [ ] `npm run dev` boots a blank app with no console errors.
- [ ] `npm run build` and `npm run typecheck` pass on the empty skeleton.
- [x] `npx inngest-cli@latest dev` connects to `/api/inngest`, **auto-detects the app** (SDK v4.11.0, Next.js) and introspects it with **zero** functions. _Orchestrator reconciliation (Inngest v4): an empty app is inherently flagged "No functions registered" by the dev dashboard — expected for T01 (`functions: []`), clears once T05 registers `generatePost`. The original blocking `internal_server_error` (Inngest v4 cloud-mode default) was fixed via `INNGEST_DEV=1` in the `dev` script; wiring verified by 200 introspection (`mode:dev`) + successful `PUT` "Successfully registered". See R-0002._
- [ ] Importing the env accessor and calling `requireEnv` on a missing var throws a clear, **named** error.
- [ ] Every directory in the target file layout exists; `(app)`/`(auth)` route groups present.
- [ ] `.env` is gitignored; only `.env.example` is tracked and contains all nine vars.

## 8. Verification
1. `cd post-forge && npm install && npm run build && npm run typecheck` → both succeed.
2. `npm run dev` → open `http://localhost:3000`, blank page renders.
3. In a second terminal `npx inngest-cli@latest dev` → dashboard shows the `post-forge` app, 0 functions, no sync errors.
4. In a scratch script/node REPL, call `requireEnv("SERPER_API_KEY")` with it unset → observe the named error.
5. `git status` → `.env` untracked/ignored; `.env.example` staged.

**Screen verification:** with `npm run dev` + `npx inngest-cli dev` running, open the browser (Claude-in-Chrome) to `http://localhost:3000`, screenshot the blank app, and confirm the Inngest dashboard shows the connected app with zero functions.

## 9. Dependencies & sequencing
`depends_on: []` (root). `blocks: [T02, T07]`. Runs alone in Wave 0; unblocks both the backend track (T02) and the design track (T07).

## 10. Risks & open questions
- Pin Next/React/Tailwind versions consistent with siblings to avoid config drift.
- Confirm Node version + package manager (npm assumed).
- `tsx` (or equivalent) needed for the `seed` script runner — add in T01 or T17; keep the placeholder script wired here.
