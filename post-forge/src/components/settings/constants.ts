/**
 * Static option sets + integration metadata for the Settings screen (T15).
 *
 * Locked decision: API keys are env-only. Nothing here holds or references a key
 * VALUE — integration entries carry only the (non-secret) env-var NAME so the UI
 * can tell the user which variable to configure. The actual presence/validity of
 * a key is discovered exclusively by the server-side probe at
 * `POST /api/settings/test`.
 */

import type { ComponentType } from "react";
import {
  ImageIcon,
  SearchIcon,
  SparkLogo,
  type IconProps,
} from "@/components/ui";
import type { GenerationLength } from "@/lib/dto";
import { DatabaseIcon } from "./icons";

/** Sentinel for "use the environment/tier default" in the model pickers. */
export const AUTO_MODEL = "__auto__";

/** Provider ids understood by the test-connection route. */
export type TestProvider = "openrouter" | "serper" | "image" | "mongo";

/** One integration row: identity + which env var powers it (name only). */
export interface IntegrationMeta {
  id: TestProvider;
  name: string;
  description: string;
  /** Non-secret env-var NAME the user must set (never the value). */
  envVar: string;
  Icon: ComponentType<IconProps>;
}

export const INTEGRATIONS: IntegrationMeta[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Single gateway for every text and image model call.",
    envVar: "OPENROUTER_API_KEY",
    Icon: SparkLogo,
  },
  {
    id: "serper",
    name: "Serper",
    description: "Google web search powering research and fact-checking.",
    envVar: "SERPER_API_KEY",
    Icon: SearchIcon,
  },
  {
    id: "image",
    name: "Image generation",
    description: "Poster images, generated through OpenRouter.",
    envVar: "IMAGE_MODEL",
    Icon: ImageIcon,
  },
  {
    id: "mongo",
    name: "MongoDB",
    description: "Persistence and GridFS storage for posters.",
    envVar: "MONGODB_URI",
    Icon: DatabaseIcon,
  },
];

/** A labelled option for the native <select> model pickers. */
export interface ModelOption {
  value: string;
  label: string;
}

/** Default text-model choices (OpenRouter ids). "Auto" defers to env tiers. */
export const TEXT_MODEL_OPTIONS: ModelOption[] = [
  { value: AUTO_MODEL, label: "Auto — use environment default" },
  { value: "openai/gpt-5-mini", label: "GPT-5 mini (openai/gpt-5-mini)" },
  { value: "openai/gpt-5-nano", label: "GPT-5 nano (openai/gpt-5-nano)" },
  {
    value: "google/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite (google/gemini-2.5-flash-lite)",
  },
];

/** Default image-model choices (OpenRouter ids). "Auto" defers to env. */
export const IMAGE_MODEL_OPTIONS: ModelOption[] = [
  { value: AUTO_MODEL, label: "Auto — use environment default" },
  {
    value: "google/gemini-3.1-flash-image",
    label: "Gemini 3.1 Flash Image (google/gemini-3.1-flash-image)",
  },
  {
    value: "google/gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash Image (google/gemini-2.5-flash-image)",
  },
];

/** Preset tone choices for generation defaults. */
export const TONE_OPTIONS: ModelOption[] = [
  { value: "professional", label: "Professional" },
  { value: "conversational", label: "Conversational" },
  { value: "technical", label: "Technical" },
  { value: "friendly", label: "Friendly" },
  { value: "bold", label: "Bold" },
];

/** Length segments with approximate word counts. */
export const LENGTH_OPTIONS: {
  value: GenerationLength;
  label: string;
  sub: string;
}[] = [
  { value: "short", label: "Short", sub: "~400w" },
  { value: "medium", label: "Medium", sub: "~800w" },
  { value: "long", label: "Long", sub: "~1500w" },
];

/**
 * Ensure the currently-stored value is always selectable even if it is not one
 * of the presets (e.g. a custom model configured elsewhere).
 */
export function withCurrent(
  options: ModelOption[],
  value: string,
): ModelOption[] {
  if (value === AUTO_MODEL || options.some((o) => o.value === value)) {
    return options;
  }
  return [...options, { value, label: value }];
}
