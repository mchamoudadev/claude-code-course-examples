/**
 * Poster image generation via OpenRouter.
 *
 * Orchestrator amendment: the poster image is generated through OpenRouter (not
 * a direct Gemini/OpenAI SDK). OpenRouter exposes image generation on its
 * OpenAI-compatible chat/completions endpoint by adding `modalities:
 * ["image","text"]` to the request; the generated image comes back as a
 * base64 data URL under `choices[0].message.images[]`.
 *
 * Request  (POST https://openrouter.ai/api/v1/chat/completions):
 *   { model, modalities: ["image","text"],
 *     messages: [{ role:"user", content:[{ type:"text", text: <prompt> }] }] }
 * Response (relevant path):
 *   choices[0].message.images[0].image_url.url === "data:image/png;base64,<...>"
 *
 * `generatePoster` returns the raw bytes + mime; it does NOT touch GridFS (the
 * caller — the T03 `generate_poster` tool — stores the bytes). Any failure is
 * normalized to a typed {@link ImageGenerationError}.
 *
 * Docs verified 2026-07-05 (OpenRouter multimodal image-generation guide + the
 * Unified Image API announcement); the exact response path is additionally
 * validated empirically against the live model in the T02 verification script.
 */

import { env, requireOpenRouterKey } from "./env";

/** Default OpenRouter image model (Nano Banana family). */
export const DEFAULT_IMAGE_MODEL = "google/gemini-3.1-flash-image";

/**
 * Resolve the default image-model id from env (no request / API key needed) —
 * used to label the "Default" option in the New Post picker. Mirrors the
 * fallback chain in {@link generatePoster}.
 */
export function resolvedImageModelDefault(): string {
  return env("IMAGE_MODEL") ?? DEFAULT_IMAGE_MODEL;
}

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Raw poster bytes + mime returned by {@link generatePoster}. */
export interface GeneratedPoster {
  bytes: Buffer;
  mime: string;
}

/** Typed error for any poster-generation failure (config, network, decode). */
export class ImageGenerationError extends Error {
  /** The OpenRouter model id that was attempted. */
  readonly model: string;
  /** Underlying cause, when available. */
  readonly cause?: unknown;

  constructor(message: string, opts?: { model?: string; cause?: unknown }) {
    super(message);
    this.name = "ImageGenerationError";
    this.model = opts?.model ?? "";
    this.cause = opts?.cause;
  }
}

/**
 * Generate a poster image from `prompt` using OpenRouter.
 *
 * @param prompt         The image prompt (crafted by the Illustrator agent).
 * @param modelOverride  Optional OpenRouter image-model id (per-run override);
 *                       falls back to `IMAGE_MODEL` env then {@link DEFAULT_IMAGE_MODEL}.
 * @returns `{ bytes, mime }` — raw image bytes + its mime type.
 * @throws  {@link ImageGenerationError} on missing key, network/HTTP failure,
 *          or a response with no decodable image.
 */
export async function generatePoster(
  prompt: string,
  modelOverride?: string,
): Promise<GeneratedPoster> {
  const model = modelOverride ?? env("IMAGE_MODEL") ?? DEFAULT_IMAGE_MODEL;

  let apiKey: string;
  try {
    apiKey = requireOpenRouterKey();
  } catch (err) {
    throw new ImageGenerationError(
      "OpenRouter API key is not configured (set OPENROUTER_API_KEY)",
      { model, cause: err },
    );
  }

  let res: Response;
  try {
    res = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        modalities: ["image", "text"],
        messages: [
          { role: "user", content: [{ type: "text", text: prompt }] },
        ],
      }),
    });
  } catch (err) {
    throw new ImageGenerationError("Poster request to OpenRouter failed", {
      model,
      cause: err,
    });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ImageGenerationError(
      `OpenRouter image generation failed (HTTP ${res.status})${
        body ? `: ${body.slice(0, 500)}` : ""
      }`,
      { model },
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    throw new ImageGenerationError(
      "OpenRouter returned a non-JSON response",
      { model, cause: err },
    );
  }

  const imageRef = extractImageRef(json);
  if (!imageRef) {
    throw new ImageGenerationError(
      `No image was returned by model "${model}"`,
      { model },
    );
  }

  // A data URL carries the bytes inline; an http(s) URL must be fetched.
  if (imageRef.startsWith("data:")) {
    return decodeDataUrl(imageRef, model);
  }
  return fetchRemoteImage(imageRef, model);
}

/**
 * Pull the first image reference (data URL or http URL) out of an OpenRouter
 * chat-completions response. Primary path is `message.images[].image_url.url`;
 * a couple of tolerant fallbacks cover minor shape drift across models.
 */
function extractImageRef(json: unknown): string | null {
  if (!isRecord(json)) return null;
  const choices = json.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const message = isRecord(choices[0]) ? choices[0].message : undefined;
  if (!isRecord(message)) return null;

  // Primary: message.images[] = [{ type, image_url: { url } }]
  const images = message.images;
  if (Array.isArray(images)) {
    for (const img of images) {
      const url = readImageUrl(img);
      if (url) return url;
    }
  }

  // Fallback: some models embed the image in structured content parts.
  const content = message.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      const url = readImageUrl(part);
      if (url) return url;
    }
  }

  return null;
}

/** Read a url out of `{ image_url: { url } }`, `{ image_url: "..." }`, or `{ url }`. */
function readImageUrl(node: unknown): string | null {
  if (!isRecord(node)) return null;

  const imageUrl = node.image_url;
  if (typeof imageUrl === "string") return imageUrl;
  if (isRecord(imageUrl) && typeof imageUrl.url === "string") {
    return imageUrl.url;
  }
  if (typeof node.url === "string") return node.url;
  return null;
}

/** Decode a `data:<mime>;base64,<data>` URL into bytes + mime. */
function decodeDataUrl(dataUrl: string, model: string): GeneratedPoster {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) {
    throw new ImageGenerationError("Malformed image data URL in response", {
      model,
    });
  }
  const mime = match[1] || "image/png";
  const isBase64 = Boolean(match[2]);
  const data = match[3] ?? "";
  const bytes = isBase64
    ? Buffer.from(data, "base64")
    : Buffer.from(decodeURIComponent(data), "utf8");
  if (bytes.length === 0) {
    throw new ImageGenerationError("Decoded poster image was empty", { model });
  }
  return { bytes, mime };
}

/** Fetch a remotely-hosted image URL into bytes + mime. */
async function fetchRemoteImage(
  url: string,
  model: string,
): Promise<GeneratedPoster> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new ImageGenerationError("Failed to fetch generated image URL", {
      model,
      cause: err,
    });
  }
  if (!res.ok) {
    throw new ImageGenerationError(
      `Failed to fetch generated image URL (HTTP ${res.status})`,
      { model },
    );
  }
  const mime = res.headers.get("content-type")?.split(";")[0] || "image/png";
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0) {
    throw new ImageGenerationError("Fetched poster image was empty", { model });
  }
  return { bytes, mime };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
