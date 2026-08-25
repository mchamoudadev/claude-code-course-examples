/**
 * Static option catalogs for the New Post advanced controls.
 *
 * Values are the exact strings threaded into `GenerateRequest.options`
 * (`GenerationOptions` shape): `model` / `imageModel` are OpenRouter model
 * slugs, `tone` is a free string, `length` is the fixed `GenerationLength`
 * enum. The empty-string sentinel means "no override" — the server then falls
 * back to its env model tiers, so it is omitted from the request body.
 */

import type { GenerationLength, SettingsDefaults } from "@/lib/dto";
import type { OptionItem } from "@/components/ui/option-list";
import type { SegmentOption } from "@/components/ui/segmented-control";

/** Sentinel for "let the server pick" — omitted from the request when selected. */
export const SERVER_DEFAULT = "";

/** Drop the `provider/` prefix for a compact right-aligned tag. */
function shortModel(id: string): string {
  const slash = id.lastIndexOf("/");
  return slash >= 0 ? id.slice(slash + 1) : id;
}

/**
 * The tag shown on the text "Default" row: the concrete model the env tiers
 * resolve to. When the SMART and CHEAP tiers differ, both are shown
 * (`cheap / smart`); when equal (this project's config), just the one.
 */
function defaultTextSub(defaults?: SettingsDefaults): string {
  if (!defaults) return "auto"; // settings not loaded yet
  const { textModelCheap, textModelSmart } = defaults;
  return textModelCheap === textModelSmart
    ? shortModel(textModelCheap)
    : `${shortModel(textModelCheap)} / ${shortModel(textModelSmart)}`;
}

/**
 * OpenRouter text-model choices (empty value → server tier default). The
 * "Default" row's tag reveals the resolved env model once settings load.
 */
export function buildModelOptions(
  defaults?: SettingsDefaults,
): OptionItem<string>[] {
  return [
    { value: SERVER_DEFAULT, label: "Default", sub: defaultTextSub(defaults) },
    { value: "openai/gpt-5.4-mini", label: "openai/gpt-5.4-mini" },
    { value: "openai/gpt-5-mini", label: "openai/gpt-5-mini" },
    { value: "openai/gpt-5-nano", label: "openai/gpt-5-nano" },
    { value: "google/gemini-2.5-flash-lite", label: "google/gemini-2.5-flash-lite" },
  ];
}

/**
 * OpenRouter image-model choices. NOTE: this is `imageModel` (an OpenRouter
 * model id), NOT a provider enum — the friendly label sits on the left, the
 * short model tag on the right. The "Default" row reveals the resolved env
 * image model once settings load.
 */
export function buildImageModelOptions(
  defaults?: SettingsDefaults,
): OptionItem<string>[] {
  return [
    {
      value: SERVER_DEFAULT,
      label: "Default",
      sub: defaults ? shortModel(defaults.imageModel) : "auto",
    },
    { value: "google/gemini-3.1-flash-image", label: "Gemini Flash Image", sub: "gemini-3.1" },
    { value: "google/gemini-2.5-flash-image", label: "Gemini Flash Image 2.5", sub: "gemini-2.5" },
  ];
}

/** Post tone segments (free strings; `professional` is the seeded default). */
export const TONE_OPTIONS: SegmentOption<string>[] = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "bold", label: "Bold" },
];

/** Post length segments — the fixed `GenerationLength` enum + a word-count hint. */
export const LENGTH_OPTIONS: SegmentOption<GenerationLength>[] = [
  { value: "short", label: "Short", sub: "~400w" },
  { value: "medium", label: "Medium", sub: "~800w" },
  { value: "long", label: "Long", sub: "~1400w" },
];

/** Suggestion chips under the prompt — click to prefill the topic field. */
export const SUGGESTED_TOPICS: string[] = [
  "The rise of AI agents",
  "Why RAG is losing to long context",
  "Zero-knowledge proofs, explained",
  "The economics of open-source models",
  "How vector databases actually work",
];

/**
 * Ensure a persisted default (from settings) is selectable even when it is not
 * one of the curated slugs above — the value is appended as its own option so
 * the picker reflects the exact configured model.
 */
export function withInjected(
  options: OptionItem<string>[],
  value: string | undefined,
): OptionItem<string>[] {
  if (!value) return options;
  if (options.some((o) => o.value === value)) return options;
  return [...options, { value, label: value }];
}
