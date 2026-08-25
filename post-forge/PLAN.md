# PostForge — Autonomous Multi-Agent Post Generator

## Context

A greenfield **multi-agent content system**. A user enters a topic (e.g. "write a post about World Cup 2026"), and an orchestrated network of AI agents autonomously: **finds** resources on the web → **verifies** them → **writes** a post → **edits** it → **generates a poster image** → **publishes** (persists) the finished post. It runs fully end-to-end with no human gate.

This lives in `post-forge/` (a new TypeScript/Next.js project).

**Stack (confirmed against current 2026 APIs):**
- **Next.js (App Router, TS)** — web UI + API routes
- **Inngest** — durable background orchestration, retries, observability, cron
- **Inngest AgentKit** — the multi-agent network (agents + tools + router + state)
- **OpenRouter** → **GPT-5** (`openai/gpt-5.5`, configurable) as the LLM for every agent
- **Serper.dev** — web search tool
- **Nano Banana (Gemini `gemini-3.1-flash-image`)** default for the poster; **GPT Image 2** as a swappable alternative
- **MongoDB** — persistence + the orchestrator's "memory" of past posts

**Design decisions:** Web app · persist to MongoDB (no live social publishing in v1) · fully autonomous · full end-to-end pipeline.

---

## Architecture overview

```
Browser (Next.js UI)
  │  submit topic
  ▼
POST /api/generate  ──emits event──►  Inngest ("post/generate.requested")
                                          │
                                          ▼
                            Inngest durable function
                                          │  runs
                                          ▼
                          ┌── AgentKit Network ──────────────┐
                          │  Router (deterministic, state-   │
                          │  driven state machine)           │
                          │    → Research → Verify → Write    │
                          │      → Edit → Illustrate → Publish│
                          └──────────────────────────────────┘
                                          │  each stage writes network.state.data
                                          ▼
                                     MongoDB (posts)
  Browser polls /api/posts/[id] for live stage progress + final result
```

The **orchestrator** is the AgentKit **router** — a deterministic code-based function (AgentKit's recommended pattern) that inspects `network.state.data` and picks the next agent, stopping when `published === true`. Its **"memory"** = network state during a run + the MongoDB `posts` history queried before writing (to reuse context / avoid duplicate topics).

Running the network **inside an Inngest function** makes every model/tool call a durable, retryable step, visible in the Inngest dev dashboard.

---

## Agents & tools

Each agent uses GPT-5 via OpenRouter. Shared model factory in `lib/models.ts`:
```ts
import { openai } from "@inngest/agent-kit";
export const gpt5 = () => openai({
  model: process.env.LLM_MODEL ?? "openai/gpt-5.5",
  apiKey: process.env.OPENROUTER_API_KEY,
  baseUrl: "https://openrouter.ai/api/v1",
});
```

| Agent | Tools | Writes to `state.data` | Responsibility |
|---|---|---|---|
| **Research** | `web_search` (Serper), `fetch_url` | `research: Finding[]` | Search the topic, pull top sources, extract key facts + URLs |
| **Verify** | `web_search` (re-check) | `verifiedFindings: Finding[]` | Cross-check each claim; drop/flag unsupported ones |
| **Writer** | — | `draft: string` | Compose an engaging post grounded only in verified findings |
| **Editor** | — | `finalPost: string`, `title: string` | Polish tone/structure/accuracy; ensure claims trace to sources |
| **Illustrator** | `generate_poster` (Nano Banana / GPT Image) | `posterImageId: string` | Craft an image prompt from the post, generate poster, store in GridFS |
| **Publisher** | `save_post` | `published: true`, `postId` | Upsert the complete record into MongoDB `posts` |

**Tools** (`agents/tools/`), each `createTool({ name, description, parameters: z.object({...}), handler })`:
- `web_search` → `POST https://google.serper.dev/search`, header `X-API-KEY`, body `{ q }`; returns organic results.
- `fetch_url` → fetch page, strip to readable text (cap length) for extraction.
- `generate_poster` → calls `lib/image.ts` provider abstraction (default Gemini `gemini-3.1-flash-image` via `@google/genai`; alt `gpt-image-2` via OpenAI SDK), stores bytes in **GridFS**, returns image id.
- `save_post` → writes final document to Mongo `posts`.

Handlers receive `(params, { network, step })` and mutate `network.state.data` where useful.

**Router** (`agents/network.ts`) — deterministic:
```
if (!research)          → researchAgent
else if (!verified)     → verifyAgent
else if (!draft)        → writerAgent
else if (!finalPost)    → editorAgent
else if (!posterImageId)→ illustratorAgent
else if (!published)    → publisherAgent
else                    → undefined  // done
```

---

## Data model (MongoDB)

`posts` collection (one document per run, updated as stages complete so the UI can show live progress):
```ts
{
  _id, topic, status: "researching"|"verifying"|"writing"|"editing"|"illustrating"|"publishing"|"done"|"failed",
  stages: { research, verify, write, edit, illustrate, publish }, // per-stage state + timestamps
  research: Finding[], verifiedFindings: Finding[],
  title, draft, finalPost, sources: {title,url}[],
  posterImageId, runId, createdAt, updatedAt, error?
}
```
Poster bytes live in **GridFS**, served via `GET /api/posters/[id]`. `Finding = { claim, source: {title,url}, verified }`.

---

## Files to create

```
post-forge/
  package.json, tsconfig.json, next.config.ts, .env.example, README.md
  src/
    app/
      page.tsx                    # topic search box + list of past posts (the "memory")
      posts/[id]/page.tsx         # live progress + final post + poster + sources
      api/
        generate/route.ts         # POST → inngest.send("post/generate.requested")
        posts/route.ts            # GET list;  posts/[id]/route.ts GET one (polled)
        posters/[id]/route.ts     # GET → stream poster from GridFS
        inngest/route.ts          # Inngest serve() handler
    inngest/
      client.ts                   # Inngest client
      functions.ts                # generatePost fn: builds network, network.run(topic), persists
      cron.ts                     # OPTIONAL scheduled trending-topic auto-post
    agents/
      network.ts                  # createNetwork + deterministic router
      research.ts verify.ts writer.ts editor.ts illustrator.ts publisher.ts
      tools/                      # web_search.ts fetch_url.ts generate_poster.ts save_post.ts
    lib/
      models.ts                   # OpenRouter GPT-5 factory
      image.ts                    # Nano Banana / GPT Image provider abstraction
      mongo.ts                    # Mongo client + GridFS bucket
      state.ts                    # NetworkState type
    components/                   # SearchBox, StageTimeline, PostView, PosterImage
```

**Env (`.env.example`):** `OPENROUTER_API_KEY`, `LLM_MODEL=openai/gpt-5.5`, `SERPER_API_KEY`, `GEMINI_API_KEY` (poster; or `OPENAI_API_KEY` + `IMAGE_PROVIDER`), `MONGODB_URI`, and for non-local Inngest `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`.

---

## Build order

1. **Scaffold** — `create-next-app` (TS, App Router), install `@inngest/agent-kit inngest mongodb zod @google/genai openai`.
2. **Infra libs** — `lib/mongo.ts` (client + GridFS), `lib/models.ts`, `lib/image.ts`, `lib/state.ts`.
3. **Inngest wiring** — `inngest/client.ts`, `api/inngest/route.ts`; verify dev server connects.
4. **Tools** — `web_search`, `fetch_url`, `generate_poster`, `save_post` (each testable in isolation).
5. **Agents + network** — six agents + deterministic router; `functions.ts` runs `network.run(topic)` and upserts `posts` after each stage.
6. **API routes** — `generate`, `posts`, `posters`.
7. **UI** — search box, stage timeline (polls `/api/posts/[id]`), post + poster view, past-posts list.
8. **(Optional)** `inngest/cron.ts` scheduled auto-post to demonstrate Inngest cron/background.

---

## Verification (end-to-end)

1. `cp .env.example .env` and fill real keys (OpenRouter, Serper, Gemini, Mongo). Confirm MongoDB reachable.
2. Terminal A: `npm run dev` (Next.js). Terminal B: `npx inngest-cli@latest dev` → open the Inngest dashboard.
3. Open `http://localhost:3000`, submit **"World Cup 2026"**.
4. Watch the Inngest dashboard: the `generatePost` function runs, agents fire in order (research → … → publish) as durable steps; expand steps to confirm Serper results, GPT-5 outputs, and the image call.
5. In the UI, the stage timeline advances live (polled); on completion the final post + poster + clickable sources render on `/posts/[id]`.
6. In MongoDB (Compass/`mongosh`): confirm one `posts` doc with `status:"done"`, `finalPost`, `sources`, `posterImageId`; `GET /api/posters/<id>` returns the image.
7. Failure path: temporarily set a bad `SERPER_API_KEY` → confirm Inngest retries then the doc goes `status:"failed"` with `error`, and the UI shows the failure. Restore the key.
8. Submit a second topic → confirm it appears in the past-posts list (the "memory") and the router reused/queried prior context.

---

## Open choices (sensible defaults chosen; easy to flip later)

- **Poster provider:** default **Nano Banana** (fast/cheap, `gemini-3.1-flash-image`); switch to **GPT Image 2** via `IMAGE_PROVIDER=openai`.
- **Model:** default `openai/gpt-5.5`; override per-agent later (e.g. cheaper model for research, stronger for editing).
- **Live progress:** polling `/api/posts/[id]` in v1 (simplest, robust). Can upgrade to Inngest Realtime/SSE later.
- **Cron auto-posting:** included as an optional stretch step, not core.
