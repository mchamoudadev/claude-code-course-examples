/**
 * OpenRouter model factories for AgentKit.
 *
 * Orchestrator amendment: every model call — text AND image — routes through
 * OpenRouter using the single `OPENROUTER_API_KEY` (legacy alias `OPEN_ROUTER`).
 * Two tiers are exposed:
 *   - `smartModel()` — orchestration / quality agents (Verify, Editor).
 *   - `cheapModel()` — post writing + light agents.
 * `gpt5()` is kept as an alias of the SMART tier for legacy callers.
 *
 * Each factory returns an `@inngest/agent-kit` `openai(...)` adapter pointed at
 * the OpenRouter base URL. A per-run `{ model }` override wins over the env
 * tier default, which wins over the built-in fallback.
 */

import { openai } from "@inngest/agent-kit";
import { env, requireOpenRouterKey } from "./env";

/** OpenRouter's OpenAI-compatible base URL. */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Built-in fallbacks if no env override is set. */
export const DEFAULT_SMART_MODEL = "openai/gpt-5.5";
export const DEFAULT_CHEAP_MODEL = "google/gemini-2.5-flash-lite";

/** Per-run overrides accepted by the model factories. */
export interface ModelOverrides {
  model?: string;
}

/**
 * SMART tier model (orchestration / quality).
 * Resolution: `override.model` → `LLM_MODEL_SMART` → `LLM_MODEL` (general
 * fallback) → `openai/gpt-5.5`.
 */
export function smartModel(overrides?: ModelOverrides) {
  const model =
    overrides?.model ??
    env("LLM_MODEL_SMART") ??
    env("LLM_MODEL") ??
    DEFAULT_SMART_MODEL;
  return openai({
    model,
    apiKey: requireOpenRouterKey(),
    baseUrl: OPENROUTER_BASE_URL,
  });
}

/**
 * CHEAP tier model (post writing / light agents).
 * Resolution: `override.model` → `LLM_MODEL_CHEAP` → `google/gemini-2.5-flash-lite`.
 */
export function cheapModel(overrides?: ModelOverrides) {
  const model =
    overrides?.model ?? env("LLM_MODEL_CHEAP") ?? DEFAULT_CHEAP_MODEL;
  return openai({
    model,
    apiKey: requireOpenRouterKey(),
    baseUrl: OPENROUTER_BASE_URL,
  });
}

/** Legacy alias for the SMART tier. */
export const gpt5 = smartModel;

/**
 * Resolve the default text-model ids from env WITHOUT building an adapter (no
 * API key required). Used to label the "Default" option in the UI so the picker
 * can reveal what the env tiers actually map to. Mirrors the resolution order in
 * {@link smartModel} / {@link cheapModel}.
 */
export function resolvedTextModelDefaults(): { smart: string; cheap: string } {
  return {
    smart: env("LLM_MODEL_SMART") ?? env("LLM_MODEL") ?? DEFAULT_SMART_MODEL,
    cheap: env("LLM_MODEL_CHEAP") ?? DEFAULT_CHEAP_MODEL,
  };
}
