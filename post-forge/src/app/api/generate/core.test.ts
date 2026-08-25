/**
 * `createGeneration` (spend-abuse fix): the rate/dedupe guard now runs INSIDE
 * the core effect, so EVERY caller (HTTP route, cron poller, schedule "run now")
 * is gated by the same check. These tests pin the discriminated result contract:
 *
 *   - guard trips  → `{ blocked: true, status, body }`, NO doc created, NO event
 *   - guard clears → `{ blocked: false, id, runId }`, doc created + event emitted
 *
 * The guard, repo, Inngest client, and mongo handle are mocked at their module
 * boundaries so the core control flow is exercised in isolation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GuardBlock } from "@/lib/dedupe";

const h = vi.hoisted(() => ({
  checkGenerateGuard: vi.fn(),
  createPost: vi.fn(),
  send: vi.fn(),
  deleteOne: vi.fn(),
}));

vi.mock("@/lib/dedupe", () => ({
  checkGenerateGuard: h.checkGenerateGuard,
}));

vi.mock("@/lib/posts-repo", () => ({
  createPost: h.createPost,
}));

vi.mock("@/inngest/client", () => ({
  inngest: { send: h.send },
}));

vi.mock("@/inngest/functions", () => ({
  GENERATE_POST_EVENT: "post/generate.requested",
}));

vi.mock("@/lib/mongo", () => ({
  POSTS_COLLECTION: "posts",
  getDb: async () => ({
    collection: () => ({ deleteOne: h.deleteOne }),
  }),
}));

// Import AFTER the mocks are registered.
import { createGeneration } from "./core";

/** A stable owner id threaded through every call. */
const TEST_USER = "0123456789abcdef01234567";

beforeEach(() => {
  h.checkGenerateGuard.mockReset();
  h.createPost.mockReset();
  h.send.mockReset();
  h.deleteOne.mockReset();
  h.createPost.mockResolvedValue({ _id: { toString: () => "507f1f77bcf86cd799439011" } });
});

describe("createGeneration guard gating", () => {
  it("returns the blocked result and creates NO doc when the guard trips (429 cap)", async () => {
    const block: GuardBlock = {
      status: 429,
      body: { blocked: true, reason: "Too many generations in progress." },
    };
    h.checkGenerateGuard.mockResolvedValue(block);

    const result = await createGeneration(TEST_USER, { topic: "AI trends" });

    expect(result).toEqual({
      blocked: true,
      status: 429,
      body: block.body,
    });
    expect(h.createPost).not.toHaveBeenCalled();
    expect(h.send).not.toHaveBeenCalled();
  });

  it("surfaces the dedupe block (409 + existingPostId) verbatim", async () => {
    const block: GuardBlock = {
      status: 409,
      body: {
        blocked: true,
        reason: "This topic was already generated recently.",
        existingPostId: "existing-1",
      },
    };
    h.checkGenerateGuard.mockResolvedValue(block);

    const result = await createGeneration(TEST_USER, { topic: "AI trends" });

    expect(result).toEqual({ blocked: true, status: 409, body: block.body });
    expect(h.createPost).not.toHaveBeenCalled();
    expect(h.send).not.toHaveBeenCalled();
  });

  it("creates the doc + emits the event and returns { blocked:false, id, runId } when the guard clears", async () => {
    h.checkGenerateGuard.mockResolvedValue(null);
    h.send.mockResolvedValue(undefined);

    const result = await createGeneration(TEST_USER, {
      topic: "  AI trends  ",
      options: { tone: "playful" },
    });

    expect(result.blocked).toBe(false);
    if (!result.blocked) {
      expect(result.id).toBe("507f1f77bcf86cd799439011");
      expect(typeof result.runId).toBe("string");
      expect(result.runId.length).toBeGreaterThan(0);
    }
    // Topic is trimmed before the guard + doc creation.
    expect(h.checkGenerateGuard).toHaveBeenCalledWith(TEST_USER, "AI trends");
    expect(h.createPost).toHaveBeenCalledWith(
      TEST_USER,
      "AI trends",
      expect.any(String),
      { tone: "playful" },
    );
    expect(h.send).toHaveBeenCalledOnce();
  });

  it("rolls back the orphan doc and rethrows when the event emit fails", async () => {
    h.checkGenerateGuard.mockResolvedValue(null);
    const emitErr = new Error("inngest unreachable");
    h.send.mockRejectedValue(emitErr);

    await expect(createGeneration(TEST_USER, { topic: "AI trends" })).rejects.toThrow(
      emitErr,
    );
    expect(h.deleteOne).toHaveBeenCalledOnce();
  });
});
