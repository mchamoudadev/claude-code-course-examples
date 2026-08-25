/**
 * PostForge seed / demo-data script (T17).
 *
 * Populates MongoDB with a small-but-varied set of realistic fixtures so the
 * dashboard analytics (T13), the library, the pipeline showcase, and the
 * scheduled screen (T14) look real immediately — WITHOUT running the paid
 * pipeline. Everything is inserted directly through the canonical T02 shapes
 * (`Post`, GridFS `posters` bucket) so seeded data is indistinguishable from a
 * real run.
 *
 * What it seeds
 * ─────────────
 *   • `posts`     — 7 documents spanning statuses: 5 `done`, 1 `failed` (with
 *                   `error`), 1 `in-progress` (`writing`, mid-pipeline). Each
 *                   carries realistic `stages`, `subProgress`, `sources`,
 *                   `research` / `verifiedFindings`, and `telemetry`
 *                   (`tokensByAgent` + `timingsByStage`) so charts render.
 *   • `posters`   — one embedded placeholder poster (a tiny procedurally-built
 *                   PNG gradient — NO paid image API) per `done` post, stored in
 *                   the GridFS `posters` bucket with metadata `{ mime, postId }`
 *                   so thumbnails + the poster route resolve.
 *   • `schedules` — 2 documents (one enabled, one disabled) using the proposed
 *                   T14 contract (see the `Schedule` shape below). T14 owns this
 *                   collection; the shape here is the proposed contract.
 *
 * Idempotency
 * ───────────
 * Every seeded document is tagged `seed: true` and uses a STABLE deterministic
 * `_id`. Re-running clears all prior `seed: true` posts, schedules, and GridFS
 * poster files (metadata `seed: true`) first, then re-inserts — so counts never
 * duplicate. GridFS cleanup is included.
 *
 * Run: `npm run seed`  (wired to `tsx scripts/seed.ts`).
 */

import { deflateSync } from "node:zlib";
import { Document, Filter, GridFSBucket, GridFSFile, ObjectId } from "mongodb";
import {
  getBucket,
  getClient,
  getDb,
  POSTS_COLLECTION,
} from "../src/lib/mongo";
import {
  Finding,
  GenerationOptions,
  initialStages,
  Post,
  PostError,
  PostStatus,
  Source,
  Stage,
  StageState,
  SubProgressEntry,
} from "../src/lib/state";
import { hashPassword } from "../src/lib/auth/password";

/** Demo account that owns all seeded data (login: demo / demo12345). */
const USERS_COLLECTION = "users";
const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "demo12345";
/** Stable demo-user id (valid hex), so reseeds keep ownership consistent. */
const DEMO_USER_ID = new ObjectId("00000000000000000000dead");

// ───────────────────────────────────────────────────────────────────────────
// Proposed `schedules` collection shape (T14 contract).
//
// T14 (Scheduled / cron) owns the `schedules` collection; it is not built yet.
// This is a MINIMAL, sensible shape aligned with the T14 BRD §4.1 field list
// (`{ topic|themeSource, cadence, timezone, options, enabled, nextRun,
// lastResult, createdAt }`). Surfaced as a `new-requirement` report so T14
// adopts (or amends) it rather than inventing a divergent shape.
// ───────────────────────────────────────────────────────────────────────────

/** Human-friendly cadence presets (T14 may add more). */
export type SchedulePreset = "hourly" | "daily" | "weekly" | "monthly";

/** How often a schedule fires: a preset, with an optional raw-cron override. */
export interface ScheduleCadence {
  preset: SchedulePreset;
  /** Optional 5-field cron expression that overrides the preset. */
  cron?: string;
}

/** Outcome of the most recent run of a schedule. */
export interface ScheduleLastResult {
  at: Date;
  status: "ok" | "failed" | "skipped";
  /** The post created by the run, when one was produced. */
  postId?: string;
  /** Error summary when `status === "failed"`. */
  error?: string;
}

/** The proposed `schedules` document (one per recurring auto-post rule). */
export interface Schedule {
  _id: ObjectId;
  /** Owner — the user who owns this schedule (posts it fires inherit it). */
  ownerUserId: ObjectId;
  /** A fixed topic to generate. Mutually exclusive-ish with `themeSource`. */
  topic?: string;
  /** OR an auto-pick source (e.g. a trending-theme feed) T14 defines. */
  themeSource?: string;
  cadence: ScheduleCadence;
  /** IANA timezone the cadence is evaluated in (e.g. "UTC"). */
  timezone: string;
  /** Per-run generation options threaded into `post/generate.requested`. */
  options?: GenerationOptions;
  enabled: boolean;
  /** Next scheduled fire time (typically unset while disabled). */
  nextRun?: Date;
  lastResult?: ScheduleLastResult;
  createdAt: Date;
  updatedAt: Date;
  /** Seed marker (enables idempotent clear-and-reseed). */
  seed?: boolean;
}

/** The `schedules` collection name (proposed; T14 owns the canonical const). */
const SCHEDULES_COLLECTION = "schedules";

// ───────────────────────────────────────────────────────────────────────────
// Tiny dependency-free PNG encoder (placeholder posters).
//
// Builds a small RGB gradient PNG from raw pixels using only `node:zlib`, so
// seeding is fully offline and never calls the paid OpenRouter image API.
// ───────────────────────────────────────────────────────────────────────────

type RGB = [number, number, number];

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Encode raw `width*height*3` RGB bytes into a valid PNG buffer. */
function encodePng(width: number, height: number, rgb: Buffer): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Build a 320×180 diagonal-gradient placeholder poster PNG. */
function gradientPosterPng(a: RGB, b: RGB): Buffer {
  const width = 320;
  const height = 180;
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = (x / width + y / height) / 2; // 0..1 along the diagonal
      const i = (y * width + x) * 3;
      rgb[i] = Math.round(a[0] + (b[0] - a[0]) * t);
      rgb[i + 1] = Math.round(a[1] + (b[1] - a[1]) * t);
      rgb[i + 2] = Math.round(a[2] + (b[2] - a[2]) * t);
    }
  }
  return encodePng(width, height, rgb);
}

// ───────────────────────────────────────────────────────────────────────────
// Time + id helpers.
// ───────────────────────────────────────────────────────────────────────────

const NOW = new Date();
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

const daysAgo = (n: number): Date => new Date(NOW.getTime() - n * MS_PER_DAY);
const hoursAgo = (n: number): Date => new Date(NOW.getTime() - n * MS_PER_HOUR);

/** Stable, human-readable deterministic ObjectId (e.g. 00…0001) per ordinal. */
const seedObjectId = (n: number): ObjectId =>
  new ObjectId(n.toString(16).padStart(24, "0"));

// ───────────────────────────────────────────────────────────────────────────
// Post builder.
// ───────────────────────────────────────────────────────────────────────────

interface StagePlanEntry {
  stage: Stage;
  durMs: number;
  state: StageState["state"];
  detail: string;
}

interface BuiltStages {
  stages: Record<Stage, StageState>;
  timingsByStage: Record<string, number>;
  /** Timestamp of the last recorded stage event (for `updatedAt`). */
  lastAt: Date;
}

/** Lay stages out sequentially from `createdAt`, deriving startedAt/endedAt. */
function buildStages(createdAt: Date, plan: StagePlanEntry[]): BuiltStages {
  const stages = initialStages();
  const timingsByStage: Record<string, number> = {};
  let cursor = createdAt.getTime();
  let lastAt = createdAt;

  for (const p of plan) {
    const startedAt = new Date(cursor);
    if (p.state === "active") {
      // Active stage is still running: startedAt only, no endedAt/timing.
      stages[p.stage] = { state: "active", startedAt, detail: p.detail };
      lastAt = startedAt;
      cursor += p.durMs;
    } else {
      const endedAt = new Date(cursor + p.durMs);
      stages[p.stage] = { state: p.state, startedAt, endedAt, detail: p.detail };
      timingsByStage[p.stage] = p.durMs;
      lastAt = endedAt;
      cursor += p.durMs;
    }
  }
  return { stages, timingsByStage, lastAt };
}

interface PostSpec {
  ordinal: number;
  runId: string;
  topic: string;
  createdAt: Date;
  status: PostStatus;
  plan: StagePlanEntry[];
  research: Finding[];
  verifiedFindings: Finding[];
  sources: Source[];
  tokensByAgent: Record<string, number>;
  options: GenerationOptions;
  title?: string;
  draft?: string;
  finalPost?: string;
  error?: PostError;
  /** Gradient colors → a placeholder poster is generated + linked. */
  poster?: [RGB, RGB];
}

/** A seeded post document (canonical `Post` + the `seed` marker). */
type SeededPost = Post & { seed: true };

/** Derive a few reveal-on-update sub-progress events from what actually ran. */
function buildSubProgress(
  spec: PostSpec,
  stages: Record<Stage, StageState>,
  posterImageId?: string,
): SubProgressEntry[] {
  const entries: SubProgressEntry[] = [];
  const at = (stage: Stage, offsetMs: number): Date => {
    const started = stages[stage].startedAt ?? spec.createdAt;
    return new Date(started.getTime() + offsetMs);
  };

  if (stages.research.state !== "queued") {
    spec.sources.slice(0, 2).forEach((s, i) => {
      entries.push({
        stage: "research",
        kind: "source_found",
        data: { title: s.title, url: s.url },
        at: at("research", 2000 + i * 4000),
      });
    });
  }
  if (stages.verify.state === "done" && spec.verifiedFindings[0]) {
    entries.push({
      stage: "verify",
      kind: "claim_checked",
      data: { claim: spec.verifiedFindings[0].claim, verified: true },
      at: at("verify", 3000),
    });
  }
  if (stages.verify.state === "failed") {
    entries.push({
      stage: "verify",
      kind: "claim_rejected",
      data: {
        claim: spec.research[0]?.claim ?? "core claim",
        reason: "could not corroborate against independent sources",
      },
      at: at("verify", 4000),
    });
  }
  if (stages.write.state === "active") {
    entries.push({
      stage: "write",
      kind: "draft_progress",
      data: { words: 180, note: "composing from verified findings" },
      at: at("write", 2000),
    });
  }
  if (stages.illustrate.state === "done" && posterImageId) {
    entries.push({
      stage: "illustrate",
      kind: "poster_generated",
      data: { posterImageId },
      at: at("illustrate", 12000),
    });
  }
  return entries;
}

function buildPost(spec: PostSpec, posterImageId?: string): SeededPost {
  const { stages, timingsByStage, lastAt } = buildStages(
    spec.createdAt,
    spec.plan,
  );
  const isTerminal = spec.status === "done" || spec.status === "failed";
  const updatedAt = isTerminal ? lastAt : NOW;

  const doc: SeededPost = {
    _id: seedObjectId(spec.ordinal),
    userId: DEMO_USER_ID,
    topic: spec.topic,
    status: spec.status,
    stages,
    subProgress: buildSubProgress(spec, stages, posterImageId),
    research: spec.research,
    verifiedFindings: spec.verifiedFindings,
    sources: spec.sources,
    options: spec.options,
    telemetry: {
      tokensByAgent: spec.tokensByAgent,
      timingsByStage,
    },
    runId: spec.runId,
    createdAt: spec.createdAt,
    updatedAt,
    seed: true,
  };
  if (spec.title !== undefined) doc.title = spec.title;
  if (spec.draft !== undefined) doc.draft = spec.draft;
  if (spec.finalPost !== undefined) doc.finalPost = spec.finalPost;
  if (spec.error !== undefined) doc.error = spec.error;
  if (posterImageId !== undefined) doc.posterImageId = posterImageId;
  return doc;
}

// ───────────────────────────────────────────────────────────────────────────
// Fixture content.
// ───────────────────────────────────────────────────────────────────────────

const DONE_PLAN = (
  d: [number, number, number, number, number, number],
): StagePlanEntry[] => [
  { stage: "research", durMs: d[0], state: "done", detail: "Gathered primary sources" },
  { stage: "verify", durMs: d[1], state: "done", detail: "Cross-checked every claim" },
  { stage: "write", durMs: d[2], state: "done", detail: "Drafted from verified findings" },
  { stage: "edit", durMs: d[3], state: "done", detail: "Tightened tone and structure" },
  { stage: "illustrate", durMs: d[4], state: "done", detail: "Generated the poster" },
  { stage: "publish", durMs: d[5], state: "done", detail: "Saved to the library" },
];

const SPECS: PostSpec[] = [
  {
    ordinal: 1,
    runId: "seed-run-0001",
    topic: "World Cup 2026: The Definitive Preview",
    createdAt: daysAgo(25),
    status: "done",
    title: "World Cup 2026: Everything You Need to Know",
    plan: DONE_PLAN([23000, 16000, 12000, 7000, 19000, 1200]),
    research: [
      { claim: "The 2026 tournament is co-hosted by the USA, Canada, and Mexico.", source: { title: "FIFA — 2026 Host Announcement", url: "https://www.fifa.com/worldcup/2026" }, verified: true },
      { claim: "The field expands to 48 teams for the first time.", source: { title: "FIFA — Format Changes", url: "https://www.fifa.com/technical/format-2026" }, verified: true },
      { claim: "The final is scheduled at MetLife Stadium, New Jersey.", source: { title: "ESPN — Venues", url: "https://www.espn.com/soccer/wc2026-venues" }, verified: true },
    ],
    verifiedFindings: [
      { claim: "48 teams across 16 host cities in three nations.", source: { title: "FIFA — Format Changes", url: "https://www.fifa.com/technical/format-2026" }, verified: true },
      { claim: "The final is at MetLife Stadium.", source: { title: "ESPN — Venues", url: "https://www.espn.com/soccer/wc2026-venues" }, verified: true },
    ],
    sources: [
      { title: "FIFA — 2026 Host Announcement", url: "https://www.fifa.com/worldcup/2026" },
      { title: "FIFA — Format Changes", url: "https://www.fifa.com/technical/format-2026" },
      { title: "ESPN — Venues", url: "https://www.espn.com/soccer/wc2026-venues" },
    ],
    draft: "The 2026 World Cup is the biggest yet, spanning three countries and 48 teams…",
    finalPost:
      "The 2026 FIFA World Cup rewrites the tournament's scale: three host nations, 16 cities, and — for the first time — 48 teams. That expansion reshapes qualification, the group stage, and the road to the final at MetLife Stadium.\n\nFor fans, it means more matches, more debut nations, and a logistical puzzle stretching from Vancouver to Mexico City. This preview breaks down the format, the favorites, and the storylines worth following.",
    tokensByAgent: { research: 5200, verify: 4100, write: 2600, edit: 1900, illustrate: 480, publish: 140 },
    options: { length: "long", tone: "energetic" },
    poster: [[16, 110, 72], [52, 180, 120]],
  },
  {
    ordinal: 2,
    runId: "seed-run-0002",
    topic: "The Quiet Rise of Small Language Models",
    createdAt: daysAgo(18),
    status: "done",
    title: "Why Small Language Models Are Having a Moment",
    plan: DONE_PLAN([25000, 14000, 13000, 8000, 16000, 1100]),
    research: [
      { claim: "Small models (1–8B params) now match older frontier models on many tasks.", source: { title: "arXiv — SLM Survey 2026", url: "https://arxiv.org/abs/2601.01234" }, verified: true },
      { claim: "On-device inference cuts latency and cloud cost dramatically.", source: { title: "The Verge — Edge AI", url: "https://www.theverge.com/edge-ai-2026" }, verified: true },
      { claim: "Distillation is the dominant training recipe for the strongest SLMs.", source: { title: "Google Research Blog", url: "https://research.google/blog/distillation" }, verified: false },
    ],
    verifiedFindings: [
      { claim: "1–8B models match older frontier models on many benchmarks.", source: { title: "arXiv — SLM Survey 2026", url: "https://arxiv.org/abs/2601.01234" }, verified: true },
      { claim: "On-device inference cuts latency and cost.", source: { title: "The Verge — Edge AI", url: "https://www.theverge.com/edge-ai-2026" }, verified: true },
    ],
    sources: [
      { title: "arXiv — SLM Survey 2026", url: "https://arxiv.org/abs/2601.01234" },
      { title: "The Verge — Edge AI", url: "https://www.theverge.com/edge-ai-2026" },
      { title: "Google Research Blog", url: "https://research.google/blog/distillation" },
    ],
    draft: "Small language models have quietly closed much of the gap…",
    finalPost:
      "For two years the headlines belonged to ever-larger frontier models. But a quieter shift is reshaping deployment: small language models in the 1–8B range now match older frontier systems on a surprising range of tasks — while running on a laptop or a phone.\n\nThe driver is distillation plus better data curation. The payoff is latency, privacy, and cost. Expect the next wave of AI features to ship on-device by default.",
    tokensByAgent: { research: 6100, verify: 4700, write: 2900, edit: 2200, illustrate: 420, publish: 130 },
    options: { length: "medium", tone: "analytical" },
    poster: [[37, 99, 235], [124, 58, 237]],
  },
  {
    ordinal: 3,
    runId: "seed-run-0003",
    topic: "Why Mediterranean Diets Keep Winning",
    createdAt: daysAgo(12),
    status: "done",
    title: "The Mediterranean Diet, Explained by the Evidence",
    plan: DONE_PLAN([20000, 15000, 11000, 6500, 17000, 1000]),
    research: [
      { claim: "The Mediterranean diet is repeatedly ranked #1 for overall health.", source: { title: "US News — Best Diets 2026", url: "https://health.usnews.com/best-diet/mediterranean" }, verified: true },
      { claim: "It is associated with lower cardiovascular risk in large cohort studies.", source: { title: "NEJM — PREDIMED follow-up", url: "https://www.nejm.org/predimed" }, verified: true },
    ],
    verifiedFindings: [
      { claim: "Ranked #1 overall diet for multiple consecutive years.", source: { title: "US News — Best Diets 2026", url: "https://health.usnews.com/best-diet/mediterranean" }, verified: true },
      { claim: "Associated with lower cardiovascular risk.", source: { title: "NEJM — PREDIMED follow-up", url: "https://www.nejm.org/predimed" }, verified: true },
    ],
    sources: [
      { title: "US News — Best Diets 2026", url: "https://health.usnews.com/best-diet/mediterranean" },
      { title: "NEJM — PREDIMED follow-up", url: "https://www.nejm.org/predimed" },
    ],
    draft: "Year after year, one eating pattern tops the rankings…",
    finalPost:
      "Diet trends come and go, but one pattern keeps topping the rankings: the Mediterranean diet. Rich in olive oil, vegetables, legumes, fish, and whole grains, it is less a strict plan than a durable set of habits.\n\nThe evidence base is unusually strong — large cohort studies and randomized trials both link it to lower cardiovascular risk. Its real superpower may be adherence: it is pleasant enough to actually keep.",
    tokensByAgent: { research: 4600, verify: 3800, write: 2400, edit: 1700, illustrate: 510, publish: 120 },
    options: { length: "medium", tone: "informative" },
    poster: [[217, 119, 6], [219, 39, 119]],
  },
  {
    ordinal: 4,
    runId: "seed-run-0004",
    topic: "Mars Sample Return: What Comes Next",
    createdAt: daysAgo(6),
    status: "done",
    title: "Mars Sample Return: The Hardest Delivery in History",
    plan: DONE_PLAN([27000, 18000, 14000, 9000, 21000, 1400]),
    research: [
      { claim: "Perseverance has cached dozens of sealed sample tubes on Mars.", source: { title: "NASA — Perseverance Samples", url: "https://mars.nasa.gov/perseverance/samples" }, verified: true },
      { claim: "The return architecture is under active redesign to cut cost.", source: { title: "SpaceNews — MSR Review", url: "https://spacenews.com/msr-review-2026" }, verified: true },
    ],
    verifiedFindings: [
      { claim: "Dozens of sealed sample tubes are cached on the surface.", source: { title: "NASA — Perseverance Samples", url: "https://mars.nasa.gov/perseverance/samples" }, verified: true },
    ],
    sources: [
      { title: "NASA — Perseverance Samples", url: "https://mars.nasa.gov/perseverance/samples" },
      { title: "SpaceNews — MSR Review", url: "https://spacenews.com/msr-review-2026" },
    ],
    draft: "Getting a piece of Mars back to Earth is a multi-step gauntlet…",
    finalPost:
      "Returning a piece of Mars to Earth is arguably the most complex robotic mission ever attempted: land near the cached tubes, retrieve them, launch off another planet, rendezvous in Mars orbit, and coast home.\n\nWith the sample tubes already sealed and waiting, the open question is the return architecture — now under redesign to bring down cost and risk. The science payoff, from astrobiology to planetary history, is why the effort survives every budget cycle.",
    tokensByAgent: { research: 5800, verify: 4500, write: 3100, edit: 2400, illustrate: 560, publish: 160 },
    options: { length: "long", tone: "curious" },
    poster: [[190, 60, 40], [80, 30, 60]],
  },
  {
    ordinal: 5,
    runId: "seed-run-0005",
    topic: "The Economics of Rooftop Solar in 2026",
    createdAt: daysAgo(2),
    status: "done",
    title: "Does Rooftop Solar Still Pay Off in 2026?",
    plan: DONE_PLAN([21000, 15000, 12000, 7500, 18000, 1300]),
    research: [
      { claim: "Panel hardware prices continued to fall through 2025.", source: { title: "IEA — Renewables 2026", url: "https://www.iea.org/reports/renewables-2026" }, verified: true },
      { claim: "Net-metering reforms materially change payback in some states.", source: { title: "Reuters — Net Metering", url: "https://www.reuters.com/energy/net-metering-2026" }, verified: true },
    ],
    verifiedFindings: [
      { claim: "Hardware prices fell through 2025.", source: { title: "IEA — Renewables 2026", url: "https://www.iea.org/reports/renewables-2026" }, verified: true },
      { claim: "Net-metering policy is the biggest payback variable.", source: { title: "Reuters — Net Metering", url: "https://www.reuters.com/energy/net-metering-2026" }, verified: true },
    ],
    sources: [
      { title: "IEA — Renewables 2026", url: "https://www.iea.org/reports/renewables-2026" },
      { title: "Reuters — Net Metering", url: "https://www.reuters.com/energy/net-metering-2026" },
    ],
    draft: "The sticker price of solar keeps dropping, but the economics are local…",
    finalPost:
      "Rooftop solar hardware has never been cheaper, yet whether it pays off is stubbornly local. The panels are a small part of the story; the decisive variables are financing, installation labor, and — above all — how your utility credits the power you export.\n\nAs net-metering rules tighten in several markets, the smart move in 2026 is to model your own payback with current local rates rather than trust a national average.",
    tokensByAgent: { research: 4900, verify: 4000, write: 2700, edit: 2000, illustrate: 470, publish: 150 },
    options: { length: "medium", tone: "practical" },
    poster: [[234, 179, 8], [20, 120, 110]],
  },
  {
    ordinal: 6,
    runId: "seed-run-0006",
    topic: "Deep-Sea Mining: Promise and Peril",
    createdAt: daysAgo(4),
    status: "failed",
    title: undefined,
    plan: [
      { stage: "research", durMs: 20000, state: "done", detail: "Gathered sources" },
      { stage: "verify", durMs: 9000, state: "failed", detail: "Key claims could not be corroborated" },
    ],
    research: [
      { claim: "Polymetallic nodules on the seafloor are rich in cobalt and nickel.", source: { title: "Nature — Seabed Minerals", url: "https://www.nature.com/seabed-minerals" }, verified: true },
      { claim: "A blanket commercial-mining moratorium took effect in 2026.", source: { title: "Unverified blog", url: "https://example.com/deep-sea-rumor" }, verified: false },
    ],
    verifiedFindings: [],
    sources: [
      { title: "Nature — Seabed Minerals", url: "https://www.nature.com/seabed-minerals" },
    ],
    error: {
      stage: "verify",
      message:
        "Verification failed: 3 of 4 core claims could not be corroborated against independent sources (web search rate-limited mid-run).",
    },
    tokensByAgent: { research: 4300, verify: 2100 },
    options: { length: "medium", tone: "balanced" },
    // no poster — pipeline stopped before Illustrate.
  },
  {
    ordinal: 7,
    runId: "seed-run-0007",
    topic: "Quantum Error Correction Goes Mainstream",
    createdAt: hoursAgo(3),
    status: "writing",
    title: undefined,
    plan: [
      { stage: "research", durMs: 21000, state: "done", detail: "Gathered primary sources" },
      { stage: "verify", durMs: 13000, state: "done", detail: "Cross-checked every claim" },
      { stage: "write", durMs: 4000, state: "active", detail: "Drafting from verified findings" },
    ],
    research: [
      { claim: "Recent chips demonstrate below-threshold error correction.", source: { title: "Nature — QEC Milestone", url: "https://www.nature.com/qec-2026" }, verified: true },
      { claim: "Logical qubit error rates now fall as more physical qubits are added.", source: { title: "IEEE Spectrum — QEC", url: "https://spectrum.ieee.org/qec-2026" }, verified: true },
    ],
    verifiedFindings: [
      { claim: "Below-threshold error correction has been demonstrated.", source: { title: "Nature — QEC Milestone", url: "https://www.nature.com/qec-2026" }, verified: true },
      { claim: "Logical error rate improves with more physical qubits.", source: { title: "IEEE Spectrum — QEC", url: "https://spectrum.ieee.org/qec-2026" }, verified: true },
    ],
    sources: [
      { title: "Nature — QEC Milestone", url: "https://www.nature.com/qec-2026" },
      { title: "IEEE Spectrum — QEC", url: "https://spectrum.ieee.org/qec-2026" },
    ],
    // draft/finalPost intentionally absent — Write is still active.
    tokensByAgent: { research: 5000, verify: 4200, write: 900 },
    options: { length: "medium", tone: "explanatory" },
    // no poster yet.
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Schedule fixtures (proposed T14 shape).
// ───────────────────────────────────────────────────────────────────────────

function buildSchedules(): Schedule[] {
  const createdAt = daysAgo(30);
  return [
    {
      _id: seedObjectId(1001),
      ownerUserId: DEMO_USER_ID,
      topic: "This Week in AI",
      cadence: { preset: "weekly", cron: "0 9 * * 1" }, // Mondays 09:00
      timezone: "America/New_York",
      options: { length: "medium", tone: "informative" },
      enabled: true,
      nextRun: new Date(NOW.getTime() + 2 * MS_PER_DAY),
      lastResult: {
        at: daysAgo(3),
        status: "ok",
        postId: seedObjectId(2).toHexString(), // links to a seeded done post
      },
      createdAt,
      updatedAt: daysAgo(3),
      seed: true,
    },
    {
      _id: seedObjectId(1002),
      ownerUserId: DEMO_USER_ID,
      themeSource: "trending-tech",
      cadence: { preset: "daily" },
      timezone: "UTC",
      options: { length: "short", tone: "punchy" },
      enabled: false,
      // disabled → no nextRun scheduled, no runs yet.
      createdAt,
      updatedAt: createdAt,
      seed: true,
    },
  ];
}

// ───────────────────────────────────────────────────────────────────────────
// Seed runner.
// ───────────────────────────────────────────────────────────────────────────

/** Remove all previously-seeded posts, schedules, and GridFS poster files. */
async function clearSeed(bucket: GridFSBucket): Promise<void> {
  const db = await getDb();

  // GridFS poster files tagged as seed data (+ their chunks via bucket.delete).
  const seedFilter = { "metadata.seed": true } as Filter<GridFSFile>;
  const oldFiles = await bucket.find(seedFilter).toArray();
  for (const f of oldFiles) {
    await bucket.delete(f._id);
  }

  await db.collection(POSTS_COLLECTION).deleteMany({ seed: true });
  await db.collection(SCHEDULES_COLLECTION).deleteMany({ seed: true });
  await db.collection(USERS_COLLECTION).deleteMany({ seed: true });
}

/** Upsert the demo account that owns all seeded posts + schedules. */
async function seedDemoUser(): Promise<void> {
  const db = await getDb();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await db.collection(USERS_COLLECTION).insertOne({
    _id: DEMO_USER_ID,
    username: DEMO_USERNAME,
    usernameLower: DEMO_USERNAME.toLowerCase(),
    passwordHash,
    createdAt: daysAgo(60),
    seed: true,
  } as Document);
}

/** Upload one placeholder poster buffer to GridFS under a fixed file id. */
async function uploadPoster(
  bucket: GridFSBucket,
  fileId: ObjectId,
  postId: string,
  bytes: Buffer,
  mime: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const stream = bucket.openUploadStreamWithId(fileId, `poster-${postId}.png`, {
      metadata: { mime, postId, seed: true },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    stream.end(bytes);
  });
}

async function seed(): Promise<void> {
  const db = await getDb();
  const bucket = await getBucket();

  // 1. Idempotency: clear any prior seed data first (incl. GridFS).
  await clearSeed(bucket);

  // 1b. Demo account — all seeded posts + schedules are owned by it, so they
  //     are viewable after logging in as demo / demo12345.
  await seedDemoUser();

  // 2. Build posts, generating + uploading a poster for each spec that has one.
  const posts: SeededPost[] = [];
  for (const spec of SPECS) {
    let posterImageId: string | undefined;
    if (spec.poster) {
      // Poster file id is derived from the post ordinal (stable across reseeds).
      const fileId = seedObjectId(3000 + spec.ordinal);
      const png = gradientPosterPng(spec.poster[0], spec.poster[1]);
      const postId = seedObjectId(spec.ordinal).toHexString();
      await uploadPoster(bucket, fileId, postId, png, "image/png");
      posterImageId = fileId.toHexString();
    }
    posts.push(buildPost(spec, posterImageId));
  }

  // 3. Insert posts + schedules (untyped collections so `seed` is permitted).
  await db.collection(POSTS_COLLECTION).insertMany(posts as Document[]);
  await db
    .collection(SCHEDULES_COLLECTION)
    .insertMany(buildSchedules() as Document[]);

  // 4. Report what landed (doubles as verification output; idempotent-stable).
  await report(bucket);
}

/** Query Mongo and print exact seeded counts — same output on every re-run. */
async function report(bucket: GridFSBucket): Promise<void> {
  const db = await getDb();
  const posts = db.collection(POSTS_COLLECTION);

  const byStatus = (await posts
    .aggregate([
      { $match: { seed: true } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray()) as { _id: string; count: number }[];

  const seedFilter = { "metadata.seed": true } as Filter<GridFSFile>;
  const posterFiles = await bucket.find(seedFilter).toArray();
  const postersOk = posterFiles.filter(
    (f) => f.metadata?.mime && f.metadata?.postId,
  ).length;

  const schedules = db.collection(SCHEDULES_COLLECTION);
  const schedEnabled = await schedules.countDocuments({ seed: true, enabled: true });
  const schedDisabled = await schedules.countDocuments({ seed: true, enabled: false });
  const totalPosts = byStatus.reduce((n, s) => n + s.count, 0);

  console.log("\nPostForge seed complete ✔");
  console.log("─".repeat(48));
  console.log(`demo login: ${DEMO_USERNAME} / ${DEMO_PASSWORD}  (owns all seed data)`);
  console.log(`posts (seed): ${totalPosts}`);
  for (const s of byStatus) {
    console.log(`  • ${s._id.padEnd(12)} ${s.count}`);
  }
  console.log(
    `posters in GridFS (seed): ${posterFiles.length} ` +
      `(${postersOk} with {mime,postId} metadata)`,
  );
  console.log(
    `schedules (seed): ${schedEnabled + schedDisabled} ` +
      `(${schedEnabled} enabled, ${schedDisabled} disabled)`,
  );
  console.log("─".repeat(48));
}

async function main(): Promise<void> {
  // Load the (symlinked) .env for standalone `tsx` runs. Next.js loads env
  // automatically, but a bare tsx process does not. Node 20.12+/24 ships
  // process.loadEnvFile(); skip if the URI is already present in the env.
  if (!process.env.MONGODB_URI) {
    try {
      process.loadEnvFile();
    } catch {
      // .env optional if MONGODB_URI is already provided by the environment.
    }
  }

  try {
    await seed();
  } finally {
    // Standalone script: close the pooled client so the process can exit.
    const client = await getClient();
    await client.close();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exitCode = 1;
});
