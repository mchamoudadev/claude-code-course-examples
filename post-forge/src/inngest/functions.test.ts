/**
 * Stubbed-network verification for the durable orchestration (T05).
 *
 * These tests exercise `runGeneration` with a FAKE network + FAKE persistence +
 * memoizing FAKE step — zero live LLM / Serper / image calls, zero Mongo — so
 * the whole lifecycle (incremental persistence, authoritative content,
 * telemetry, failure, idempotency) is asserted deterministically and for free.
 * (Credit-conscious verification, R-0010.) The authoritative live end-to-end run
 * is the orchestrator's job via `inngest-cli dev`.
 */

import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import {
  runGeneration,
  type GenerationDeps,
  type PostFieldPatch,
  type PostPersistence,
  type RunNetwork,
  type StepLike,
  type TokenSource,
} from "@/inngest/functions";
import type { RouterAgentId } from "@/agents/network";
import {
  initialStages,
  type NetworkState,
  type Post,
  type PostError,
  type PostStatus,
  type Stage,
  type StageState,
} from "@/lib/state";

/* -------------------------------------------------------------------------- */
/* Fakes                                                                      */
/* -------------------------------------------------------------------------- */

/** A memoizing fake step — a repeated id returns the cached value (idempotency). */
function makeFakeStep() {
  const cache = new Map<string, unknown>();
  const order: string[] = [];
  const step: StepLike = {
    async run<T>(id: string, fn: () => T | Promise<T>): Promise<T> {
      if (cache.has(id)) return cache.get(id) as T;
      order.push(id);
      const result = await fn();
      cache.set(id, result);
      return result as T;
    },
  };
  return { step, order };
}

interface LogEntry {
  op: string;
  [k: string]: unknown;
}

/** In-memory persistence recording every write in order (mirrors T02 repo). */
function makeFakePersist(postId: string, runId: string) {
  let clock = 1_000; // strictly increasing → endedAt > startedAt for every stage
  const tick = () => new Date(clock++);

  const doc: Post = {
    _id: new ObjectId(postId),
    userId: new ObjectId("0123456789abcdef01234567"),
    topic: "Test topic",
    status: "researching",
    stages: initialStages(),
    subProgress: [],
    research: [],
    verifiedFindings: [],
    sources: [],
    options: {},
    telemetry: { tokensByAgent: {}, timingsByStage: {} },
    runId,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };

  const log: LogEntry[] = [];
  const counts = {
    updateStage: 0,
    setStatus: 0,
    saveFindings: 0,
    saveSources: 0,
    recordTelemetry: 0,
    appendSubProgress: 0,
    setPostFields: 0,
    recordError: 0,
    getPostById: 0,
  };

  const persist: PostPersistence = {
    async getPostById(id) {
      counts.getPostById++;
      return id === postId ? doc : null;
    },
    async updateStage(id, stage, patch) {
      counts.updateStage++;
      const s: StageState = doc.stages[stage];
      if (patch.state !== undefined) s.state = patch.state;
      if (patch.detail !== undefined) s.detail = patch.detail;
      if (patch.state === "active" && !s.startedAt) s.startedAt = tick();
      if (patch.state === "done" || patch.state === "failed") s.endedAt = tick();
      doc.updatedAt = tick();
      log.push({ op: "updateStage", stage, state: patch.state });
      return doc;
    },
    async setStatus(id, status, error) {
      counts.setStatus++;
      doc.status = status;
      if (error) doc.error = error;
      log.push({ op: "setStatus", status });
      return doc;
    },
    async saveFindings(id, field, findings) {
      counts.saveFindings++;
      doc[field] = findings;
      log.push({ op: "saveFindings", field, n: findings.length });
      return doc;
    },
    async saveSources(id, sources) {
      counts.saveSources++;
      doc.sources = sources;
      log.push({ op: "saveSources", n: sources.length });
      return doc;
    },
    async recordTelemetry(id, patch) {
      counts.recordTelemetry++;
      if (patch.agent && typeof patch.tokens === "number") {
        doc.telemetry.tokensByAgent[patch.agent] =
          (doc.telemetry.tokensByAgent[patch.agent] ?? 0) + patch.tokens;
      }
      if (patch.stage && typeof patch.ms === "number") {
        doc.telemetry.timingsByStage[patch.stage] =
          (doc.telemetry.timingsByStage[patch.stage] ?? 0) + patch.ms;
      }
      log.push({ op: "recordTelemetry", agent: patch.agent, stage: patch.stage });
      return doc;
    },
    async appendSubProgress(id, entry) {
      counts.appendSubProgress++;
      doc.subProgress.push({ ...entry, at: entry.at ?? tick() });
      log.push({ op: "appendSubProgress", stage: entry.stage, kind: entry.kind });
      return doc;
    },
    async recordError(id, stage, message) {
      counts.recordError++;
      doc.error = { stage, message };
      doc.status = "failed";
      log.push({ op: "recordError", stage });
      return doc;
    },
    async setPostFields(id, fields: PostFieldPatch) {
      counts.setPostFields++;
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) (doc as unknown as Record<string, unknown>)[k] = v;
      }
      log.push({ op: "setPostFields", keys: Object.keys(fields) });
      return doc;
    },
  };

  return { persist, doc, log, counts };
}

/** Canned per-stage outputs (what the real agents would write into state.data). */
const TOKENS: Record<RouterAgentId, number> = {
  research: 100,
  verify: 200,
  write: 150,
  edit: 250,
  illustrate: 50,
  publish: 30,
};

function applyCanned(
  data: Partial<NetworkState>,
  id: RouterAgentId,
  postId: string,
): void {
  switch (id) {
    case "research":
      data.research = [
        { claim: "c1", source: { title: "S1", url: "http://a" }, verified: false },
        { claim: "c2", source: { title: "S2", url: "http://b" }, verified: false },
      ];
      break;
    case "verify":
      data.verifiedFindings = [
        { claim: "c1", source: { title: "S1", url: "http://a" }, verified: true },
      ];
      data.sources = [{ title: "S1", url: "http://a" }];
      break;
    case "write":
      data.draft = "draft body text";
      break;
    case "edit":
      data.finalPost = "final published body";
      data.title = "The Final Title";
      break;
    case "illustrate":
      data.posterImageId = "poster-abc-123";
      break;
    case "publish":
      data.published = true;
      data.postId = postId;
      break;
  }
}

/**
 * A stub network whose `.run()` drives the SAME `StageRouter` the real network
 * would — router picks the next agent, we apply that agent's canned output, loop.
 * `failAt` makes a stage throw after it is activated (simulating a tool failure
 * that survives all step retries).
 */
function makeStubRunNetwork(
  postId: string,
  opts: { failAt?: RouterAgentId } = {},
): RunNetwork {
  return async (build, stageRouter) => {
    const data: Partial<NetworkState> = {
      topic: build.topic,
      options: build.options,
      runId: build.runId,
      postId: build.postId,
    };
    const results: TokenSource[] = [];
    for (let i = 0; i < 50; i++) {
      const selection = await stageRouter({
        data,
        results,
        resolveAgent: (id) => ({ name: id }),
      });
      if (!selection) break;
      const id = (selection as { name: string }).name as RouterAgentId;
      if (opts.failAt === id) {
        throw new Error(`SERPER down during ${id}`);
      }
      applyCanned(data, id, postId);
      results.push({
        agentName: id,
        raw: JSON.stringify({ usage: { total_tokens: TOKENS[id] } }),
      });
    }
    return data;
  };
}

function makeEvent(postId: string, runId: string) {
  return {
    data: { postId, runId, topic: "Test topic", options: {} },
  };
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe("generatePost orchestration (stubbed network)", () => {
  it("(a) writes status / stages / subProgress incrementally, in pipeline order", async () => {
    const postId = new ObjectId().toString();
    const runId = "run-a";
    const { persist, log } = makeFakePersist(postId, runId);
    const { step, order } = makeFakeStep();
    const deps: GenerationDeps = {
      runNetwork: makeStubRunNetwork(postId),
      persist,
    };

    await runGeneration(makeEvent(postId, runId), step, deps);

    // Top-level durable steps: the whole network runs inside one `run-network`
    // step (direct inference; persistence happens as direct writes within it).
    expect(order).toEqual(["load-post", "run-network", "result"]);

    // Status advances one stage at a time and ends on "done".
    const statuses = log
      .filter((e) => e.op === "setStatus")
      .map((e) => e.status as PostStatus);
    expect(statuses).toEqual([
      "researching",
      "verifying",
      "writing",
      "editing",
      "illustrating",
      "publishing",
      "done",
    ]);

    // Sub-progress appears once per stage, in order.
    const subStages = log
      .filter((e) => e.op === "appendSubProgress")
      .map((e) => e.stage as Stage);
    expect(subStages).toEqual([
      "research",
      "verify",
      "write",
      "edit",
      "illustrate",
      "publish",
    ]);

    // Stage rows are marked active before done (never skipped).
    const stageStates = log
      .filter((e) => e.op === "updateStage")
      .map((e) => `${e.stage}:${e.state}`);
    expect(stageStates).toEqual([
      "research:active",
      "research:done",
      "verify:active",
      "verify:done",
      "write:active",
      "write:done",
      "edit:active",
      "edit:done",
      "illustrate:active",
      "illustrate:done",
      "publish:active",
      "publish:done",
    ]);
  });

  it("(b) lands finalPost / title / sources / poster + telemetry on the doc", async () => {
    const postId = new ObjectId().toString();
    const runId = "run-b";
    const { persist, doc } = makeFakePersist(postId, runId);
    const { step } = makeFakeStep();
    const deps: GenerationDeps = {
      runNetwork: makeStubRunNetwork(postId),
      persist,
    };

    const result = await runGeneration(makeEvent(postId, runId), step, deps);

    // Authoritative content (R-0011: from state, not the CHEAP save_post args).
    expect(doc.finalPost).toBe("final published body");
    expect(doc.title).toBe("The Final Title");
    expect(doc.posterImageId).toBe("poster-abc-123");
    expect(doc.draft).toBe("draft body text");
    expect(doc.sources).toEqual([{ title: "S1", url: "http://a" }]);
    expect(doc.research).toHaveLength(2);
    expect(doc.verifiedFindings).toHaveLength(1);
    expect(doc.status).toBe("done");

    // Telemetry: tokens per agent + a positive ms per stage.
    expect(doc.telemetry.tokensByAgent).toEqual({
      research: 100,
      verify: 200,
      write: 150,
      edit: 250,
      illustrate: 50,
      publish: 30,
    });
    for (const stage of [
      "research",
      "verify",
      "write",
      "edit",
      "illustrate",
      "publish",
    ] as Stage[]) {
      expect(doc.telemetry.timingsByStage[stage]).toBeGreaterThan(0);
    }

    expect(result.status).toBe("done");
    expect(result.completedStages).toHaveLength(6);
    expect(result.failed).toBeUndefined();
  });

  it("(c) on a failing stage: status=failed + error{stage,message}, partial stages intact", async () => {
    const postId = new ObjectId().toString();
    const runId = "run-c";
    const { persist, doc } = makeFakePersist(postId, runId);
    const { step } = makeFakeStep();
    const deps: GenerationDeps = {
      runNetwork: makeStubRunNetwork(postId, { failAt: "write" }),
      persist,
    };

    const result = await runGeneration(makeEvent(postId, runId), step, deps);

    expect(result.status).toBe("failed");
    expect(result.failed?.stage).toBe("write");

    // Terminal error recorded on the doc.
    expect(doc.status).toBe("failed");
    const error = doc.error as PostError;
    expect(error.stage).toBe("write");
    expect(error.message).toMatch(/SERPER down/);

    // The failing stage is marked failed; earlier stages stayed intact/done.
    expect(doc.stages.write.state).toBe("failed");
    expect(doc.stages.research.state).toBe("done");
    expect(doc.stages.verify.state).toBe("done");
    // Stages after the failure never started.
    expect(doc.stages.edit.state).toBe("queued");
    expect(doc.stages.illustrate.state).toBe("queued");
    expect(doc.stages.publish.state).toBe("queued");

    // Partial content from completed stages survives.
    expect(doc.research).toHaveLength(2);
    expect(doc.verifiedFindings).toHaveLength(1);
    expect(doc.finalPost).toBeUndefined();
  });

  it("(d) is idempotent on retry: a re-run over memoized steps writes nothing new", async () => {
    const postId = new ObjectId().toString();
    const runId = "run-d";
    const { persist, doc, counts } = makeFakePersist(postId, runId);
    const { step, order } = makeFakeStep();
    const deps: GenerationDeps = {
      runNetwork: makeStubRunNetwork(postId),
      persist,
    };
    const event = makeEvent(postId, runId);

    // First run completes and populates everything.
    await runGeneration(event, step, deps);

    const snapshot = {
      counts: { ...counts },
      steps: order.length,
      subProgress: doc.subProgress.length,
      telemetry: JSON.stringify(doc.telemetry),
      status: doc.status,
    };
    expect(snapshot.status).toBe("done");

    // Re-run with the SAME memoizing step (every step id is cached) — simulating
    // an Inngest retry replaying the function over already-committed steps.
    await runGeneration(event, step, deps);

    // No step re-executed → no repo write repeated → no duplicate docs/work.
    expect({ ...counts }).toEqual(snapshot.counts);
    expect(order.length).toBe(snapshot.steps);
    expect(doc.subProgress.length).toBe(snapshot.subProgress);
    expect(JSON.stringify(doc.telemetry)).toBe(snapshot.telemetry);
    expect(doc.status).toBe(snapshot.status);
  });
});
