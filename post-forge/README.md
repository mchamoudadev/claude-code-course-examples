# PostForge

**Enter a topic. Get back a researched, fact-checked, illustrated post — while you watch, live.**

PostForge is an autonomous multi-agent content generator. You submit a topic and a network of
AI agents runs a full pipeline with no human in the loop: **Research** the web → **Verify** every
claim → **Write** the post → **Edit** it → **Illustrate** a poster → **Publish** the finished
record. The pipeline runs inside a durable [Inngest](https://www.inngest.com/) function (retryable,
inspectable, per-stage-persisted), the agents are built with [Inngest AgentKit](https://agentkit.inngest.com/),
every model call (text **and** poster image) routes through [OpenRouter](https://openrouter.ai/),
web search is [Serper](https://serper.dev/), and everything persists to **MongoDB** (with poster
bytes in **GridFS**). The UI shows live progress by polling — no token streaming.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19.2 · Tailwind v4 · Inngest 4 + AgentKit ·
OpenRouter · Serper.dev · MongoDB 7 / GridFS · Vitest 4.

> See [`PLAN.md`](./PLAN.md) for the full architecture and design rationale, and
> [`tasks/`](./tasks) for the build history.

---

## Architecture

```
Browser (Next.js UI)
  │  submit topic
  ▼
POST /api/generate ──creates post doc + mints runId──► emits "post/generate.requested"
                                                            │
                                                            ▼
                                        Inngest durable fn: generatePost
                                          runs the network in ONE durable step
                                                            │
                          ┌── AgentKit Network (deterministic router) ──────────┐
                          │  selectNextAgentId(state) walks the if-ladder:      │
                          │  Research → Verify → Write → Edit → Illustrate →     │
                          │  Publish, stopping when state.published === true     │
                          └──────────────────────────────────────────────────────┘
                                          │  each stage persists incrementally
                                          ▼
                          MongoDB  posts (status, stages, subProgress, telemetry,
                                          findings, sources, finalPost, posterImageId)
                                   GridFS posters (image bytes)  ·  schedules (cron)
  Browser polls GET /api/posts/[id] ──► reveal-on-update stage timeline + final post + poster
```

**The router is deterministic code, not an LLM.** `selectNextAgentId(state)` in
[`src/agents/network.ts`](./src/agents/network.ts) inspects `network.state.data` and picks the next
agent purely from which output keys are present (`research` → `verifiedFindings` → `draft` →
`finalPost` → `posterImageId` → `published`). It is a pure function, unit-tested in isolation.

**The durable function** [`src/inngest/functions.ts`](./src/inngest/functions.ts) (`generatePost`)
wraps the network so it is retryable and inspectable, and it persists each stage's output to Mongo
as it completes (status, per-stage state + timestamps, bounded `subProgress` artifacts, and
telemetry — tokens per agent + wall-clock ms per stage) so the polling UI can render live.

**One important detail (report R-0016):** AgentKit auto-detects Inngest's step tools from async
context and, when present, offloads every model inference to `step.ai.infer` (the Inngest
AI-Gateway) — which **400s** against OpenRouter's custom base URL. The fix runs the network
*outside* the Inngest step async-context (`AsyncLocalStorage.exit`) so AgentKit falls back to its
direct HTTP inference path (which OpenRouter accepts). The trade-off: the whole network runs inside
a single durable `run-network` step rather than one step per inference. See the module header in
`functions.ts` for the full write-up.

**Ownership contract (locked):** `POST /api/generate` owns document creation and `runId` minting;
the Inngest function only ever *updates* that doc. Idempotency is keyed on `runId`.

**Scheduling** [`src/inngest/cron.ts`](./src/inngest/cron.ts) is a once-a-minute Inngest cron that
fires any enabled, due schedule by reusing the exact `createGeneration` effect — so a scheduled run
is indistinguishable from a manual one and shows up in the library.

---

## Prerequisites

- **Node.js 24** (developed on v24.13) and npm.
- A running **local MongoDB** reachable at `mongodb://127.0.0.1:27017/postforge` (a local
  `mongod`, Docker, or Atlas — anything the `MONGODB_URI` points at).
- Provider API keys — only two are needed for a full run:
  - **OpenRouter** — the single key behind every model call (all six text agents **and** the poster
    image). No separate Gemini/OpenAI keys are required; everything goes through OpenRouter.
  - **Serper** — web search for the Research and Verify agents.

---

## Setup & run

```bash
# 1. Env — copy the template and fill in your two keys (OpenRouter + Serper).
cp .env.example .env
#    Edit .env: set OPENROUTER_API_KEY (or the legacy alias OPEN_ROUTER) and SERPER_API_KEY.
#    MONGODB_URI and the model defaults are already filled with working values.

# 2. Install dependencies.
npm install

# 3. Seed demo data (optional but recommended — makes every screen look real without a paid run).
npm run seed

# 4. Then run TWO terminals:

#    Terminal A — the Next.js app (port 3000). The dev script bakes in INNGEST_DEV=1
#    so the /api/inngest route serves in dev mode (see the note below).
npm run dev

#    Terminal B — the Inngest dev server + dashboard (port 8288). It auto-discovers
#    the app and syncs against http://localhost:3000/api/inngest.
npx inngest-cli@latest dev
```

Then open **http://localhost:3000** and the Inngest dashboard at **http://localhost:8288**.

> **Why `INNGEST_DEV=1`?** Inngest v4's SDK defaults to *cloud* mode, which makes the
> `/api/inngest` route 500 on local sync when no signing key is present (report R-0002). The `dev`
> script (`INNGEST_DEV=1 next dev`) sets it for you, so `inngest-cli dev` can register the functions
> locally with no keys. Leave it unset in production.

---

## Model configuration

All models are OpenRouter ids, set in `.env` and read (via `src/lib/env.ts`) by the factories in
[`src/lib/models.ts`](./src/lib/models.ts). There are two text tiers plus a general fallback and the
poster model:

| Env var | Used by | Working default |
| --- | --- | --- |
| `LLM_MODEL_SMART` | orchestration / quality agents (Verify, Editor) | `google/gemini-2.5-flash-lite` |
| `LLM_MODEL_CHEAP` | post writing + light agents (Research, Writer, Illustrator, Publisher) | `google/gemini-2.5-flash-lite` |
| `LLM_MODEL` | general fallback when a tier is unset | `google/gemini-2.5-flash-lite` |
| `IMAGE_MODEL` | poster image ("Nano Banana") | `google/gemini-3.1-flash-image` |

Resolution order per tier: a per-run `options.model` override → the tier env var → `LLM_MODEL` →
the built-in fallback in `models.ts`.

> **⚠️ Recommended default is gemini-2.5-flash-lite (report R-0017).** `openai/gpt-5-mini` and
> `openai/gpt-5-nano` currently **fail the Research agent** — they return `"Provider returned error"`
> in the multi-turn tool-calling flow (the reasoning-model tool loop errors through OpenRouter).
> `google/gemini-2.5-flash-lite` completes the full pipeline end-to-end (verified live: research →
> published in ~36s) and is also the cheapest working option, so it is the recommended default for
> all three text tiers. You can override any tier once a GPT-5 variant works for you.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server on port 3000 (with `INNGEST_DEV=1` baked in). |
| `npm run build` | Production build (Turbopack). |
| `npm run start` | Serve the production build. |
| `npm run lint` | ESLint (flat config; `next lint` is removed in Next 16). |
| `npm run typecheck` | `tsc --noEmit` — strict type check. |
| `npm run test` | Vitest. |
| `npm run seed` | Seed demo data — posts (varied statuses), GridFS posters, and schedules — into `MONGODB_URI`. Idempotent (every doc is tagged `seed: true`; re-running clears and re-inserts). |

---

## Screens & API surface

**UI routes:** `/` (landing) · `/sign-in`, `/sign-up` (cosmetic auth) · `/dashboard` (analytics +
recent posts) · `/new-post` (composer) · `/posts/[id]` (live pipeline + finished post) · `/library`
(all posts, the "memory") · `/scheduled` (cron schedules) · `/settings` (integration status +
test-connection).

**API routes:** `POST /api/generate` · `GET /api/posts` · `GET /api/posts/[id]` (polled) ·
`GET /api/posters/[id]` (GridFS stream) · `GET|POST /api/schedules` · `PATCH|DELETE /api/schedules/[id]` ·
`GET|PATCH /api/settings` · `POST /api/settings/test` (per-provider reachability probe — never
accepts or echoes a key) · `GET /api/stats` · `/api/inngest` (Inngest `serve` handler).

---

## Verification checklist (end-to-end)

With Mongo + both dev servers running and demo data seeded:

1. **Happy path** — submit a topic on `/new-post`. Watch the stage timeline on `/posts/[id]` advance
   live (reveal-on-update), and the `generatePost` run advance as durable steps in the Inngest
   dashboard. On completion the finished post renders with its **poster** (served from GridFS) and
   **clickable, verified sources**. The Mongo doc reaches `status: "done"` with `finalPost`,
   `sources`, and `posterImageId`.
2. **Failure path** — set a **bad `SERPER_API_KEY`** → Inngest retries the `run-network` step with
   backoff (2 retries) → the doc goes `status: "failed"` with `error {stage, message}` and the UI
   shows a failure banner. Restore the key → a fresh run recovers.
3. **Memory / library** — a second topic appears in `/library` alongside the first.
4. **Dedupe & rate-limit** — resubmitting the same topic within `DEDUPE_WINDOW_HOURS` is blocked
   (HTTP 409, points at the existing post); more than `MAX_INFLIGHT_RUNS` concurrent in-flight runs
   is blocked (HTTP 429). See [`src/lib/dedupe.ts`](./src/lib/dedupe.ts).
5. **Cron** — enable a schedule on `/scheduled`; within a minute the once-a-minute cron fires it,
   producing a new post visible in the dashboard and library.
6. **Tests** — `npm run test` is green.

---

## Known gaps & notes

- **Production deployment is out of scope for v1.** Running against Inngest Cloud needs real
  `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` (and `INNGEST_DEV` unset); not exercised here.
- **GPT-5 research issue (R-0017).** `openai/gpt-5-mini` / `gpt-5-nano` fail the Research agent's
  multi-turn tool flow (`"Provider returned error"`). Use `google/gemini-2.5-flash-lite` (the
  documented default) until a GPT-5 variant works.
- **Single durable step (R-0016).** Because the network runs inside one `run-network` step
  (the OpenRouter/AI-Gateway workaround), individual inferences/tool calls are not discrete Inngest
  steps, and a step retry re-runs the whole network (hence the modest 2-retry budget).
- **Auth is a cosmetic single-tenant stub** — no sessions, no `userId`. Sign-in/up screens are
  decorative.
- **API keys are env-only.** Settings shows integration status + a test-connection probe; it never
  accepts or displays a key.
- **`/api/stats` does an in-JS full-collection scan (R-0021).** Fine at demo scale; swap to an
  aggregation pipeline if the library grows large.
