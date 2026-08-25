/**
 * Centralized, typed environment / secrets accessor for PostForge.
 *
 * This is the SINGLE source of truth for reading secrets. Every lib, tool, and
 * route should read env through here rather than touching `process.env` directly.
 *
 *   - `env(name)`            soft read for OPTIONAL vars -> string | undefined (never throws)
 *   - `requireEnv(name)`     strict read for REQUIRED vars -> string (throws MissingEnvError)
 *   - `requireOpenRouterKey()` resolves the OpenRouter key from the canonical
 *     `OPENROUTER_API_KEY` OR the legacy alias `OPEN_ROUTER` (see note below)
 *   - `imageProvider()`      typed poster provider, defaulting to "gemini"
 *
 * NOTE: nothing here throws at import time. Errors are only raised when a
 * required value is actually requested, so importing this module is always safe.
 */

/** Canonical env var names that make up the PostForge secrets contract. */
export type EnvVarName =
  | "OPENROUTER_API_KEY"
  | "LLM_MODEL"
  | "SERPER_API_KEY"
  | "GEMINI_API_KEY"
  | "OPENAI_API_KEY"
  | "IMAGE_PROVIDER"
  | "MONGODB_URI"
  | "INNGEST_EVENT_KEY"
  | "INNGEST_SIGNING_KEY"
  | "MAX_INFLIGHT_RUNS"
  | "DEDUPE_WINDOW_HOURS";

/** Thrown when a required environment variable is missing or empty. */
export class MissingEnvError extends Error {
  readonly varName: string;

  constructor(varName: string) {
    super(`${varName} is not set`);
    this.name = "MissingEnvError";
    this.varName = varName;
  }
}

/**
 * Soft read of an environment variable. Returns the trimmed value, or
 * `undefined` when the var is unset or empty. Never throws — use for optional
 * configuration.
 */
export function env(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Strict read of a required environment variable. Returns the value, or throws
 * a clearly-named `MissingEnvError` (message: `"<NAME> is not set"`) when the
 * var is missing or empty.
 */
export function requireEnv(name: string): string {
  const value = env(name);
  if (value === undefined) {
    throw new MissingEnvError(name);
  }
  return value;
}

/**
 * Resolve the OpenRouter API key.
 *
 * The canonical name is `OPENROUTER_API_KEY`. The user's existing `.env` may
 * still use the legacy alias `OPEN_ROUTER`; we accept either, preferring the
 * canonical name. Throws `MissingEnvError("OPENROUTER_API_KEY")` if neither set.
 */
export function requireOpenRouterKey(): string {
  const value = env("OPENROUTER_API_KEY") ?? env("OPEN_ROUTER");
  if (value === undefined) {
    throw new MissingEnvError("OPENROUTER_API_KEY");
  }
  return value;
}

/* -------------------------------------------------------------------------- */
/* Generation guard tunables (T19 rate-limit + dedupe)                         */
/* -------------------------------------------------------------------------- */

/** Fallback when `MAX_INFLIGHT_RUNS` is unset or invalid. */
const DEFAULT_MAX_INFLIGHT_RUNS = 3;
/** Fallback when `DEDUPE_WINDOW_HOURS` is unset or invalid. */
const DEFAULT_DEDUPE_WINDOW_HOURS = 24;

/**
 * Read a non-negative-integer env var, returning `fallback` when it is unset,
 * non-numeric, negative, or otherwise invalid. Fractions are floored.
 */
function nonNegativeIntEnv(name: string, fallback: number): number {
  const raw = env(name);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

/**
 * Maximum number of concurrent, non-terminal generation runs allowed before
 * POST /api/generate rejects a new submission with HTTP 429. Configured via
 * `MAX_INFLIGHT_RUNS` (default 3).
 */
export function maxInflightRuns(): number {
  return nonNegativeIntEnv("MAX_INFLIGHT_RUNS", DEFAULT_MAX_INFLIGHT_RUNS);
}

/**
 * Look-back window (in hours) used to dedupe a submitted topic against recent
 * posts on POST /api/generate. Configured via `DEDUPE_WINDOW_HOURS` (default 24).
 */
export function dedupeWindowHours(): number {
  return nonNegativeIntEnv("DEDUPE_WINDOW_HOURS", DEFAULT_DEDUPE_WINDOW_HOURS);
}

/** Supported poster image providers. */
export type ImageProvider = "gemini" | "openai";

/**
 * The configured poster image provider, defaulting to `"gemini"` (Nano Banana).
 * Any unrecognized value falls back to the default.
 */
export function imageProvider(): ImageProvider {
  return env("IMAGE_PROVIDER") === "openai" ? "openai" : "gemini";
}
