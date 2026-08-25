/**
 * Shared helpers for the six PostForge agents + the router network.
 *
 * The four tool bindings are FIXED by the T04 BRD (research→[web_search,
 * fetch_url]; verify→[web_search]; writer→[]; editor→[]; illustrator→
 * [generate_poster]; publisher→[save_post]). Two of those tools already write to
 * `network.state.data` (generate_poster→posterImageId; save_post→published+
 * postId), but the four content agents (research/verify/writer/editor) have no
 * state-writing tool. In AgentKit the state-writing mechanism for a tool-less
 * agent is the `onFinish` lifecycle hook, which receives the finalized
 * `AgentResult` and can mutate `network.state.data` before the router runs
 * again. These helpers implement that: extract the agent's final text, parse it,
 * and coerce it into the typed `NetworkState` keys.
 *
 * Execution note (verified against @inngest/agent-kit@0.13.2 source): the
 * Network invokes each agent with `maxIter:0`, i.e. ONE inference (plus its tool
 * invocations) per network turn, then re-runs the router. A tool-using agent
 * therefore advances over several turns — tool-call turns produce no final JSON
 * (we skip them via {@link isFinalAnswerTurn}) and the last turn emits the
 * structured answer we parse here.
 */

import type { AgentResult, Message, TextContent } from "@inngest/agent-kit";
import type { Finding, GenerationOptions, Source } from "@/lib/state";
import { listPosts } from "@/lib/posts-repo";

/* --------------------------------------------------------------------------- */
/* Caps & tuning (BRD §4.5: max findings / sources / router iterations)        */
/* --------------------------------------------------------------------------- */

/** Network safety cap — max total agent invocations before the run loop stops. */
export const DEFAULT_MAX_ITER = 40;
/** Max research findings retained. */
export const MAX_FINDINGS = 12;
/** Max verified findings retained. */
export const MAX_VERIFIED = 12;
/** Max de-duplicated sources retained on the post. */
export const MAX_SOURCES = 10;
/** Max prior topics injected into the research prompt (duplicate-topic memory). */
export const MAX_MEMORY_TOPICS = 10;
/** TTL for the memoized prior-topics lookup (keeps it cheap across turns). */
const MEMORY_TTL_MS = 30_000;

/* --------------------------------------------------------------------------- */
/* Per-run model override                                                      */
/* --------------------------------------------------------------------------- */

/** Options threaded into each agent factory (currently just generation opts). */
export interface AgentBuildOptions {
  options?: GenerationOptions;
}

/**
 * Bounded completion length per tier. AgentKit's openai-chat request parser sets
 * no `max_tokens`, so OpenRouter's pre-flight affordability check assumes the
 * model's *full* max completion (e.g. 65536 for gpt-5.5) and rejects the request
 * on a low credit balance. Capping `max_tokens` keeps requests affordable and
 * bounds generation cost. Values are generous for our short structured outputs
 * (findings JSON / a post + title) while leaving reasoning headroom.
 */
export const SMART_MAX_TOKENS = 16000;
export const CHEAP_MAX_TOKENS = 8000;

/**
 * Set a bounded `max_tokens` on an AgentKit model adapter via its
 * `defaultParameters` (the openai adapter's `onCall` merges these into the
 * request body). Mutates + returns the same adapter — safe because each run
 * builds fresh adapters.
 */
export function capTokens<M>(model: M, maxTokens: number): M {
  const opts = (model as { options?: { defaultParameters?: Record<string, unknown> } })
    .options;
  if (opts) {
    opts.defaultParameters = {
      ...(opts.defaultParameters ?? {}),
      max_tokens: maxTokens,
    };
  }
  return model;
}

/**
 * Per-run text-model override for the four content agents. When `options.model`
 * is set it overrides the agent's tier default (SMART/CHEAP); when unset the
 * factory falls through to the env tier. Utility agents (illustrator/publisher)
 * intentionally ignore this — it is the *content* text model, not a knob for the
 * trivial poster-prompt / persistence calls.
 */
export function textModelOverride(options?: GenerationOptions): { model?: string } {
  return { model: options?.model };
}

/* --------------------------------------------------------------------------- */
/* Text extraction from an AgentResult                                         */
/* --------------------------------------------------------------------------- */

function textContent(content: string | TextContent[]): string {
  if (typeof content === "string") return content;
  return content.map((p) => (p && p.type === "text" ? p.text : "")).join("");
}

/** Concatenate all assistant text messages from a finished agent result. */
export function lastAssistantText(result: AgentResult): string {
  const parts: string[] = [];
  for (const msg of result.output as Message[]) {
    if (msg.type === "text" && msg.role === "assistant") {
      parts.push(textContent(msg.content));
    }
  }
  return parts.join("\n").trim();
}

/**
 * True when this turn is the agent's *final answer* (no tool calls were made).
 * We only parse structured output on final-answer turns; tool-call turns are
 * skipped so the router routes back to the same agent for another turn.
 */
export function isFinalAnswerTurn(result: AgentResult): boolean {
  return result.toolCalls.length === 0;
}

/**
 * Drop hallucinated tool calls from an inference result (R-0030).
 *
 * A weak model sometimes emits a `tool_call` for a name the agent does not
 * expose (e.g. `run`). AgentKit's `invokeTools` THROWS on an unknown tool, which
 * aborts the entire network run and fails the generation. Wired as each agent's
 * `onResponse` (runs after inference, before tools), this strips only the
 * unknown tool entries — real tool calls and text are left untouched, so a turn
 * that also made a valid call still proceeds. If the model called ONLY a bogus
 * tool, the turn becomes tool-less and the router simply routes back for another
 * pass (bounded by each agent's own turn budget), rather than crashing.
 *
 * The `agent` param is intentionally structural (just `tools.has`) to sidestep
 * `Map` variance when the hook passes a fully-typed `Agent`.
 */
export function stripUnknownToolCalls(
  agent: { tools: { has(name: string): boolean } },
  result: AgentResult,
): AgentResult {
  for (const msg of result.output as Message[]) {
    if (msg.type === "tool_call" && Array.isArray(msg.tools)) {
      const known = msg.tools.filter((t) => agent.tools.has(t.name));
      if (known.length !== msg.tools.length) {
        msg.tools = known;
      }
    }
  }
  return result;
}

/* --------------------------------------------------------------------------- */
/* Tolerant JSON extraction + Finding coercion                                 */
/* --------------------------------------------------------------------------- */

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/**
 * Pull a JSON value out of a model's text answer, tolerating ```json fences and
 * surrounding prose. Returns the parsed value, or `null` if nothing parses.
 */
export function extractJsonValue(text: string): unknown {
  if (!text) return null;
  let t = text.trim();

  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (fence) t = fence[1].trim();

  const direct = tryParse(t);
  if (direct !== undefined) return direct;

  const candidates: Array<[number, number]> = [];
  const objStart = t.indexOf("{");
  const objEnd = t.lastIndexOf("}");
  if (objStart >= 0 && objEnd > objStart) candidates.push([objStart, objEnd]);
  const arrStart = t.indexOf("[");
  const arrEnd = t.lastIndexOf("]");
  if (arrStart >= 0 && arrEnd > arrStart) candidates.push([arrStart, arrEnd]);
  candidates.sort((a, b) => a[0] - b[0]);

  for (const [s, e] of candidates) {
    const v = tryParse(t.slice(s, e + 1));
    if (v !== undefined) return v;
  }
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Coerce an arbitrary parsed JSON value into a typed `Finding[]`. Accepts a bare
 * array, `{ findings: [...] }`, or `{ verifiedFindings: [...] }`. Each item must
 * carry a non-empty `claim` and `source.url`; malformed items are dropped.
 * `verified` uses the item's boolean when present, else `defaultVerified`.
 */
export function coerceFindings(raw: unknown, defaultVerified: boolean): Finding[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (isRecord(raw) && Array.isArray(raw.findings)) arr = raw.findings;
  else if (isRecord(raw) && Array.isArray(raw.verifiedFindings)) {
    arr = raw.verifiedFindings;
  }

  const out: Finding[] = [];
  for (const item of arr) {
    if (!isRecord(item)) continue;
    const claim = str(item.claim);
    const srcRaw = isRecord(item.source) ? item.source : {};
    const url = str(srcRaw.url);
    if (!claim || !url) continue;
    const title = str(srcRaw.title) || url;
    const verified =
      typeof item.verified === "boolean" ? item.verified : defaultVerified;
    out.push({ claim, source: { title, url }, verified });
  }
  return out;
}

/** De-duplicate sources (by url) across findings, capped. */
export function dedupeSources(findings: Finding[], cap = MAX_SOURCES): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const f of findings) {
    const url = f.source?.url?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ title: f.source.title?.trim() || url, url });
    if (out.length >= cap) break;
  }
  return out;
}

/* --------------------------------------------------------------------------- */
/* Editor title/body parsing                                                   */
/* --------------------------------------------------------------------------- */

const BODY_SEPARATOR = "%%%BODY%%%";

function cleanTitle(s: string): string {
  return s
    .replace(/^\s*TITLE:\s*/i, "")
    .replace(/^\s*#+\s*/, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();
}

/**
 * Parse the editor's `TITLE: …` / `%%%BODY%%%` / body format into a title +
 * final post. Falls back to "first line is the title, the rest is the body" when
 * the separator is absent.
 */
export function parseTitleAndBody(text: string): {
  title: string;
  finalPost: string;
} {
  const trimmed = text.trim();
  const idx = trimmed.indexOf(BODY_SEPARATOR);
  if (idx >= 0) {
    const title = cleanTitle(trimmed.slice(0, idx));
    const body = trimmed.slice(idx + BODY_SEPARATOR.length).trim();
    return {
      title: title || firstLineAsTitle(body),
      finalPost: body || trimmed,
    };
  }

  const nl = trimmed.indexOf("\n");
  if (nl === -1) {
    return { title: cleanTitle(trimmed).slice(0, 120), finalPost: trimmed };
  }
  const first = cleanTitle(trimmed.slice(0, nl));
  const rest = trimmed.slice(nl + 1).trim();
  return { title: first || firstLineAsTitle(rest), finalPost: rest || trimmed };
}

function firstLineAsTitle(body: string): string {
  const first = body.split("\n").find((l) => l.trim() !== "") ?? "";
  return cleanTitle(first).slice(0, 120) || "Untitled";
}

/* --------------------------------------------------------------------------- */
/* Prompt-building helpers                                                      */
/* --------------------------------------------------------------------------- */

/** Render findings as a numbered, source-attributed list for a prompt. */
export function renderFindings(findings: Finding[]): string {
  if (findings.length === 0) return "(none)";
  return findings
    .map((f, i) => {
      const flag = f.verified === false ? " [UNVERIFIED — do not state as fact]" : "";
      return `${i + 1}. ${f.claim}${flag}\n   Source: ${f.source.title} — ${f.source.url}`;
    })
    .join("\n");
}

/** Length guidance string for the writer/editor prompts. */
export function lengthGuidance(options?: GenerationOptions): string {
  switch (options?.length) {
    case "short":
      return "Target roughly 120-180 words across 2-3 tight paragraphs.";
    case "long":
      return "Target roughly 650-900 words with clear sections and subheadings.";
    case "medium":
    default:
      return "Target roughly 300-450 words across 3-5 paragraphs.";
  }
}

/** Tone guidance string for the writer/editor prompts. */
export function toneGuidance(options?: GenerationOptions): string {
  const tone = options?.tone?.trim();
  return tone
    ? `Write in a distinctly ${tone} tone.`
    : "Write in a clear, engaging, professional tone.";
}

/* --------------------------------------------------------------------------- */
/* Memory / duplicate-topic awareness (BRD §4.4)                               */
/* --------------------------------------------------------------------------- */

let memoAt = 0;
let memoTopics: string[] = [];
let memoInflight: Promise<string[]> | null = null;

/**
 * Recently generated topics (newest first), for duplicate-topic awareness in the
 * research prompt. Best-effort and cheap: a small `listPosts` page, memoized for
 * {@link MEMORY_TTL_MS} so the several research turns share one DB round-trip. A
 * DB failure yields `[]` and never breaks the run.
 */
export async function getRecentTopics(
  limit = MAX_MEMORY_TOPICS,
): Promise<string[]> {
  const now = Date.now();
  if (memoTopics.length > 0 && now - memoAt < MEMORY_TTL_MS) return memoTopics;
  if (memoInflight) return memoInflight;

  memoInflight = (async () => {
    try {
      const { items } = await listPosts({ pageSize: limit });
      memoTopics = items.map((p) => p.topic).filter((t): t is string => !!t);
      memoAt = Date.now();
      return memoTopics;
    } catch {
      return memoTopics;
    } finally {
      memoInflight = null;
    }
  })();
  return memoInflight;
}

/** Test seam: reset the memoized topics cache. */
export function _resetMemoryCache(): void {
  memoAt = 0;
  memoTopics = [];
  memoInflight = null;
}
