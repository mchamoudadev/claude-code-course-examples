/**
 * PostForge durable orchestration — `generatePost`.
 *
 * Wraps the T04 agent network (`buildNetwork(...).run(topic)`) in an Inngest
 * durable function so every model inference and tool call is a retryable,
 * inspectable step, and each pipeline stage's progress is persisted to Mongo
 * incrementally so the UI can poll live.
 *
 * ── AgentKit ↔ Inngest inference path (verified against @inngest/agent-kit@0.13.2
 *    + inngest@4.11.0, and reproduced live) ─────────────────────────────────
 * AgentKit auto-detects the Inngest step tools from async context
 * (`getStepTools()`) and, when present, offloads **every model inference to
 * `step.ai.infer(...)`** — i.e. the Inngest AI-Gateway makes the OpenRouter HTTP
 * call. That offload **400s on OpenRouter/GPT-5** (confirmed: the exact request
 * body returns HTTP 200 when POSTed directly to OpenRouter, but the AI-Gateway
 * transport rejects it — see report R-0016). Left alone the run stalls forever
 * in `researching` on the first inference.
 *
 * FIX (route 2, coordinator-endorsed): run `network.run(...)` **outside the
 * Inngest step async-context** via `AsyncLocalStorage.exit(...)` so
 * `getStepTools()` returns `undefined` and AgentKit uses its **direct
 * `performInference` HTTP path** (the exact path T04's standalone run proved
 * works). The whole network runs inside ONE durable `step.run("run-network")`
 * (so it is retried as a unit with backoff, and memoized on success). Trade-off:
 * individual inferences/tool calls are no longer discrete Inngest steps
 * (Acceptance §7.4) — a working end-to-end run beats that observability nicety.
 *
 * PERSISTENCE: a **router override** is the per-stage lifecycle hook. AgentKit
 * re-invokes the router after every agent turn (`getNextAgents → router`); it
 * reuses T04's pure `selectNextAgentId` to route AND persists each stage as it
 * completes. Because the router runs inside the (step-less) `als.exit` scope, the
 * per-stage writes are **direct, idempotent repo calls** (not nested `step.run`).
 * On the happy path the enclosing `run-network` step memoizes, so persistence
 * runs exactly once; on a network-step retry the `$set` writes are idempotent and
 * only a failed doc's `$inc`/`$push` telemetry may inflate (acceptable — the doc
 * is terminal). Stage id == agent name == telemetry key, so stage↔persistence 1:1.
 *
 * Authoritative persistence (R-0011): `state.finalPost/title/sources` — not the
 * CHEAP publisher model's `save_post` tool args — are the source of truth, so we
 * (re)write them from network state at the edit + publish stages.
 *
 * Doc ownership (contract): `POST /api/generate` (T06) creates the doc + mints
 * `runId`; this function only *updates* it. Idempotency is keyed on `runId` (the
 * doc has a unique `runId` index, all stage writes are `$set`, and the network
 * runs inside a memoized step), reinforced by the function-level `idempotency`.
 */

import { NonRetriableError } from "inngest";
import { ObjectId } from "mongodb";
import type { Agent } from "@inngest/agent-kit";
import { inngest } from "@/inngest/client";
import {
  buildNetwork,
  selectNextAgentId,
  type BuildNetworkOptions,
  type RouterAgentId,
} from "@/agents/network";
import {
  appendSubProgress,
  getPostById,
  recordError,
  recordTelemetry,
  saveFindings,
  saveSources,
  setStatus,
  updateStage,
  type TelemetryPatch,
} from "@/lib/posts-repo";
import { getDb, POSTS_COLLECTION } from "@/lib/mongo";
import {
  STAGES,
  type Finding,
  type GenerationOptions,
  type NetworkState,
  type Post,
  type PostError,
  type PostStatus,
  type Source,
  type Stage,
  type StageState,
  type SubProgressEntry,
} from "@/lib/state";

/* -------------------------------------------------------------------------- */
/* Contract: event + function config                                          */
/* -------------------------------------------------------------------------- */

/** The event this function subscribes to (produced by T06 and reused by T14). */
export const GENERATE_POST_EVENT = "post/generate.requested" as const;

/**
 * Function-level retry budget (Inngest retries a failed step this many times
 * with exponential backoff before it is terminal). Kept modest because the whole
 * network runs inside ONE `run-network` step, so a retry re-runs the entire
 * network — re-inferring completed stages — which spends OpenRouter credits (see
 * R-0010). 2 retries still demonstrates backoff without a costly re-run storm.
 */
export const RETRIES = 2;

/** The `post/generate.requested` payload (minted by T06 / T14). */
export interface GeneratePostEventData {
  postId: string;
  runId: string;
  topic: string;
  options?: GenerationOptions;
}

/** Status shown while a given stage is running. */
const STATUS_BY_STAGE: Record<Stage, PostStatus> = {
  research: "researching",
  verify: "verifying",
  write: "writing",
  edit: "editing",
  illustrate: "illustrating",
  publish: "publishing",
};

/** Stage → pipeline position, for "which stages are now complete" math. */
const STAGE_INDEX: Record<Stage, number> = STAGES.reduce(
  (acc, stage, i) => {
    acc[stage] = i;
    return acc;
  },
  {} as Record<Stage, number>,
);

/** Max sub-progress detail items packed into one bounded entry. */
const MAX_SUBPROGRESS_ITEMS = 12;

/* -------------------------------------------------------------------------- */
/* Injection seams (so the orchestration is verifiable with a stubbed network) */
/* -------------------------------------------------------------------------- */

/** Minimal step surface we use — satisfied by Inngest's `step` and by a fake. */
export interface StepLike {
  run<T>(id: string, fn: () => T | Promise<T>): Promise<T>;
}

/** Only the bits of an `AgentResult` we read for token telemetry. */
export interface TokenSource {
  agentName: string;
  raw?: string;
}

/** Context handed to the stage router on every network turn. */
export interface RouterContext {
  /** Live `network.state.data` (the six output keys fill in as stages finish). */
  data: Partial<NetworkState>;
  /** All inference results so far (`network.state.results`) — for token sums. */
  results: readonly TokenSource[];
  /** Resolve a stage id to the concrete agent the network should run next. */
  resolveAgent: (id: RouterAgentId) => unknown;
}

/**
 * The per-turn hook. Returns the next agent to run (opaque to the network layer)
 * or `undefined` to stop. Both the real network and the stubbed network drive
 * this exact function, so its persistence side effects are what the tests assert.
 */
export type StageRouter = (ctx: RouterContext) => Promise<unknown>;

/**
 * Build + run the network with our stage router, returning the final
 * `state.data`. The default implementation runs the real AgentKit network; tests
 * inject a stub whose `.run()` drives the same `StageRouter` with canned outputs.
 */
export type RunNetwork = (
  build: BuildNetworkOptions,
  router: StageRouter,
) => Promise<Partial<NetworkState>>;

/** A patch of the post-document fields that have no dedicated repo helper. */
export interface PostFieldPatch {
  finalPost?: string;
  title?: string;
  draft?: string;
  posterImageId?: string;
}

/** The persistence surface — the T02 repo plus a raw `$set` for bare fields. */
export interface PostPersistence {
  updateStage(
    id: string,
    stage: Stage,
    patch: Partial<StageState>,
  ): Promise<Post | null>;
  appendSubProgress(
    id: string,
    entry: Omit<SubProgressEntry, "at"> & { at?: Date },
  ): Promise<Post | null>;
  setStatus(
    id: string,
    status: PostStatus,
    error?: PostError,
  ): Promise<Post | null>;
  saveSources(id: string, sources: Source[]): Promise<Post | null>;
  saveFindings(
    id: string,
    field: "research" | "verifiedFindings",
    findings: Finding[],
  ): Promise<Post | null>;
  recordTelemetry(id: string, patch: TelemetryPatch): Promise<Post | null>;
  recordError(id: string, stage: Stage, message: string): Promise<Post | null>;
  getPostById(id: string): Promise<Post | null>;
  /** `$set` the post fields lacking a repo helper (finalPost/title/draft/poster). */
  setPostFields(id: string, fields: PostFieldPatch): Promise<Post | null>;
}

/** Everything `runGeneration` reaches outside itself — swappable in tests. */
export interface GenerationDeps {
  runNetwork: RunNetwork;
  persist: PostPersistence;
}

/** Raw `$set` for the post fields the T02 repo has no dedicated helper for. */
async function setPostFields(
  id: string,
  fields: PostFieldPatch,
): Promise<Post | null> {
  if (!ObjectId.isValid(id)) return null;
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) set[k] = v;
  }
  const db = await getDb();
  const col = db.collection<Post>(POSTS_COLLECTION);
  return col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: set },
    { returnDocument: "after" },
  );
}

/** Default persistence — the real T02 repo + the raw field setter. */
export const defaultPersistence: PostPersistence = {
  updateStage,
  appendSubProgress,
  setStatus,
  saveSources,
  saveFindings,
  recordTelemetry,
  recordError,
  getPostById,
  setPostFields,
};

/** Minimal AsyncLocalStorage surface we need (Node's `als.exit`). */
interface ExitableStore {
  exit<T>(fn: () => T): T;
}

/**
 * Run `fn` OUTSIDE Inngest's step async-context so AgentKit's `getStepTools()`
 * returns `undefined` and the network uses its direct HTTP inference path (which
 * OpenRouter accepts) instead of the AI-Gateway offload (which 400s). Inngest
 * stores its singleton `AsyncLocalStorage` on a global symbol; we call `.exit()`
 * on it. If it is unavailable (e.g. a non-Inngest test path, or a runtime
 * without `async_hooks`), the store is already absent, so running `fn` directly
 * yields the same direct path.
 */
async function runOutsideStepContext<T>(fn: () => Promise<T>): Promise<T> {
  const cache = (
    globalThis as Record<symbol, { resolved?: unknown; promise?: Promise<unknown> } | undefined>
  )[Symbol.for("inngest:als")];
  const als =
    (cache?.resolved as ExitableStore | undefined) ??
    ((cache?.promise ? await cache.promise : undefined) as ExitableStore | undefined);
  if (als && typeof als.exit === "function") {
    return als.exit(fn);
  }
  return fn();
}

/**
 * Default network runner — builds the real AgentKit network and runs it OUTSIDE
 * the step context (direct inference; see the module header + R-0016). The router
 * override reuses T04's pure `selectNextAgentId` and drives per-stage persistence.
 */
export const defaultRunNetwork: RunNetwork = async (build, stageRouter) => {
  const network = buildNetwork(build);
  const run = await runOutsideStepContext(() =>
    network.run(build.topic ?? "", {
      router: async ({ network: nr }) => {
        const selection = await stageRouter({
          data: nr.state.data as Partial<NetworkState>,
          results: nr.state.results as readonly TokenSource[],
          resolveAgent: (id) => nr.agents.get(id),
        });
        return selection as Agent<NetworkState> | undefined;
      },
    }),
  );
  return run.state.data as Partial<NetworkState>;
};

/** Wire the real deps. */
export const defaultDeps: GenerationDeps = {
  runNetwork: defaultRunNetwork,
  persist: defaultPersistence,
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** True once `stage`'s output is present in state (mirrors `selectNextAgentId`). */
function completedStages(data: Partial<NetworkState>): Stage[] {
  const next = selectNextAgentId(data);
  const boundary = next === null ? STAGES.length : STAGE_INDEX[next];
  return STAGES.slice(0, boundary);
}

/** Parse OpenAI/OpenRouter `usage` out of an `AgentResult.raw` JSON string. */
function parseTokens(raw?: string): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as {
      usage?: {
        total_tokens?: number;
        prompt_tokens?: number;
        completion_tokens?: number;
      };
    };
    const usage = parsed?.usage;
    if (!usage) return 0;
    if (typeof usage.total_tokens === "number") return usage.total_tokens;
    const p = typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : 0;
    const c =
      typeof usage.completion_tokens === "number" ? usage.completion_tokens : 0;
    return p + c;
  } catch {
    return 0;
  }
}

/** Sum tokens across every inference this agent made (spans multi-turn stages). */
function sumTokens(results: readonly TokenSource[], agentName: string): number {
  let total = 0;
  for (const r of results) {
    if (r.agentName === agentName) total += parseTokens(r.raw);
  }
  return total;
}

/** Wall-clock ms for a stage from its persisted start/end timestamps. */
function stageMs(doc: Post | null, stage: Stage): number {
  const s = doc?.stages?.[stage];
  if (!s?.startedAt || !s?.endedAt) return 0;
  const ms = new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime();
  return ms > 0 ? ms : 0;
}

/**
 * Which stage was in-flight when the run stopped — derived from the persisted
 * doc (robust even when Inngest surfaces an exhausted-step error WITHOUT re-running
 * the network body, which would leave any in-memory tracker stale). The failing
 * stage is the one left `active`; failing that, the furthest stage that started.
 */
function failingStage(doc: Post | null): Stage | null {
  if (!doc) return null;
  for (const s of STAGES) if (doc.stages[s]?.state === "active") return s;
  let frontier: Stage | null = null;
  for (const s of STAGES) if (doc.stages[s]?.state !== "queued") frontier = s;
  return frontier;
}

/** Bounded, reveal-on-update sub-progress artifacts derived from stage output. */
function subProgressFor(
  stage: Stage,
  data: Partial<NetworkState>,
): Array<Omit<SubProgressEntry, "at">> {
  switch (stage) {
    case "research": {
      const findings = data.research ?? [];
      const sources = dedupeSources(findings).slice(0, MAX_SUBPROGRESS_ITEMS);
      return [
        {
          stage,
          kind: "sources",
          data: { count: findings.length, sources },
        },
      ];
    }
    case "verify": {
      const verified = data.verifiedFindings ?? [];
      const claims = verified.slice(0, MAX_SUBPROGRESS_ITEMS).map((f) => ({
        claim: f.claim,
        verified: f.verified,
      }));
      return [
        {
          stage,
          kind: "claims",
          data: { count: verified.length, claims },
        },
      ];
    }
    case "write":
      return [
        { stage, kind: "draft", data: { chars: (data.draft ?? "").length } },
      ];
    case "edit":
      return [
        {
          stage,
          kind: "final",
          data: {
            title: data.title ?? "",
            chars: (data.finalPost ?? "").length,
          },
        },
      ];
    case "illustrate":
      return [
        {
          stage,
          kind: "poster",
          data: { status: "poster-ready", posterImageId: data.posterImageId },
        },
      ];
    case "publish":
      return [
        {
          stage,
          kind: "saved",
          data: { status: "saved", postId: data.postId },
        },
      ];
  }
}

/** De-duplicate finding sources by url (bounded copy for sub-progress). */
function dedupeSources(findings: Finding[]): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const f of findings) {
    const url = f.source?.url?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ title: f.source.title?.trim() || url, url });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Core orchestration (dependency-injected for deterministic verification)    */
/* -------------------------------------------------------------------------- */

/** What a finished (or failed) generation returns. */
export interface GenerationResult {
  postId: string;
  runId: string;
  status: PostStatus | "unknown";
  completedStages: Stage[];
  failed?: { stage: Stage; message: string };
}

/**
 * The testable core. Loads the post doc, runs the network with a stage router
 * that persists each stage incrementally, and handles terminal failure. Every
 * external effect is a named `step.run` (durable + memoized) or goes through the
 * injected `persist`, so it can be exercised with a stubbed network + fake step.
 */
export async function runGeneration(
  event: { data: GeneratePostEventData },
  step: StepLike,
  deps: GenerationDeps = defaultDeps,
): Promise<GenerationResult> {
  const { postId, runId, topic, options } = event.data;
  const { persist } = deps;

  // The doc must already exist (created by POST /api/generate). A missing doc is
  // a caller error, not a transient fault — do not burn retries on it.
  const existing = await step.run("load-post", () => persist.getPostById(postId));
  if (!existing) {
    throw new NonRetriableError(
      `generatePost: post ${postId} not found — POST /api/generate must create it (and mint runId=${runId}) before emitting ${GENERATE_POST_EVENT}`,
    );
  }

  const activated = new Set<Stage>();
  const finalized = new Set<Stage>();
  let currentStage: Stage = "research";

  // Per-stage persistence runs inside the (step-less) network scope, so these are
  // direct idempotent repo writes rather than nested `step.run`s. The `activated`
  // / `finalized` guards keep each write to once per network execution.
  const activateStage = async (stage: Stage): Promise<void> => {
    if (activated.has(stage)) return;
    activated.add(stage);
    currentStage = stage;
    await persist.updateStage(postId, stage, { state: "active" });
    await persist.setStatus(postId, STATUS_BY_STAGE[stage]);
  };

  const completeStage = async (
    stage: Stage,
    ctx: RouterContext,
  ): Promise<void> => {
    if (finalized.has(stage)) return;
    finalized.add(stage);
    const { data, results } = ctx;

    // 1. Persist the stage's authoritative output (idempotent $set writes).
    switch (stage) {
      case "research":
        await persist.saveFindings(postId, "research", data.research ?? []);
        break;
      case "verify":
        await persist.saveFindings(
          postId,
          "verifiedFindings",
          data.verifiedFindings ?? [],
        );
        await persist.saveSources(postId, data.sources ?? []);
        break;
      case "write":
        await persist.setPostFields(postId, { draft: data.draft });
        break;
      case "edit":
        // R-0011: state.finalPost/title are authoritative.
        await persist.setPostFields(postId, {
          finalPost: data.finalPost,
          title: data.title,
        });
        break;
      case "illustrate":
        await persist.setPostFields(postId, {
          posterImageId: data.posterImageId,
        });
        break;
      case "publish":
        // R-0011: re-assert authoritative content over whatever save_post wrote
        // from the CHEAP model's tool args, and flip to done.
        await persist.setPostFields(postId, {
          finalPost: data.finalPost,
          title: data.title,
        });
        await persist.saveSources(postId, data.sources ?? []);
        break;
    }

    // 2. Mark the stage done (stamps endedAt) and read timing off the doc.
    const updated = await persist.updateStage(postId, stage, { state: "done" });

    // 3. Telemetry: tokens for this agent + wall-clock ms for this stage.
    const tokens = sumTokens(results, stage);
    const ms = stageMs(updated, stage);
    const telemetry: TelemetryPatch = { agent: stage, stage };
    if (tokens > 0) telemetry.tokens = tokens;
    if (ms > 0) telemetry.ms = ms;
    if (telemetry.tokens !== undefined || telemetry.ms !== undefined) {
      await persist.recordTelemetry(postId, telemetry);
    }

    // 4. Bounded sub-progress artifacts (reveal-on-update; no per-token writes).
    for (const entry of subProgressFor(stage, data)) {
      await persist.appendSubProgress(postId, entry);
    }

    // 5. On publish, the whole run is done.
    if (stage === "publish") {
      await persist.setStatus(postId, "done");
    }
  };

  const stageRouter: StageRouter = async (ctx) => {
    const { data, resolveAgent } = ctx;

    // Finalize every stage whose output has appeared since we last looked.
    for (const stage of completedStages(data)) {
      await completeStage(stage, ctx);
    }

    // Route to the next agent, marking it active first so a poller sees it.
    const nextId = selectNextAgentId(data);
    if (nextId === null) return undefined; // run complete
    await activateStage(nextId);
    return resolveAgent(nextId);
  };

  // Run the whole network inside ONE durable step (direct inference happens
  // inside `deps.runNetwork`, outside the step context). Inngest retries this
  // step with backoff on failure and memoizes it on success; the per-stage
  // persistence above runs during its execution. A rare unrecoverable failure
  // (retries exhausted) surfaces here.
  let finalData: Partial<NetworkState>;
  try {
    finalData = await step.run("run-network", () =>
      deps.runNetwork({ postId, runId, topic, options }, stageRouter),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Derive the failing stage from the persisted doc (the in-flight stage was
    // left `active` before the throw) rather than trusting in-memory state.
    const failedDoc = await step.run("load-failed", () =>
      persist.getPostById(postId),
    );
    const stage = failingStage(failedDoc) ?? currentStage;
    await step.run(`fail-${stage}`, async () => {
      await persist.updateStage(postId, stage, {
        state: "failed",
        detail: message.slice(0, 500),
      });
      // recordError flips status → "failed" and sets error {stage,message}.
      await persist.recordError(postId, stage, message);
      return { stage, message };
    });
    return {
      postId,
      runId,
      status: "failed",
      completedStages: [...finalized],
      failed: { stage, message },
    };
  }

  // Guard: the loop can stop early (maxIter / no output) without publishing.
  if (!finalData.published) {
    const stalledDoc = await step.run("load-incomplete", () =>
      persist.getPostById(postId),
    );
    const stage = failingStage(stalledDoc) ?? currentStage;
    const message =
      "generation ended before publishing (max iterations reached or an agent produced no usable output)";
    await step.run(`incomplete-${stage}`, async () => {
      await persist.updateStage(postId, stage, { state: "failed" });
      await persist.recordError(postId, stage, message);
      return { stage, message };
    });
    return {
      postId,
      runId,
      status: "failed",
      completedStages: [...finalized],
      failed: { stage, message },
    };
  }

  const finalDoc = await step.run("result", () => persist.getPostById(postId));
  return {
    postId,
    runId,
    status: finalDoc?.status ?? "done",
    completedStages: [...finalized],
  };
}

/* -------------------------------------------------------------------------- */
/* The registered Inngest function                                            */
/* -------------------------------------------------------------------------- */

/**
 * The durable generation orchestration. Registered in the Inngest serve handler
 * (`src/app/api/inngest/route.ts`). Triggered by `post/generate.requested`
 * (T06 `POST /api/generate`, T14 cron).
 */
export const generatePost = inngest.createFunction(
  {
    id: "generate-post",
    retries: RETRIES,
    // Idempotency on runId: a duplicate event for the same run is a no-op, and
    // the doc is keyed by a unique runId so retries never fork a second doc.
    idempotency: "event.data.runId",
    // inngest@4: the trigger lives inside options (2-arg createFunction).
    triggers: [{ event: GENERATE_POST_EVENT }],
  },
  async ({ event, step }) => {
    // Adapt Inngest's `step` to our minimal StepLike (keeps runGeneration
    // decoupled from Inngest's step generics so it is unit-testable).
    const stepLike: StepLike = {
      run<T>(id: string, fn: () => T | Promise<T>): Promise<T> {
        return (
          step.run as unknown as (i: string, f: () => unknown) => Promise<unknown>
        )(id, fn) as Promise<T>;
      },
    };
    return runGeneration(
      event as unknown as { data: GeneratePostEventData },
      stepLike,
      defaultDeps,
    );
  },
);
