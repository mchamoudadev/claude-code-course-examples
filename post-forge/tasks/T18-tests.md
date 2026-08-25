---
id: T18
title: Automated test suite
status: blocked
wave: 6
depends_on: [T04, T05, T06]
blocks: [T16]
owner: unassigned
verify: command
---

# T18 — Automated test suite

## 1. Objective
Add automated coverage for the correctness-critical pieces — with mocked providers so no live keys are needed — anchored on the deterministic router (the correctness crux of the system).

## 2. Background & context
Uses Vitest (installed in T01). Targets T04 (router/agents), T05 (orchestration happy-path), T06 (API), and T02 (repository/env). Feeds the T16 gate.

## 3. Scope
**In scope:** unit + integration tests with mocked providers.
**Out of scope:** live-key E2E (that's T16); load/perf testing.

## 4. Requirements — step-by-step spec
1. **Router determinism** (`network.test.ts`): for every partial state permutation, assert the router returns the correct next agent and `undefined` only when `published`.
2. **Repository** (`state.test.ts` / `posts-repo.test.ts`): `updateStage` mutates one stage without clobbering siblings; `createPost` shape; `listPosts` filters/pagination (against an in-memory/mongodb-memory-server instance).
3. **Tools**: mocked Serper/image — `web_search` normalization + error path; `fetch_url` cap/SSRF; `generate_poster` GridFS write; `save_post` idempotency.
4. **Env**: `requireEnv` fail-fast throws on missing var.
5. **Happy-path integration**: with mocked model/tool calls, drive `generate → done` and assert the doc reaches `done` with populated fields.
6. Wire `npm run test` (Vitest) + a `vitest.config.ts`; mock provider modules so no network/keys are used.

## 5. Files to create / modify
- `post-forge/src/agents/network.test.ts`
- `post-forge/src/lib/state.test.ts` (or `posts-repo.test.ts`)
- `post-forge/src/agents/tools/*.test.ts`
- `post-forge/vitest.config.ts`

## 6. Interfaces & contracts
- Tests assert the contracts other tasks depend on (router decisions, repo shapes, DTOs).

## 7. Acceptance criteria — Definition of Done
- [ ] `npm run test` is green.
- [ ] Router, repository, tools, env, and a mocked happy-path are covered.
- [ ] Provider calls are mocked (no live keys required to run the suite).

## 8. Verification
1. `npm run test` → all suites pass with no network access.
2. Temporarily break the router ladder → the determinism test fails (proving coverage).

## 9. Dependencies & sequencing
`depends_on: [T04, T05, T06]`. `blocks: [T16]`. Wave 6, in parallel with the UI screens.

## 10. Risks & open questions
- Choose a Mongo test strategy (mongodb-memory-server vs mocked repository).
- Keep AgentKit/model mocking lightweight and deterministic.
