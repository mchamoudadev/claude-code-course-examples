/**
 * Posts repository (T02 → T18): createPost shape, updateStage's single-stage
 * isolation (never clobbering sibling stages), and listPosts filters/pagination.
 *
 * `mongodb-memory-server` is not installed (see the T18 report), so we mock
 * `@/lib/mongo` at the `getDb` boundary and run the real repository against the
 * in-memory {@link FakeCollection} — the repo's `$set`/`$push`/`$inc` nested-path
 * updates and query building are exercised faithfully.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/test-helpers/fake-mongo";
import { STAGES } from "@/lib/state";

// Shared mutable holder so the hoisted vi.mock factory and the tests point at
// the SAME fake db (reset per test).
const h = vi.hoisted(() => ({ db: null as unknown as FakeDb }));

vi.mock("@/lib/mongo", () => ({
  POSTS_COLLECTION: "posts",
  getDb: async () => h.db,
}));

// Import AFTER the mock is registered.
import {
  createPost,
  getPostById,
  listPosts,
  updateStage,
} from "@/lib/posts-repo";

/** A stable, valid ObjectId string used as the owner in these tests. */
const TEST_USER = "0123456789abcdef01234567";

beforeEach(() => {
  h.db = createFakeDb();
});

describe("createPost", () => {
  it("creates a fully-shaped 'researching' doc and round-trips by id", async () => {
    const post = await createPost(TEST_USER, "World Cup 2026", "run-1", {
      tone: "playful",
      length: "short",
    });

    expect(post._id).toBeDefined();
    expect(post.topic).toBe("World Cup 2026");
    expect(post.runId).toBe("run-1");
    expect(post.status).toBe("researching");
    expect(post.options).toEqual({ tone: "playful", length: "short" });
    expect(post.research).toEqual([]);
    expect(post.verifiedFindings).toEqual([]);
    expect(post.sources).toEqual([]);
    expect(post.subProgress).toEqual([]);
    expect(post.telemetry).toEqual({ tokensByAgent: {}, timingsByStage: {} });
    expect(post.createdAt).toBeInstanceOf(Date);
    expect(post.updatedAt).toBeInstanceOf(Date);

    // Every stage starts queued with no timestamps.
    for (const stage of STAGES) {
      expect(post.stages[stage]).toEqual({ state: "queued" });
    }

    const fetched = await getPostById(post._id);
    expect(fetched?._id.toString()).toBe(post._id.toString());
    expect(fetched?.runId).toBe("run-1");
  });

  it("defaults options to an empty object", async () => {
    const post = await createPost(TEST_USER, "Topic", "run-2");
    expect(post.options).toEqual({});
  });
});

describe("getPostById", () => {
  it("returns null for a malformed id", async () => {
    expect(await getPostById("not-a-valid-object-id")).toBeNull();
  });

  it("returns null for a well-formed but unknown id", async () => {
    await createPost(TEST_USER, "Topic", "run-x");
    expect(await getPostById("0123456789abcdef01234567")).toBeNull();
  });
});

describe("updateStage — single-stage isolation", () => {
  it("mutates ONE stage without clobbering its siblings", async () => {
    const post = await createPost(TEST_USER, "Topic", "run-3");

    const afterResearch = await updateStage(post._id, "research", {
      state: "active",
    });
    // The touched stage flips to active and auto-gets startedAt.
    expect(afterResearch?.stages.research.state).toBe("active");
    expect(afterResearch?.stages.research.startedAt).toBeInstanceOf(Date);
    expect(afterResearch?.stages.research.endedAt).toBeUndefined();
    // Every OTHER stage is untouched (still queued, no timestamps).
    for (const stage of STAGES) {
      if (stage === "research") continue;
      expect(afterResearch?.stages[stage]).toEqual({ state: "queued" });
    }

    // Complete research, then activate verify — research must stay intact.
    await updateStage(post._id, "research", { state: "done" });
    const afterVerify = await updateStage(post._id, "verify", {
      state: "active",
      detail: "checking claim 1",
    });

    expect(afterVerify?.stages.research.state).toBe("done");
    expect(afterVerify?.stages.research.startedAt).toBeInstanceOf(Date);
    expect(afterVerify?.stages.research.endedAt).toBeInstanceOf(Date);
    expect(afterVerify?.stages.verify.state).toBe("active");
    expect(afterVerify?.stages.verify.detail).toBe("checking claim 1");
    // Downstream stages remain queued.
    for (const stage of ["write", "edit", "illustrate", "publish"] as const) {
      expect(afterVerify?.stages[stage]).toEqual({ state: "queued" });
    }
  });

  it("auto-fills endedAt on 'done'/'failed' and honours explicit timestamps", async () => {
    const post = await createPost(TEST_USER, "Topic", "run-4");
    const done = await updateStage(post._id, "research", { state: "done" });
    expect(done?.stages.research.endedAt).toBeInstanceOf(Date);

    const explicit = new Date("2020-01-01T00:00:00.000Z");
    const failed = await updateStage(post._id, "verify", {
      state: "failed",
      endedAt: explicit,
    });
    expect(failed?.stages.verify.endedAt).toEqual(explicit);
  });

  it("returns null for a malformed id", async () => {
    expect(await updateStage("bad-id", "research", { state: "active" })).toBeNull();
  });
});

describe("listPosts — filters + pagination", () => {
  async function seed() {
    // createdAt is set to `now` inside createPost; nudge each doc's createdAt so
    // the newest-first ordering is deterministic.
    const a = await createPost(TEST_USER, "Alpha topic about cats", "run-a");
    const b = await createPost(TEST_USER, "Beta topic about dogs", "run-b");
    const c = await createPost(TEST_USER, "Gamma topic about CATS and dogs", "run-c");
    const col = h.db.collection("posts");
    // Order oldest→newest: a, b, c.
    (col.docs.find((d) => d.runId === "run-a") as { createdAt: Date }).createdAt =
      new Date("2026-01-01T00:00:00Z");
    (col.docs.find((d) => d.runId === "run-b") as { createdAt: Date }).createdAt =
      new Date("2026-02-01T00:00:00Z");
    (col.docs.find((d) => d.runId === "run-c") as { createdAt: Date }).createdAt =
      new Date("2026-03-01T00:00:00Z");
    return { a, b, c };
  }

  it("returns all posts newest-first by default", async () => {
    await seed();
    const { items, total, page, pageSize } = await listPosts();
    expect(total).toBe(3);
    expect(page).toBe(1);
    expect(pageSize).toBe(20);
    expect(items.map((p) => p.runId)).toEqual(["run-c", "run-b", "run-a"]);
  });

  it("filters by case-insensitive substring on topic", async () => {
    await seed();
    const { items, total } = await listPosts({ search: "cats" });
    expect(total).toBe(2);
    expect(items.map((p) => p.runId).sort()).toEqual(["run-a", "run-c"]);
  });

  it("filters by status", async () => {
    const { c } = await seed();
    await setDocStatus("run-b");
    const { items, total } = await listPosts({ status: "researching" });
    expect(total).toBe(2); // run-a and run-c remain 'researching'
    expect(items.map((p) => p.runId)).toContain(c.runId);
  });

  it("filters by created-at range", async () => {
    await seed();
    const { items, total } = await listPosts({
      from: new Date("2026-01-15T00:00:00Z"),
      to: new Date("2026-02-15T00:00:00Z"),
    });
    expect(total).toBe(1);
    expect(items[0].runId).toBe("run-b");
  });

  it("paginates and clamps page/pageSize", async () => {
    await seed();
    const p1 = await listPosts({ page: 1, pageSize: 2 });
    expect(p1.total).toBe(3);
    expect(p1.items.map((p) => p.runId)).toEqual(["run-c", "run-b"]);

    const p2 = await listPosts({ page: 2, pageSize: 2 });
    expect(p2.items.map((p) => p.runId)).toEqual(["run-a"]);

    // page < 1 clamps to 1; pageSize is clamped into [1, 100].
    const clamped = await listPosts({ page: 0, pageSize: 9999 });
    expect(clamped.page).toBe(1);
    expect(clamped.pageSize).toBe(100);
  });

  async function setDocStatus(runId: string) {
    const col = h.db.collection("posts");
    const doc = col.docs.find((d) => d.runId === runId) as { status: string };
    doc.status = "done";
  }
});
