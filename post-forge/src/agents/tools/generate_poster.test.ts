/**
 * generate_poster tool (T03 → T18): the OpenRouter-backed image helper and the
 * GridFS bucket are both mocked, so the test asserts the wiring — the per-run
 * imageModel is threaded through, the bytes stream into the "posters" bucket with
 * `{ mime, postId }` metadata, and the new GridFS id lands on state + the return.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { Writable } from "node:stream";
import { ObjectId, type GridFSBucket } from "mongodb";

vi.mock("@/lib/image", async (orig) => {
  const actual = await orig<typeof import("@/lib/image")>();
  return { ...actual, generatePoster: vi.fn() };
});
vi.mock("@/lib/mongo", () => ({
  getBucket: vi.fn(),
  POSTERS_BUCKET: "posters",
}));

import { generatePoster, ImageGenerationError } from "@/lib/image";
import { getBucket } from "@/lib/mongo";
import { generatePosterTool } from "@/agents/tools/generate_poster";
import type { Tool } from "@inngest/agent-kit";
import type { NetworkState } from "@/lib/state";

const generatePosterMock = vi.mocked(generatePoster);
const getBucketMock = vi.mocked(getBucket);

/** A minimal GridFS upload stream double: a sink Writable carrying an `.id`. */
function fakeBucket(id: ObjectId) {
  const uploadStream = new Writable({
    write(_chunk, _enc, cb) {
      cb();
    },
  }) as Writable & { id: ObjectId };
  uploadStream.id = id;
  const openUploadStream = vi.fn(() => uploadStream);
  getBucketMock.mockResolvedValue({ openUploadStream } as unknown as GridFSBucket);
  return { openUploadStream };
}

function callTool(data: Partial<NetworkState>, prompt = "a vivid poster") {
  const network = { state: { data } };
  return generatePosterTool.handler(
    { prompt },
    { network } as unknown as Tool.Options<NetworkState>,
  ) as Promise<{ posterImageId: string }>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generate_poster — happy path", () => {
  it("threads imageModel through, uploads with metadata, returns + stores the id", async () => {
    const id = new ObjectId();
    const { openUploadStream } = fakeBucket(id);
    generatePosterMock.mockResolvedValue({
      bytes: Buffer.from("fake-image-bytes"),
      mime: "image/png",
    });

    const data: Partial<NetworkState> = {
      postId: "post-1",
      options: { imageModel: "google/gemini-3.1-flash-image" },
    };
    const result = await callTool(data);

    // 1. per-run imageModel forwarded to the T02 helper.
    expect(generatePosterMock).toHaveBeenCalledWith(
      "a vivid poster",
      "google/gemini-3.1-flash-image",
    );
    // 2. bytes streamed into the posters bucket with { mime, postId } metadata.
    expect(openUploadStream).toHaveBeenCalledWith("poster-post-1", {
      metadata: { mime: "image/png", postId: "post-1" },
    });
    // 3. GridFS id returned AND published to network state.
    expect(result).toEqual({ posterImageId: id.toString() });
    expect(data.posterImageId).toBe(id.toString());
  });

  it("passes undefined imageModel when options are absent", async () => {
    fakeBucket(new ObjectId());
    generatePosterMock.mockResolvedValue({
      bytes: Buffer.from("x"),
      mime: "image/jpeg",
    });
    await callTool({ postId: "post-2" });
    expect(generatePosterMock).toHaveBeenCalledWith("a vivid poster", undefined);
  });
});

describe("generate_poster — failure", () => {
  it("propagates an ImageGenerationError without uploading", async () => {
    const openUploadStream = vi.fn();
    getBucketMock.mockResolvedValue({
      openUploadStream,
    } as unknown as GridFSBucket);
    generatePosterMock.mockRejectedValue(
      new ImageGenerationError("no image returned", { model: "m" }),
    );

    await expect(callTool({ postId: "post-3" })).rejects.toBeInstanceOf(
      ImageGenerationError,
    );
    expect(openUploadStream).not.toHaveBeenCalled();
  });
});
