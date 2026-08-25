/**
 * `generate_poster` tool — turn an image prompt into a stored poster.
 *
 * Used by the Illustrator agent. The agent authors the prompt; this tool:
 *   1. reads `postId` and the per-run `options.imageModel` from network state,
 *   2. calls the T02 `generatePoster(prompt, imageModel)` (OpenRouter-backed —
 *      see the orchestrator amendment: the poster routes through OpenRouter, and
 *      `options.imageModel` is an OpenRouter image-model id, not a provider enum),
 *   3. uploads the returned bytes to the GridFS "posters" bucket with
 *      `{ mime, postId }` metadata,
 *   4. writes the new GridFS id (string) to `network.state.data.posterImageId`
 *      and returns it.
 *
 * Failure policy: a poster-generation failure (missing key, HTTP error, no
 * decodable image) surfaces as the T02 `ImageGenerationError`; a GridFS upload
 * failure surfaces as a plain Error. Neither is swallowed, so T05 can retry.
 */

import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { Readable } from "node:stream";
import { ObjectId } from "mongodb";
import { generatePoster } from "@/lib/image";
import { getBucket } from "@/lib/mongo";
import type { NetworkState } from "@/lib/state";

export const generatePosterTool = createTool({
  name: "generate_poster",
  description:
    "Generate a poster image from a descriptive prompt and store it. Returns the " +
    "stored image id (also written to state as posterImageId). Craft a vivid, " +
    "specific visual prompt describing the scene, style, and mood.",
  parameters: z.object({
    prompt: z
      .string()
      .describe(
        "A vivid image-generation prompt describing the poster (scene, style, mood).",
      ),
  }),
  handler: async ({ prompt }, { network }): Promise<{ posterImageId: string }> => {
    const data = network.state.data as Partial<NetworkState>;
    const postId = data.postId;
    const imageModel = data.options?.imageModel;

    // 1 + 2. Generate the poster bytes via the OpenRouter-backed T02 helper.
    //         Any ImageGenerationError propagates (surfaced, not swallowed).
    const { bytes, mime } = await generatePoster(prompt, imageModel);

    // 3. Upload the bytes to the GridFS "posters" bucket with metadata.
    const posterImageId = await uploadPoster(bytes, mime, postId);

    // 4. Publish the id into network state and return it.
    network.state.data.posterImageId = posterImageId;
    return { posterImageId };
  },
});

/**
 * Stream `bytes` into the GridFS "posters" bucket, tagging the file with
 * `{ mime, postId }` metadata. Resolves with the new file's id as a string.
 */
async function uploadPoster(
  bytes: Buffer,
  mime: string,
  postId: string | undefined,
): Promise<string> {
  const bucket = await getBucket();
  const filename = `poster-${postId ?? new ObjectId().toString()}`;
  const uploadStream = bucket.openUploadStream(filename, {
    metadata: { mime, postId },
  });
  const id = uploadStream.id; // ObjectId, available before the write completes.

  await new Promise<void>((resolve, reject) => {
    const source = Readable.from(bytes);
    source.on("error", reject);
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve());
    source.pipe(uploadStream);
  });

  return id.toString();
}
