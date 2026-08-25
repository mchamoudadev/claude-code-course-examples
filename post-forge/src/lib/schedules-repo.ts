/**
 * Schedules repository (T14) — the persistence contract for recurring auto-post
 * rules. Backs the schedules CRUD API (`/api/schedules`), the cron function
 * (`src/inngest/cron.ts`), and the Scheduled management screen.
 *
 * The document shape is the EXACT contract the T17 seed already wrote into the
 * `schedules` collection (see `scripts/seed.ts`), so seeded docs render and
 * round-trip through this repo unchanged:
 *
 *   Schedule = {
 *     _id, topic?, themeSource?,
 *     cadence: { preset, cron? }, timezone,
 *     options?, enabled, nextRun?, lastResult?, createdAt, updatedAt, seed?
 *   }
 *
 * Scheduling model (documented decision): the Inngest cron function polls on a
 * short fixed interval and fires every ENABLED schedule that is DUE
 * (`nextRun <= now`). A freshly enabled schedule is made due immediately so it
 * begins producing posts on the next tick (demo-friendly + observable in the
 * dev dashboard); after each fire, `nextRun` advances by the cadence interval.
 * `nextRun` computation is interval-based (hourly/daily/weekly/monthly) rather
 * than a full cron parser — exact raw-cron evaluation is out of scope.
 */

import { Filter, ObjectId } from "mongodb";
import { getDb } from "./mongo";
import type { GenerationOptions } from "./state";

/** The `schedules` collection name (canonical — T14 owns this const). */
export const SCHEDULES_COLLECTION = "schedules";

/** Human-friendly cadence presets. */
export type SchedulePreset = "hourly" | "daily" | "weekly" | "monthly";

/** The set of valid presets, for validation + iteration. */
export const SCHEDULE_PRESETS: readonly SchedulePreset[] = [
  "hourly",
  "daily",
  "weekly",
  "monthly",
] as const;

/** How often a schedule fires: a preset, with an optional raw-cron override. */
export interface ScheduleCadence {
  preset: SchedulePreset;
  /** Optional 5-field cron expression (informational; overrides the preset). */
  cron?: string;
}

/** Terminal outcome of the most recent run of a schedule. */
export interface ScheduleLastResult {
  at: Date;
  status: "ok" | "failed" | "skipped";
  /** The post created by the run, when one was produced. */
  postId?: string;
  /** Error summary when `status === "failed"`. */
  error?: string;
}

/** The canonical `schedules` document (one per recurring auto-post rule). */
export interface Schedule {
  _id: ObjectId;
  /** Owner — the user who created this schedule. Posts it fires inherit it. */
  ownerUserId: ObjectId;
  /** A fixed topic to generate. Mutually exclusive with `themeSource`. */
  topic?: string;
  /** OR an auto-pick source (a trending-theme feed key) — see `resolveScheduleTopic`. */
  themeSource?: string;
  cadence: ScheduleCadence;
  /** IANA timezone the cadence is described in (e.g. "UTC"). */
  timezone: string;
  /** Per-run generation options threaded into `post/generate.requested`. */
  options?: GenerationOptions;
  enabled: boolean;
  /** Next scheduled fire time (unset while disabled). */
  nextRun?: Date;
  lastResult?: ScheduleLastResult;
  createdAt: Date;
  updatedAt: Date;
  /** Seed marker (set by the T17 seed; preserved through updates). */
  seed?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Serialized DTO (JSON-safe — what the API returns + the screen consumes).    */
/* Import via `import type` from client components (mongodb never bundles).     */
/* -------------------------------------------------------------------------- */

/** ISO-string variant of {@link ScheduleLastResult}. */
export interface ScheduleLastResultDTO {
  at: string;
  status: "ok" | "failed" | "skipped";
  postId?: string;
  error?: string;
}

/** ISO-string, id-as-string variant of {@link Schedule} (GET /api/schedules). */
export interface ScheduleDTO {
  id: string;
  topic?: string;
  themeSource?: string;
  cadence: ScheduleCadence;
  timezone: string;
  options?: GenerationOptions;
  enabled: boolean;
  nextRun?: string;
  lastResult?: ScheduleLastResultDTO;
  createdAt: string;
  updatedAt: string;
}

/** Project a schedule document into its JSON-safe DTO. */
export function toScheduleDTO(s: Schedule): ScheduleDTO {
  const dto: ScheduleDTO = {
    id: s._id.toString(),
    cadence: { preset: s.cadence.preset },
    timezone: s.timezone,
    enabled: s.enabled,
    createdAt: new Date(s.createdAt).toISOString(),
    updatedAt: new Date(s.updatedAt).toISOString(),
  };
  if (s.cadence.cron !== undefined) dto.cadence.cron = s.cadence.cron;
  if (s.topic !== undefined) dto.topic = s.topic;
  if (s.themeSource !== undefined) dto.themeSource = s.themeSource;
  if (s.options !== undefined) dto.options = s.options;
  if (s.nextRun !== undefined) dto.nextRun = new Date(s.nextRun).toISOString();
  if (s.lastResult !== undefined) {
    const lr: ScheduleLastResultDTO = {
      at: new Date(s.lastResult.at).toISOString(),
      status: s.lastResult.status,
    };
    if (s.lastResult.postId !== undefined) lr.postId = s.lastResult.postId;
    if (s.lastResult.error !== undefined) lr.error = s.lastResult.error;
    dto.lastResult = lr;
  }
  return dto;
}

/* -------------------------------------------------------------------------- */
/* Cadence math + topic resolution                                            */
/* -------------------------------------------------------------------------- */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Next fire time for a cadence, interval-based from `from` (default now).
 * hourly → +1h, daily → +1d, weekly → +7d, monthly → +1 calendar month.
 */
export function computeNextRun(
  cadence: ScheduleCadence,
  from: Date = new Date(),
): Date {
  const d = new Date(from);
  switch (cadence.preset) {
    case "hourly":
      d.setHours(d.getHours() + 1);
      break;
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

/** Curated topic pools per trending-theme source (rotated by day). */
const THEME_POOLS: Record<string, string[]> = {
  "trending-tech": [
    "This week in technology: the launches and shifts that matter",
    "The tech story everyone is talking about right now",
    "Emerging tools quietly reshaping how we work",
  ],
  "trending-ai": [
    "The most important AI development this week",
    "What just changed in the world of AI",
    "New AI models and tools worth knowing about",
  ],
  "trending-science": [
    "The science breakthrough making headlines this week",
    "A fresh discovery reshaping how we understand the world",
  ],
  "trending-business": [
    "The business move everyone is analyzing this week",
    "What's driving markets and strategy right now",
  ],
  "trending-culture": [
    "The cultural moment defining this week",
    "What the internet can't stop talking about",
  ],
};

/**
 * Resolve the topic a schedule should generate: its fixed `topic` when set,
 * otherwise an auto-picked topic derived from its `themeSource` (rotated daily
 * so recurring runs vary). Unknown sources fall back to a humanized label.
 */
export function resolveScheduleTopic(
  s: Pick<Schedule, "topic" | "themeSource">,
): string {
  const topic = s.topic?.trim();
  if (topic) return topic;

  const key = (s.themeSource ?? "").trim().toLowerCase();
  const pool = THEME_POOLS[key];
  const dayIndex = Math.floor(Date.now() / MS_PER_DAY);
  if (pool && pool.length > 0) return pool[dayIndex % pool.length];

  const label = key ? key.replace(/[-_]+/g, " ") : "trending topics";
  return `Trending now: ${label}`;
}

/* -------------------------------------------------------------------------- */
/* Data access                                                                */
/* -------------------------------------------------------------------------- */

function toObjectId(id: string | ObjectId): ObjectId | null {
  if (id instanceof ObjectId) return id;
  if (typeof id === "string" && ObjectId.isValid(id)) return new ObjectId(id);
  return null;
}

async function collection() {
  const db = await getDb();
  return db.collection<Schedule>(SCHEDULES_COLLECTION);
}

/** List a user's schedules (enabled first, then most-recently-updated). */
export async function listSchedules(
  userId: string | ObjectId,
): Promise<Schedule[]> {
  const owner = toObjectId(userId);
  if (!owner) return [];
  const col = await collection();
  return col
    .find({ ownerUserId: owner })
    .sort({ enabled: -1, updatedAt: -1 })
    .toArray();
}

/** Fetch one schedule by id, scoped to its owner. `null` if missing/not owned. */
export async function getScheduleForUser(
  userId: string | ObjectId,
  id: string | ObjectId,
): Promise<Schedule | null> {
  const _id = toObjectId(id);
  const owner = toObjectId(userId);
  if (!_id || !owner) return null;
  const col = await collection();
  return col.findOne({ _id, ownerUserId: owner });
}

/** Enabled schedules whose next run is due at-or-before `now` (for the cron). */
export async function listEnabledDueSchedules(
  now: Date = new Date(),
): Promise<Schedule[]> {
  const col = await collection();
  const filter: Filter<Schedule> = {
    enabled: true,
    $or: [{ nextRun: { $lte: now } }, { nextRun: { $exists: false } }],
  };
  return col.find(filter).sort({ updatedAt: 1 }).toArray();
}

/** Input to {@link createSchedule}. */
export interface CreateScheduleInput {
  topic?: string;
  themeSource?: string;
  cadence: ScheduleCadence;
  timezone: string;
  options?: GenerationOptions;
  enabled: boolean;
}

/**
 * Create a schedule. An enabled schedule is made due immediately
 * (`nextRun = now`) so the cron begins producing posts on its next tick; a
 * disabled schedule has no `nextRun`.
 */
export async function createSchedule(
  userId: string | ObjectId,
  input: CreateScheduleInput,
): Promise<Schedule> {
  const owner = toObjectId(userId);
  if (!owner) throw new Error("createSchedule: a valid userId is required");
  const now = new Date();
  const doc: Schedule = {
    _id: new ObjectId(),
    ownerUserId: owner,
    cadence: normalizeCadence(input.cadence),
    timezone: input.timezone,
    enabled: input.enabled,
    createdAt: now,
    updatedAt: now,
  };
  const topic = input.topic?.trim();
  if (topic) doc.topic = topic;
  const themeSource = input.themeSource?.trim();
  if (!topic && themeSource) doc.themeSource = themeSource;
  if (input.options && Object.keys(input.options).length > 0) {
    doc.options = input.options;
  }
  if (input.enabled) doc.nextRun = now;

  const col = await collection();
  await col.insertOne(doc);
  return doc;
}

/**
 * Partial update. Tri-state for `topic` / `themeSource`: `undefined` leaves the
 * field untouched, `null` unsets it, a string sets it. Toggling `enabled` on
 * makes the schedule due immediately; toggling it off clears `nextRun`.
 */
export interface UpdateScheduleInput {
  topic?: string | null;
  themeSource?: string | null;
  cadence?: ScheduleCadence;
  timezone?: string;
  options?: GenerationOptions;
  enabled?: boolean;
}

export async function updateSchedule(
  userId: string | ObjectId,
  id: string | ObjectId,
  patch: UpdateScheduleInput,
): Promise<Schedule | null> {
  const _id = toObjectId(id);
  const owner = toObjectId(userId);
  if (!_id || !owner) return null;

  const now = new Date();
  const set: Record<string, unknown> = { updatedAt: now };
  const unset: Record<string, unknown> = {};

  if (patch.topic !== undefined) {
    const t = patch.topic?.trim();
    if (t) set.topic = t;
    else unset.topic = "";
  }
  if (patch.themeSource !== undefined) {
    const t = patch.themeSource?.trim();
    if (t) set.themeSource = t;
    else unset.themeSource = "";
  }
  if (patch.cadence !== undefined) set.cadence = normalizeCadence(patch.cadence);
  if (patch.timezone !== undefined) set.timezone = patch.timezone;
  if (patch.options !== undefined) set.options = patch.options;

  if (patch.enabled !== undefined) {
    set.enabled = patch.enabled;
    if (patch.enabled) set.nextRun = now;
    else unset.nextRun = "";
  }

  const update: Record<string, unknown> = { $set: set };
  if (Object.keys(unset).length > 0) update.$unset = unset;

  const col = await collection();
  return col.findOneAndUpdate(
    { _id, ownerUserId: owner },
    update,
    { returnDocument: "after" },
  );
}

/** Enable/disable a schedule (recomputing `nextRun` accordingly). */
export async function setScheduleEnabled(
  userId: string | ObjectId,
  id: string | ObjectId,
  enabled: boolean,
): Promise<Schedule | null> {
  return updateSchedule(userId, id, { enabled });
}

/** Delete a schedule scoped to its owner. Returns true when one was removed. */
export async function deleteSchedule(
  userId: string | ObjectId,
  id: string | ObjectId,
): Promise<boolean> {
  const _id = toObjectId(id);
  const owner = toObjectId(userId);
  if (!_id || !owner) return false;
  const col = await collection();
  const res = await col.deleteOne({ _id, ownerUserId: owner });
  return res.deletedCount === 1;
}

/**
 * Record the outcome of a run and advance `nextRun`. Called by the cron after a
 * scheduled fire and by run-now (with `nextRun` omitted to keep the cadence).
 */
export async function markScheduleRun(
  id: string | ObjectId,
  result: ScheduleLastResult,
  nextRun?: Date,
): Promise<Schedule | null> {
  const _id = toObjectId(id);
  if (!_id) return null;

  const set: Record<string, unknown> = {
    lastResult: result,
    updatedAt: new Date(),
  };
  if (nextRun !== undefined) set.nextRun = nextRun;

  const col = await collection();
  return col.findOneAndUpdate(
    { _id },
    { $set: set },
    { returnDocument: "after" },
  );
}

/** Drop a `cron` that is empty/whitespace so it never masks the preset. */
function normalizeCadence(cadence: ScheduleCadence): ScheduleCadence {
  const cron = cadence.cron?.trim();
  return cron ? { preset: cadence.preset, cron } : { preset: cadence.preset };
}
