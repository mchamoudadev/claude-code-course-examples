/**
 * Settings-defaults store — a single `settings` document holding the default
 * `GenerationOptions` applied to new posts (tone, length, optional model /
 * image-model overrides).
 *
 * Locked decision: API keys are env-only. NO key fields are ever stored here —
 * `putSettings` allowlists only the `GenerationOptions` fields.
 */

import { getDb, SETTINGS_COLLECTION } from "./mongo";
import { GenerationOptions } from "./state";

/** Fixed id of the settings singleton document. */
export const SETTINGS_ID = "settings";

/** Sensible generation defaults when nothing is stored yet. */
export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  tone: "professional",
  length: "medium",
  // `model` / `imageModel` intentionally omitted → fall back to env tiers.
};

interface SettingsDoc {
  _id: string;
  defaults: GenerationOptions;
  updatedAt: Date;
}

/**
 * Get the effective generation defaults: built-in defaults merged with any
 * persisted overrides. Always returns a complete-enough `GenerationOptions`.
 */
export async function getSettings(): Promise<GenerationOptions> {
  const db = await getDb();
  const doc = await db
    .collection<SettingsDoc>(SETTINGS_COLLECTION)
    .findOne({ _id: SETTINGS_ID });
  return { ...DEFAULT_GENERATION_OPTIONS, ...(doc?.defaults ?? {}) };
}

/**
 * Upsert a partial set of generation defaults. Only known `GenerationOptions`
 * fields are written (allowlist), each scoped under `defaults.<field>` so a
 * partial update never clobbers the other defaults. Returns the effective
 * settings after the write.
 */
export async function putSettings(
  partial: Partial<GenerationOptions>,
): Promise<GenerationOptions> {
  const db = await getDb();
  const now = new Date();

  // Allowlist: only these fields may ever be persisted (no keys, ever).
  const set: Record<string, unknown> = { updatedAt: now };
  if (partial.model !== undefined) set["defaults.model"] = partial.model;
  if (partial.imageModel !== undefined) {
    set["defaults.imageModel"] = partial.imageModel;
  }
  if (partial.tone !== undefined) set["defaults.tone"] = partial.tone;
  if (partial.length !== undefined) set["defaults.length"] = partial.length;

  await db.collection<SettingsDoc>(SETTINGS_COLLECTION).updateOne(
    { _id: SETTINGS_ID },
    { $set: set, $setOnInsert: { _id: SETTINGS_ID } },
    { upsert: true },
  );

  return getSettings();
}
