/**
 * save_post tool (T03 → T18): idempotent upsert-by-runId, run against the
 * in-memory fake collection (mongodb-memory-server not installed — see report).
 *
 * Asserts: a first save inserts a `done`/published doc + flips network state; a
 * repeat with the SAME runId updates the ONE document (no duplicate); a missing
 * runId fails fast; args.sources falls back to state sources.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/test-helpers/fake-mongo";

const h = vi.hoisted(() => ({ db: null as unknown as FakeDb }));

vi.mock("@/lib/mongo", () => ({
  POSTS_COLLECTION: "posts",
  getDb: async () => h.db,
}));

import { savePostTool } from "@/agents/tools/save_post";
import type { Tool } from "@inngest/agent-kit";
import type { NetworkState } from "@/lib/state";

interface SaveArgs {
  title: string;
  finalPost: string;
  draft?: string;
  sources?: { title: string; url: string }[];
}

function callTool(data: Partial<NetworkState>, args: SaveArgs) {
  const network = { state: { data } };
  return savePostTool.handler(
    args,
    { network } as unknown as Tool.Options<NetworkState>,
  ) as Promise<{ postId: string }>;
}

function postsDocs() {
  return h.db.collection("posts").docs;
}

beforeEach(() => {
  h.db = createFakeDb();
});

describe("save_post — persist + publish", () => {
  it("inserts a done/published doc and flips network state", async () => {
    const data: Partial<NetworkState> = {
      runId: "run-1",
      topic: "World Cup 2026",
      posterImageId: "poster-1",
      research: [
        { claim: "c", source: { title: "S", url: "https://s" }, verified: false },
      ],
      verifiedFindings: [
        { claim: "c", source: { title: "S", url: "https://s" }, verified: true },
      ],
      options: { tone: "playful" },
    };
    const { postId } = await callTool(data, {
      title: "The Title",
      finalPost: "Final body.",
      draft: "Draft body.",
      sources: [{ title: "S", url: "https://s" }],
    });

    expect(typeof postId).toBe("string");
    expect(data.published).toBe(true);
    expect(data.postId).toBe(postId);

    const docs = postsDocs();
    expect(docs).toHaveLength(1);
    const doc = docs[0];
    expect(doc._id.toString()).toBe(postId);
    expect(doc.runId).toBe("run-1");
    expect(doc.status).toBe("done");
    expect(doc.title).toBe("The Title");
    expect(doc.finalPost).toBe("Final body.");
    expect(doc.draft).toBe("Draft body.");
    expect(doc.sources).toEqual([{ title: "S", url: "https://s" }]);
    expect(doc.posterImageId).toBe("poster-1");
    expect(doc.topic).toBe("World Cup 2026");
    expect(doc.options).toEqual({ tone: "playful" });
    // $setOnInsert scaffolding is present.
    expect(doc.stages).toBeDefined();
    expect(doc.createdAt).toBeInstanceOf(Date);
  });

  it("falls back to state sources when args.sources is omitted", async () => {
    const data: Partial<NetworkState> = {
      runId: "run-2",
      sources: [{ title: "State S", url: "https://state" }],
    };
    await callTool(data, { title: "T", finalPost: "B" });
    expect(postsDocs()[0].sources).toEqual([
      { title: "State S", url: "https://state" },
    ]);
  });
});

describe("save_post — idempotency", () => {
  it("a repeat save with the SAME runId updates the one doc (no duplicate)", async () => {
    const first = await callTool(
      { runId: "run-dup", topic: "T" },
      { title: "V1", finalPost: "Body v1" },
    );
    expect(postsDocs()).toHaveLength(1);

    // Retry — fresh network data, same runId (as an Inngest replay would).
    const second = await callTool(
      { runId: "run-dup", topic: "T" },
      { title: "V2", finalPost: "Body v2" },
    );

    // Same document id, still exactly one doc — the upsert matched on runId.
    expect(second.postId).toBe(first.postId);
    expect(postsDocs()).toHaveLength(1);
    // Latest content won.
    expect(postsDocs()[0].title).toBe("V2");
    expect(postsDocs()[0].finalPost).toBe("Body v2");
  });
});

describe("save_post — guard", () => {
  it("throws fast when runId is missing", async () => {
    await expect(
      callTool({ topic: "no run id" }, { title: "T", finalPost: "B" }),
    ).rejects.toThrow(/runId is required/);
    expect(postsDocs()).toHaveLength(0);
  });
});
