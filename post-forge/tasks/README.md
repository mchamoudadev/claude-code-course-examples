# PostForge — Task Orchestration Board

This folder is the **single control surface** for building PostForge. It holds one **BRD (requirements doc) per task**, the machine-readable **`status.json`** the orchestrator reads and writes, and the **[discovery & escalation channel](REPORTS.md)** (`REPORTS.md` + `reports.jsonl`) agents use to raise findings mid-build. Every BRD carries a `status` field, full requirements, an explicit **Definition of Done**, and **Verification** steps.

> References: architecture → `../PLAN.md` · design brief → `../DESIGN_PROMPT.md`

---

## The orchestrator model

**One orchestrator agent drives the whole build.** It does not implement tasks itself — it coordinates dependent **task-implementer agents** and keeps a live picture of what's done, in-flight, and blocked.

**Orchestrator loop:**
1. Read `status.json` (the source of truth), each task's `depends_on`, and any open reports in `reports.jsonl`.
2. A task becomes **`ready`** the moment **all** of its `depends_on` are `done`. This is the "wait for previous tasks" guarantee — nothing starts early.
3. Dispatch every `ready` task in the current **wave** to an implementer agent (tasks in the same wave run in parallel). Mark them `in-progress`. **Include the [Reporting Protocol](REPORTS.md) in each agent's brief** so it knows how to raise discoveries.
4. **Drain open reports** each cycle (see [REPORTS.md](REPORTS.md)): triage every new `reports.jsonl` entry — resolve it autonomously (amend a BRD, add a task/edge, update `status.json`), or if it is `blocking` / needs a decision, **pause the affected tasks and escalate to the human**. Record the outcome on the report.
5. When an implementer reports finished, run the task's **Verification** section (per its `verify` mode). On pass → `in-review` → `done`; on fail → back to `in-progress` with notes.
6. Recompute which tasks are now `ready` (their deps just went `done`) and continue to the next wave.
7. Stop when every task is `done` (T16, the end-to-end verification gate, is last).

**Progress visibility:** `status.json` + the board table always answer "what's done, what's left, what's blocked, and why"; `REPORTS.md` answers "what did the agents discover, and what's waiting on a human." Update them whenever a task or report changes state.

### Status lifecycle
`blocked` → `ready` → `in-progress` → `in-review` → `done`
(`blocked` = a dependency isn't `done` yet · `ready` = all deps done, not started · `in-review` = built, running verification.)

### Verification methodology
Every task carries a `verify` mode in `status.json`:
- **`screen`** — for every UI task. Launch the app (`/run` or `npm run dev`) and drive the **real screen** in the browser (Claude-in-Chrome); capture a **screenshot** of each route at desktop + mobile and confirm it matches the imported cloud design (T07) and the task's acceptance criteria (light theme, AA, responsive, reduced-motion where relevant). A UI task is only `done` when its screens are verified **visually**, not just by passing commands.
- **`command`** — for backend/lib tasks: run the documented commands/observations (build/typecheck/test, Inngest dashboard steps, DB/GridFS round-trips).
- **`mixed`** — both (e.g. T01 dev-server boot, T16 full E2E, T19 API + New Post message).

### Where the cloud design lives
The finished design from Claude Cloud Design (`PostForge.dc.html`) is **its own dependent task — [T07](T07-design-system.md)** — **not** part of scaffolding. T01 only creates the empty `src/components` + `globals.css`; **T07 imports the design via the claude_design MCP** and fills those with real tokens + components. T07 is **Wave 1** (parallel with the backend) and **blocks T08/T09**, so every UI screen transitively waits on the design import. It is managed centrally there — no other task re-imports it.

---

## Dependency graph

```
                              T01  scaffold + Inngest wiring + env contract
                               │
              ┌────────────────┴────────────────┐
      BACKEND TRACK                        DESIGN / UI TRACK
              │                                  │
   T02 foundation libs                 T07 design system (import PostForge.dc.html
   (mongo/GridFS, data model,              via claude_design MCP → tokens + components
    model+image adapters,                  + timeline-node / citation-chip primitives)
    settings store)                     ┌─────┴─────┐
              │                       T08 app shell  T09 public
   T03 agent tools ── T17 seed        + global       landing + auth (stub)
              │        data           states
   T04 agents + router                   │
              │                          │
   T05 durable orchestration ── T18 tests
       (+telemetry,+subprogress)         │
              │                          │
   T06 API surface ── T19 rate-limit     │
              └───────────────┬──────────┘
                              │  (screens need API + design)
   ┌──────────┬───────────┬───┴────┬──────────┬──────────┐
  T10 New    T11 Pipeline  T13 Dash T14 Sched  T15 Settings
  Post       hero (poll)   +Library +cron
              │
            T12 Post detail (done-state of posts/[id])

  FINAL GATE:  T16 README + end-to-end verification (waits on all leaf tasks)
```

## Build waves (a task starts only when every `depends_on` is `done`)

| Wave | Tasks (parallel within a wave) |
|------|--------------------------------|
| 0 | T01 |
| 1 | T02 · T07 |
| 2 | T03 · T08 · T09 |
| 3 | T04 · T17 |
| 4 | T05 |
| 5 | T06 |
| 6 | T10 · T11 · T13 · T14 · T15 · T18 · T19 |
| 7 | T12 |
| 8 | T16 |

---

## Live status board

| ID | Task | Status | Wave | Depends on | Blocks |
|----|------|--------|------|-----------|--------|
| [T01](T01-scaffolding.md) | Scaffolding, Inngest wiring & env contract | `done` | 0 | — | T02, T07 |
| [T02](T02-foundation-libs.md) | Foundation libs: Mongo/GridFS, data model, adapters, settings | `done` | 1 | T01 | T03, T04, T05, T06, T14, T17 |
| [T03](T03-agent-tools.md) | AgentKit tools (search/fetch/poster/save) | `done` | 2 | T02 | T04, T15, T17 |
| [T04](T04-agents-and-router.md) | Six agents + deterministic router | `done` | 3 | T02, T03 | T05, T18 |
| [T05](T05-orchestration.md) | Durable orchestration (+telemetry, +subprogress) | `done` | 4 | T02, T04 | T06, T11, T14, T18 |
| [T06](T06-api-surface.md) | API surface (generate/posts/poster/stats/settings) | `done` | 5 | T02, T05 | T10, T11, T12, T13, T15, T18, T19 |
| [T07](T07-design-system.md) | Design system — import via claude_design MCP | `done` | 1 | T01 | T08, T09 |
| [T08](T08-app-shell.md) | App shell, navigation & global states | `done` | 2 | T07 | T10, T11, T13, T14, T15 |
| [T09](T09-public-surface.md) | Public surface — landing + auth (stub) | `done` | 2 | T07 | T16 |
| [T10](T10-new-post.md) | New Post screen + trigger flow | `done` | 6 | T06, T08 | T16 |
| [T11](T11-pipeline-showcase.md) | Pipeline showcase (hero) + live polling | `done` | 6 | T05, T06, T08 | T12, T16 |
| [T12](T12-post-detail.md) | Post detail (finished article) | `done` | 7 | T06, T11 | T16 |
| [T13](T13-dashboard-library.md) | Dashboard + Library (browse & analytics) | `done` | 6 | T06, T08 | T16 |
| [T14](T14-scheduled-cron.md) | Scheduled / cron management | `done` | 6 | T02, T05, T08 | T16 |
| [T15](T15-settings.md) | Settings (status/test-connection, defaults) | `done` | 6 | T03, T06, T08 | T16 |
| [T16](T16-verification.md) | README + end-to-end verification | `done` | 8 | T09–T15, T17, T18, T19 | — |
| [T17](T17-seed-data.md) | Seed / demo data & fixtures | `done` | 3 | T02, T03 | T16 |
| [T18](T18-tests.md) | Automated test suite | `done` | 6 | T04, T05, T06 | T16 |
| [T19](T19-rate-limit-dedupe.md) | Rate-limit + dedupe guard | `done` | 6 | T06 | T16 |

_Keep this table and `status.json` in sync as tasks progress._

---

## Locked decisions (apply across all BRDs)
- **Auth:** cosmetic stub, single-tenant (no sessions, no `userId`).
- **API keys:** env-only; Settings shows status + test-connection, no key entry.
- **Live progress:** polling `GET /api/posts/[id]` + persisted per-stage sub-progress (reveal-on-update; no token streaming).
- **Doc ownership:** `POST /api/generate` creates the doc + mints `runId`; the Inngest function only updates it.
- **Design system:** imported from `PostForge.dc.html` via the **claude_design MCP** (not a file on disk).
