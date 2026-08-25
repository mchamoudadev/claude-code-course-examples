/**
 * POST /api/settings/test — server-side "test connection" probe for a single
 * integration (T15). The Settings screen never accepts or displays API keys
 * (locked decision: env-only secrets); this route is the ONLY way the UI learns
 * whether a provider is reachable.
 *
 * Body:  { "provider": "openrouter" | "serper" | "image" | "mongo" }
 * Reply: { "provider", "ok": boolean, "message": string }
 *
 * Each probe uses the REAL library/tool path the app uses in production:
 *   - openrouter  a tiny chat completion via the OpenRouter chat/completions API
 *   - serper      a minimal Serper /search request (same endpoint as web_search)
 *   - image       a dry check: verify the OpenRouter key + look the configured
 *                 poster model up in the live OpenRouter catalog (NO image is
 *                 generated — cost/time free)
 *   - mongo       a `ping` command against the shared Mongo client (getDb)
 *
 * SECURITY: a probe NEVER echoes a stored secret. Only non-secret facts (a model
 * id, a database name, an HTTP status, a provider's own error text) are returned,
 * and provider error bodies are length-clamped. A provider whose key is unset
 * yields a clear, actionable `ok:false` message (which env var to set) — never a
 * stack trace or a leaked value.
 */

import { getDb } from "@/lib/mongo";
import { DEFAULT_IMAGE_MODEL } from "@/lib/image";
import { env, MissingEnvError, requireEnv, requireOpenRouterKey } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const SERPER_SEARCH_URL = "https://google.serper.dev/search";

/** Providers the route can probe. */
const PROVIDERS = ["openrouter", "serper", "image", "mongo"] as const;
type Provider = (typeof PROVIDERS)[number];

/** The per-provider result shape returned to the client. */
interface TestResult {
  provider: Provider;
  ok: boolean;
  message: string;
}

/* ----------------------------- rate limiting ------------------------------ */
/**
 * Lightweight in-memory throttle so a user can't spam upstream providers by
 * mashing "Test connection" (BRD risk note). Per-process, best-effort — the
 * project-wide limiter is T19's concern; this is a local guard only.
 */
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 12;
const globalForRate = globalThis as unknown as { __pfTestHits?: number[] };
const hits: number[] = (globalForRate.__pfTestHits ??= []);

function isRateLimited(): boolean {
  const now = Date.now();
  while (hits.length > 0 && now - hits[0] > RATE_WINDOW_MS) hits.shift();
  if (hits.length >= RATE_MAX) return true;
  hits.push(now);
  return false;
}

/* -------------------------------- handler --------------------------------- */

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: { message: "Invalid JSON body", code: "invalid_request" } }, 400);
  }

  const raw = (body as { provider?: unknown })?.provider;
  if (typeof raw !== "string" || !PROVIDERS.includes(raw as Provider)) {
    return json(
      {
        error: {
          message: `Unknown provider. Expected one of: ${PROVIDERS.join(", ")}.`,
          code: "invalid_request",
        },
      },
      400,
    );
  }
  const provider = raw as Provider;

  if (isRateLimited()) {
    return json(
      {
        provider,
        ok: false,
        message: "Too many test requests — please wait a few seconds and try again.",
      } satisfies TestResult,
      429,
    );
  }

  const result = await probe(provider);
  return json(result, 200);
}

/** Dispatch to the right probe. Any unexpected throw is normalized to ok:false. */
async function probe(provider: Provider): Promise<TestResult> {
  try {
    switch (provider) {
      case "openrouter":
        return await probeOpenRouter();
      case "serper":
        return await probeSerper();
      case "image":
        return await probeImage();
      case "mongo":
        return await probeMongo();
    }
  } catch (err) {
    return { provider, ok: false, message: `Unexpected error: ${errMsg(err)}` };
  }
}

/* -------------------------------- probes ---------------------------------- */

/** OpenRouter: a tiny real completion. Any 2xx (auth + routing OK) is success. */
async function probeOpenRouter(): Promise<TestResult> {
  const key = tryKey(requireOpenRouterKey);
  if (!key.ok) {
    return {
      provider: "openrouter",
      ok: false,
      message: "OPENROUTER_API_KEY is not set. Add it to your environment to enable model calls.",
    };
  }

  const model = env("LLM_MODEL_CHEAP") ?? env("LLM_MODEL") ?? "google/gemini-2.5-flash-lite";

  return withTimeout(15_000, async (signal) => {
    let res: Response;
    try {
      res = await fetch(OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key.value}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply with the single word: ok." }],
          max_tokens: 32,
        }),
        signal,
      });
    } catch (err) {
      return {
        provider: "openrouter",
        ok: false,
        message: `Request to OpenRouter failed: ${errMsg(err)}`,
      };
    }

    if (!res.ok) {
      const detail = await readError(res);
      return {
        provider: "openrouter",
        ok: false,
        message: `OpenRouter returned HTTP ${res.status}${detail}`,
      };
    }
    return {
      provider: "openrouter",
      ok: true,
      message: `Connected — a test completion via ${model} succeeded.`,
    };
  }, "openrouter");
}

/** Serper: a minimal /search, the same endpoint the web_search tool uses. */
async function probeSerper(): Promise<TestResult> {
  const key = tryKey(() => requireEnv("SERPER_API_KEY"));
  if (!key.ok) {
    return {
      provider: "serper",
      ok: false,
      message: "SERPER_API_KEY is not set. Add it to your environment to enable web search.",
    };
  }

  return withTimeout(10_000, async (signal) => {
    let res: Response;
    try {
      res = await fetch(SERPER_SEARCH_URL, {
        method: "POST",
        headers: { "X-API-KEY": key.value, "Content-Type": "application/json" },
        body: JSON.stringify({ q: "PostForge connection test", num: 1 }),
        signal,
      });
    } catch (err) {
      return { provider: "serper", ok: false, message: `Request to Serper failed: ${errMsg(err)}` };
    }

    if (!res.ok) {
      const detail = await readError(res);
      return { provider: "serper", ok: false, message: `Serper returned HTTP ${res.status}${detail}` };
    }

    const data = (await res.json().catch(() => null)) as { organic?: unknown[] } | null;
    const count = Array.isArray(data?.organic) ? data.organic.length : 0;
    return {
      provider: "serper",
      ok: true,
      message: `Connected — Serper responded with ${count} result${count === 1 ? "" : "s"}.`,
    };
  }, "serper");
}

/**
 * Image: a dry check. Poster images route through OpenRouter's single key, so we
 * verify that key and confirm the configured poster model exists in the live
 * catalog — WITHOUT generating an image (which would be slow and cost credits).
 */
async function probeImage(): Promise<TestResult> {
  const key = tryKey(requireOpenRouterKey);
  if (!key.ok) {
    return {
      provider: "image",
      ok: false,
      message:
        "OPENROUTER_API_KEY is not set. Poster images route through OpenRouter, so this key is required.",
    };
  }

  const model = env("IMAGE_MODEL") ?? DEFAULT_IMAGE_MODEL;

  return withTimeout(12_000, async (signal) => {
    let res: Response;
    try {
      res = await fetch(OPENROUTER_MODELS_URL, {
        method: "GET",
        headers: { Authorization: `Bearer ${key.value}` },
        signal,
      });
    } catch (err) {
      return { provider: "image", ok: false, message: `Request to OpenRouter failed: ${errMsg(err)}` };
    }

    if (!res.ok) {
      const detail = await readError(res);
      return {
        provider: "image",
        ok: false,
        message: `OpenRouter catalog returned HTTP ${res.status}${detail}`,
      };
    }

    const data = (await res.json().catch(() => null)) as { data?: { id?: unknown }[] } | null;
    const ids = Array.isArray(data?.data)
      ? data.data.map((m) => (typeof m?.id === "string" ? m.id : "")).filter(Boolean)
      : [];
    const available = ids.includes(model);
    return {
      provider: "image",
      ok: true,
      message: available
        ? `Ready — poster model "${model}" is available on OpenRouter (dry check, no image generated).`
        : `Connected to OpenRouter, but "${model}" was not found in the catalog — verify IMAGE_MODEL.`,
    };
  }, "image");
}

/** Mongo: a `ping` via the shared client. Reveals only the (non-secret) db name. */
async function probeMongo(): Promise<TestResult> {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return {
      provider: "mongo",
      ok: true,
      message: `Connected — ping succeeded on database "${db.databaseName}".`,
    };
  } catch (err) {
    if (err instanceof MissingEnvError) {
      return {
        provider: "mongo",
        ok: false,
        message: `${err.varName} is not set. Add it to your environment to enable persistence.`,
      };
    }
    return { provider: "mongo", ok: false, message: `MongoDB connection failed: ${errMsg(err)}` };
  }
}

/* ------------------------------- helpers ---------------------------------- */

/** Run `fn` with an abort signal that fires after `ms`; map aborts to a message. */
async function withTimeout(
  ms: number,
  fn: (signal: AbortSignal) => Promise<TestResult>,
  provider: Provider,
): Promise<TestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } catch (err) {
    if (controller.signal.aborted) {
      return { provider, ok: false, message: `Timed out after ${ms / 1000}s.` };
    }
    return { provider, ok: false, message: `Unexpected error: ${errMsg(err)}` };
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve a required key, distinguishing "missing" from a real value. */
function tryKey(
  read: () => string,
): { ok: true; value: string } | { ok: false } {
  try {
    return { ok: true, value: read() };
  } catch {
    return { ok: false };
  }
}

/** Read + clamp a provider error body (never contains our secrets). */
async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  const trimmed = text.trim();
  return trimmed ? `: ${trimmed.slice(0, 200)}` : "";
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}
