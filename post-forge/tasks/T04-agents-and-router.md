---
id: T04
title: Six agents + deterministic router network
status: blocked
wave: 3
depends_on: [T02, T03]
blocks: [T05, T18]
owner: unassigned
verify: command
---

# T04 — Six agents + deterministic router network

## 0. ⚠️ ORCHESTRATOR AMENDMENT (2026-07-05) — per-agent model tiers
Assign each agent to a T02 model tier (SMART = orchestration/quality, CHEAP = writing/light). §4.1's `gpt5(overrides)` becomes `smartModel`/`cheapModel` per this map; still honor the per-run `state.data.options.model` override on the text agents:
- **SMART (`smartModel`)** — `verify` (fact-checking), `editor` (final polish/quality).
- **CHEAP (`cheapModel`)** — `research`, `writer` (user directive: cheapest model for post writing), `illustrator` (authors only a short image prompt), `publisher` (trivial persistence).
Each agent's tier default is env-overridable; when `options.model` is set for a run it overrides the text model across agents. All models are OpenRouter ids via the single `OPENROUTER_API_KEY`/`OPEN_ROUTER` key.

## 1. Objective
Build the six AgentKit agents and assemble them into a network governed by a **deterministic, state-driven code router** that walks Research → Verify → Write → Edit → Illustrate → Publish by inspecting `network.state.data` and stops when `published === true`. The router is the orchestrator's decision logic (no LLM routing).

## 2. Background & context
Uses `gpt5()` (T02) and the four tools (T03). Downstream, T05 wraps `network.run(topic)` in a durable Inngest function; T18 tests router determinism. Product principle: **trust through sources** — Writer/Editor may only use verified findings.

## 3. Scope
**In scope:** six agent definitions, `network.ts` (createNetwork + router), the state contract, prompt design, memory/dedupe query.
**Out of scope:** durability/persistence/telemetry (T05); API triggering (T06).

## 4. Requirements — step-by-step spec
1. Create agents with `createAgent`, each using `gpt5(overrides)` (override from `state.data.options.model`), a role system prompt, and correct tool bindings:
   - `research.ts` — tools `web_search`, `fetch_url` → writes `state.data.research: Finding[]`.
   - `verify.ts` — tool `web_search` → re-checks each claim, sets `verified`, writes `state.data.verifiedFindings: Finding[]`; **drops or flags** unsupported claims.
   - `writer.ts` — no tools → writes `state.data.draft`, grounded strictly in `verifiedFindings`; inject `options.tone`/`options.length` into the prompt.
   - `editor.ts` — no tools → writes `state.data.finalPost` + `state.data.title`; ensures claims trace to sources.
   - `illustrator.ts` — tool `generate_poster` → writes `state.data.posterImageId`.
   - `publisher.ts` — tool `save_post` → writes `state.data.published` + `postId`.
2. `network.ts`: `createNetwork({ agents, defaultState, router })`. **Deterministic router** if-ladder:
   ```
   if (!state.research)         return researchAgent
   if (!state.verifiedFindings) return verifyAgent
   if (!state.draft)            return writerAgent
   if (!state.finalPost)        return editorAgent
   if (!state.posterImageId)    return illustratorAgent
   if (!state.published)        return publisherAgent
   return undefined // done
   ```
3. State contract: each agent writes **only** its designated keys with the correct shapes (`Finding[]` / string / id). No agent runs out of order for any partial state.
4. **Memory/dedupe (in scope):** before/within the run, query prior posts (repository `listPosts`) to give the router/agents context and support duplicate-topic awareness (enforcement at submit time is T19).
5. Apply caps: max findings, max sources, max router iterations (safety bound).

## 5. Files to create / modify
- `post-forge/src/agents/network.ts` — createNetwork + router
- `post-forge/src/agents/research.ts`, `verify.ts`, `writer.ts`, `editor.ts`, `illustrator.ts`, `publisher.ts`

## 6. Interfaces & contracts
- `network` (and a `buildNetwork(options)` factory) is the unit T05 runs.
- The state keys (`research`, `verifiedFindings`, `draft`, `finalPost`, `title`, `posterImageId`, `published`, `postId`) are the contract T05 persists from.

## 7. Acceptance criteria — Definition of Done
- [ ] Router is deterministic: for any partial state it selects the correct next agent and returns `undefined` only once `published === true`.
- [ ] `network.run(topic)` in a standalone harness advances through all six stages and terminates with `published === true`.
- [ ] Each agent populates only its own state keys with correct shapes; no agent runs out of order under any partial-state input.
- [ ] Verify actually drops/flags unsupported claims (the `verified` flag reflects the re-check).
- [ ] Writer/Editor outputs reference only verified findings; tone/length options affect the output.

## 8. Verification
1. Unit-test the router: feed hand-built partial states and assert the returned agent for each (feeds T18).
2. Run `buildNetwork(options).run("World Cup 2026")` in a script with real keys → observe all six stages fire in order and terminate.
3. Inspect final state: `verifiedFindings` has `verified` booleans; `finalPost`/`title`/`posterImageId`/`published` set.
4. Set `options.tone="witty", length="short"` → confirm the draft reflects it.

## 9. Dependencies & sequencing
`depends_on: [T02, T03]`. `blocks: [T05, T18]`. Wave 3, in parallel with T17.

## 10. Risks & open questions
- Prompt quality for Verify's drop-vs-flag policy — define explicitly.
- Guard against infinite router loops with an iteration cap.
- Keep the memory query cheap (limit + projection).
