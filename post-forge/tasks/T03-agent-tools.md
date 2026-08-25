---
id: T03
title: "AgentKit tools: web_search, fetch_url, generate_poster, save_post"
status: blocked
wave: 2
depends_on: [T02]
blocks: [T04, T15, T17]
owner: unassigned
verify: command
---

# T03 — AgentKit tools

## 0. ⚠️ ORCHESTRATOR AMENDMENT (2026-07-05) — poster via OpenRouter image model
`generate_poster.ts` reads `network.state.data.options.imageModel` (renamed from `imageProvider`) and passes it as the `modelOverride` to `generatePoster(prompt, modelOverride)` (T02, now OpenRouter-backed). GridFS storage + `{mime, postId}` metadata unchanged. No direct Gemini/OpenAI SDK usage anywhere — everything is OpenRouter (key `OPENROUTER_API_KEY`/`OPEN_ROUTER`).

## 1. Objective
Implement the four AgentKit tools the agents call — Serper web search, readable page fetching, poster generation into GridFS, and final post persistence — each independently testable and robust to provider failure so the orchestration's retry/failure behavior (T05) is predictable.

## 2. Background & context
Tools are the seam between agents and external services. They build on T02 (`image.ts`, posts repository, GridFS, `state.ts` types) and env from T01. `web_search`/`fetch_url` depend only on env + Serper; `generate_poster`/`save_post` depend on the T02 image/GridFS/repository layer.

## 3. Scope
**In scope:** `web_search.ts`, `fetch_url.ts`, `generate_poster.ts`, `save_post.ts` — each a `createTool` with a zod schema + handler.
**Out of scope:** agent definitions and the router (T04); the orchestration wrapper (T05); the poster HTTP route (T06).

## 4. Requirements — step-by-step spec
1. **`web_search.ts`**: `createTool({ name: "web_search", parameters: z.object({ query: z.string() }) })`. Handler `POST https://google.serper.dev/search` with header `X-API-KEY: requireEnv("SERPER_API_KEY")`, body `{ q: query }`. Normalize `organic[]` to `{ title, url, snippet }[]` (cap count, e.g. 8). Throw a clear error on non-200 / missing key.
2. **`fetch_url.ts`**: `createTool({ name: "fetch_url", parameters: z.object({ url: z.string().url() }) })`. Handler: **SSRF guard** (allow only `http`/`https`, block private/loopback hosts), fetch with a timeout (e.g. 8s) and a size cap; if HTML, extract readable text via `@mozilla/readability` + `jsdom`; truncate to a max length (e.g. 8–12k chars). On non-HTML/oversized/failed fetch, return a short structured note rather than throwing (degrade gracefully).
3. **`generate_poster.ts`**: `createTool({ name: "generate_poster", parameters: z.object({ prompt: z.string() }) })`. Handler: read `postId`/`options.imageProvider` from `network.state.data`; call `generatePoster(prompt, providerOverride)` (T02); upload bytes to GridFS with metadata `{ mime, postId }`; write the resulting `posterImageId` into `network.state.data`; return the id.
4. **`save_post.ts`**: `createTool({ name: "save_post", parameters: z.object({...final fields...}) })`. Handler: upsert the complete `Post` document via the repository, keyed by **`runId`** for idempotency; set `status` toward `publishing`/`done` and `published:true`; return `{ postId }` into state.
5. All handlers use the `(params, { network, step })` signature and mutate `network.state.data` where useful. Wrap external calls so real errors surface (not swallowed) — the orchestrator decides retry vs fail.

## 5. Files to create / modify
- `post-forge/src/agents/tools/web_search.ts`
- `post-forge/src/agents/tools/fetch_url.ts`
- `post-forge/src/agents/tools/generate_poster.ts`
- `post-forge/src/agents/tools/save_post.ts`

## 6. Interfaces & contracts
- Tool names (`web_search`, `fetch_url`, `generate_poster`, `save_post`) and their zod parameter shapes are the contract agents (T04) bind to.
- `generate_poster` writes `posterImageId`; `save_post` writes `postId`/`published` into network state — consumed by the router (T04) and persisted by orchestration (T05).
- GridFS objects carry `{ mime, postId }` metadata — consumed by the poster route (T06) and DELETE cleanup.

## 7. Acceptance criteria — Definition of Done
- [ ] `web_search` returns structured `{title,url,snippet}[]` for a sample query and fails cleanly with a bad/missing `SERPER_API_KEY`.
- [ ] `fetch_url` returns capped readable text for a known article URL and degrades gracefully on non-HTML/oversized/unreachable pages; SSRF guard blocks private hosts.
- [ ] `generate_poster` stores bytes in GridFS and returns an id later retrievable via the poster route, with `{mime,postId}` metadata.
- [ ] `save_post` upserts a complete `Post` doc and is idempotent for a given `runId` (re-run does not duplicate).
- [ ] Each tool is exercisable in isolation without running the full network; provider/network errors are surfaced.

## 8. Verification
1. Call each tool's handler directly from a scratch script with a fake `network` object.
2. `web_search({query:"World Cup 2026"})` → structured results; then unset the key → clean error.
3. `fetch_url` on a real article → readable text under the cap; on `http://169.254.169.254/` → blocked by SSRF guard.
4. `generate_poster({prompt:"..."})` with a test `postId` → returns id; fetch it back from GridFS and confirm bytes + metadata.
5. `save_post(finalFields)` twice with the same `runId` → one document (idempotent).

## 9. Dependencies & sequencing
`depends_on: [T02]`. `blocks: [T04, T15, T17]`. Wave 2, in parallel with T08/T09. T15 reuses these tools for test-connection.

## 10. Risks & open questions
- Decide who authors the image prompt: the Illustrator agent passes a `prompt`, so the tool accepts it (agent-authored). Confirm.
- Tune fetch timeout/size caps and Serper result count.
- Handle GridFS orphan cleanup if `save_post` fails after `generate_poster` (addressed by DELETE cleanup in T06 + idempotent re-run).
