---
id: T02
title: "Foundation libraries: Mongo/GridFS, data model, GPT-5 & image adapters, settings store"
status: blocked
wave: 1
depends_on: [T01]
blocks: [T03, T04, T05, T06, T14, T17]
owner: unassigned
verify: command
---

# T02 — Foundation libraries

## 0. ⚠️ ORCHESTRATOR AMENDMENT (2026-07-05) — all AI via OpenRouter + model tiers
User directive; supersedes parts of §4.4–4.5, §5 (`image.ts`), and the env contract:
- **Every model call — text AND image — goes through OpenRouter.** No direct `@google/genai` or OpenAI-SDK provider calls. The only provider credentials are `OPENROUTER_API_KEY` (accessor also accepts the legacy name `OPEN_ROUTER`) and `SERPER_API_KEY`.
- **Model tiers (env-configurable OpenRouter ids):**
  - `LLM_MODEL_SMART` (default `openai/gpt-5.5`) — orchestration/quality agents.
  - `LLM_MODEL_CHEAP` (default `google/gemini-2.5-flash-lite`) — post writing / light agents.
  - `LLM_MODEL` — general fallback (defaults to SMART).
  - `IMAGE_MODEL` (default `google/gemini-3.1-flash-image`) — poster generation.
- **`models.ts`:** provide `smartModel(overrides?)` and `cheapModel(overrides?)`, each returning `openai({ model, apiKey: requireOpenRouterKey(), baseUrl: "https://openrouter.ai/api/v1" })` from `@inngest/agent-kit`. Keep `gpt5(overrides)` as an alias for the SMART tier. `requireOpenRouterKey()` reads `OPENROUTER_API_KEY ?? OPEN_ROUTER`.
- **`image.ts`:** `generatePoster(prompt, modelOverride?)` calls **OpenRouter image generation** using `modelOverride ?? env.IMAGE_MODEL ?? "google/gemini-3.1-flash-image"`, returning `{ bytes, mime }`. **Verify the exact OpenRouter image request/response shape against live docs (Context7/web) before coding — do not assume** (likely chat/completions with `modalities:["image","text"]` returning a base64 image; confirm). Failures → typed `ImageGenerationError`. Still does NOT touch GridFS.
- **`state.ts` → `GenerationOptions`:** replace `imageProvider: "gemini" | "openai"` with `imageModel?: string` (an OpenRouter model id); keep `model?: string` (text override).
- **Deps:** `@google/genai` is no longer used by this path (leave installed or remove). Image calls may use raw `fetch` or the `openai` SDK pointed at the OpenRouter baseUrl.
- **Verification §8.3–8.4:** exercise `smartModel()` and `cheapModel()` completions against OpenRouter; `generatePoster("a red circle")` returns bytes+mime via the OpenRouter image model; unset the key → `ImageGenerationError`.

## 1. Objective
Implement the shared runtime libraries and the canonical persistence layer that every backend task consumes: a hot-reload-safe Mongo client + GridFS bucket, the `posts`/`Finding`/`NetworkState` types plus a posts repository, the OpenRouter GPT-5 model factory (with per-run overrides), the swappable poster-image provider (with per-run override), and the settings-defaults store. This is the single source of truth for the document shape used by tools, orchestration, APIs, analytics, and UI.

## 2. Background & context
Builds on the scaffold (T01) — reads env via `src/lib/env.ts`. Downstream: T03 tools call `image.ts` + the repository; T04 agents use `models.ts`; T05 persists via the repository; T06 serves posters from GridFS and reads settings; T13 analytics read telemetry; T17 seeds through the repository.

## 3. Scope
**In scope:** `mongo.ts`, `state.ts` (types), posts repository, `models.ts`, `image.ts`, settings-defaults store.
**Out of scope:** the tools themselves (T03); GridFS *write* of poster bytes happens in the `generate_poster` tool (T03) — `image.ts` returns bytes only; `schedules` collection (T14); analytics computation (T06).

## 4. Requirements — step-by-step spec
1. **`src/lib/mongo.ts`**: create a cached singleton `MongoClient` (store on `globalThis` in dev to survive hot reloads). Export `getDb()` and `getBucket()` (a `GridFSBucket` named `posters`). On first connect, ensure indexes on `posts`: `{ createdAt: -1 }`, `{ status: 1 }`, `{ topic: "text" }` (or a normalized-topic index), and a **unique** index on `{ runId: 1 }`.
2. **`src/lib/state.ts`**: define and export
   - `Finding = { claim: string; source: { title: string; url: string }; verified: boolean }`
   - `PostStatus = "researching" | "verifying" | "writing" | "editing" | "illustrating" | "publishing" | "done" | "failed"`
   - `Stage = "research" | "verify" | "write" | "edit" | "illustrate" | "publish"`
   - `StageState = { state: "queued" | "active" | "done" | "failed"; startedAt?; endedAt?; detail?: string }`
   - `GenerationOptions = { model?: string; imageProvider?: "gemini" | "openai"; tone?: string; length?: "short" | "medium" | "long" }`
   - `Post` document: `{ _id; topic; status: PostStatus; stages: Record<Stage, StageState>; subProgress: SubProgressEntry[]; research: Finding[]; verifiedFindings: Finding[]; title?; draft?; finalPost?; sources: {title;url}[]; posterImageId?; options: GenerationOptions; telemetry: { tokensByAgent: Record<string, number>; timingsByStage: Record<string, number> }; runId; createdAt; updatedAt; error?: { stage?: Stage; message: string } }`
   - `SubProgressEntry = { stage: Stage; kind: string; data: unknown; at: Date }`
   - `NetworkState`: the AgentKit network state shape mirroring the pipeline keys (`research`, `verifiedFindings`, `draft`, `finalPost`, `title`, `posterImageId`, `published`, `postId`, `runId`, `options`).
3. **Posts repository** (`src/lib/posts-repo.ts` or in `mongo.ts`): `createPost(topic, runId, options)`, `getPostById(id)`, `listPosts({ search?, status?, from?, to?, page?, pageSize? })`, `updateStage(id, stage, patch)`, `appendSubProgress(id, entry)`, `setStatus(id, status, error?)`, `saveSources(id, sources)`, `recordTelemetry(id, { agent?, tokens?, stage?, ms? })`, `recordError(id, stage, message)`. All updates use `$set`/`$push` scoped so a single stage/field never clobbers siblings; always bump `updatedAt`.
4. **`src/lib/models.ts`**: `gpt5(overrides?: { model?: string })` returns `openai({ model: overrides?.model ?? env.LLM_MODEL ?? "openai/gpt-5.5", apiKey: requireEnv("OPENROUTER_API_KEY"), baseUrl: "https://openrouter.ai/api/v1" })` from `@inngest/agent-kit`.
5. **`src/lib/image.ts`**: `generatePoster(prompt, providerOverride?)` → `{ bytes: Buffer/Uint8Array, mime: string }`. Provider = `providerOverride ?? env.IMAGE_PROVIDER ?? "gemini"`. `gemini` → `@google/genai` `gemini-3.1-flash-image`; `openai` → openai SDK `gpt-image-2`. Normalize provider/key failures into a typed `ImageGenerationError`. **Does not touch GridFS** (caller stores bytes).
6. **Settings-defaults store** (`src/lib/settings-repo.ts`): a `settings` singleton doc (fixed `_id`). `getSettings()` returns generation defaults (`GenerationOptions`) with sensible fallbacks; `putSettings(partial)` upserts. **No API keys are stored** (env-only).

## 5. Files to create / modify
- `post-forge/src/lib/mongo.ts` — client + GridFS + indexes
- `post-forge/src/lib/state.ts` — all shared types
- `post-forge/src/lib/posts-repo.ts` — posts repository helpers
- `post-forge/src/lib/models.ts` — `gpt5()` factory
- `post-forge/src/lib/image.ts` — image provider abstraction
- `post-forge/src/lib/settings-repo.ts` — settings singleton store

## 6. Interfaces & contracts
- The `Post` type + `Finding` are the **canonical shapes** consumed everywhere.
- Repository function signatures are the persistence contract for T03/T05/T06/T14/T17.
- `gpt5(overrides)` and `generatePoster(prompt, providerOverride)` accept per-run overrides — the mechanism that threads T10's advanced options end-to-end.

## 7. Acceptance criteria — Definition of Done
- [ ] Mongo client is reused across hot reloads (one connection); a GridFS upload+download round-trips identical bytes.
- [ ] Repository create/read/list/update produce the exact `Post` shape and mutate one stage's timestamps without clobbering other fields.
- [ ] `gpt5()` returns an AgentKit model honoring `override.model` → `LLM_MODEL` → default; a minimal completion succeeds against OpenRouter.
- [ ] `image.ts` returns `{bytes,mime}` under the default provider and routes to `gpt-image-2` when provider is `openai`, without caller changes; missing keys raise `ImageGenerationError`.
- [ ] `getSettings/putSettings` round-trip generation defaults; no key fields exist.
- [ ] All types compile and import cleanly from agents, tools, API, and UI layers.

## 8. Verification
1. Unit-exercise `mongo.ts`: connect, upload a small buffer to GridFS, download it, assert byte-equality.
2. Call `createPost` then `updateStage(id,"research",{state:"done"})` then `getPostById` → assert only the research stage changed.
3. Call `gpt5()` and issue a tiny completion (e.g. "say ok") through the model → non-empty response.
4. Call `generatePoster("a red circle")` with `IMAGE_PROVIDER=gemini` then `providerOverride:"openai"` → both return bytes+mime; unset the key → typed error.
5. `putSettings({tone:"witty"})` then `getSettings()` → returns `witty`.

## 9. Dependencies & sequencing
`depends_on: [T01]`. `blocks: [T03, T04, T05, T06, T14, T17]`. Wave 1, in parallel with T07. Internally parallelizable (data layer vs adapters).

## 10. Risks & open questions
- Confirm GridFS metadata stored with each poster: `{ mime, postId }` (used by the poster route + DELETE cleanup).
- Decide connection pool/timeout settings for serverless-style route handlers.
- `@google/genai` image response shape must be mapped to raw bytes + mime correctly.
