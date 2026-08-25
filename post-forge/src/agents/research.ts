/**
 * Research agent (pipeline stage 1 · CHEAP tier).
 *
 * Tools: web_search, fetch_url. Searches the topic, pulls the strongest sources,
 * and extracts source-attributed claims. Writes `state.data.research: Finding[]`.
 *
 * It runs over several network turns: tool-call turns gather evidence (skipped by
 * the state-writer), and the final turn emits a JSON array of findings which the
 * `onFinish` hook parses into state. Memory: recent topics are injected for
 * duplicate-topic awareness (enforcement is T19).
 *
 * COVERAGE (R-0028): a weak model tends to stop early (~3 findings). We push for
 * 7–10 with (a) a firmer prompt + a larger tool budget, and (b) a stall-safe
 * bounded retry — if a final answer falls short of {@link RESEARCH_MIN_FINDINGS},
 * we ACCUMULATE what it found (deduped by claim) and re-route with a corrective
 * note asking for more, up to {@link RESEARCH_MAX_ATTEMPTS} attempts. We never
 * loop unbounded (the mistake that killed the verify gate — R-0027): once the
 * attempt budget is spent we advance with the best set gathered so far.
 */

import { createAgent, type Agent } from "@inngest/agent-kit";
import { cheapModel } from "@/lib/models";
import { webSearchTool, fetchUrlTool } from "@/agents/tools";
import type { Finding, NetworkState } from "@/lib/state";
import {
  type AgentBuildOptions,
  CHEAP_MAX_TOKENS,
  MAX_FINDINGS,
  capTokens,
  coerceFindings,
  extractJsonValue,
  getRecentTopics,
  isFinalAnswerTurn,
  lastAssistantText,
  textModelOverride,
} from "./shared";

/** Minimum distinct findings we want before advancing to verify. */
export const RESEARCH_MIN_FINDINGS = 7;
/** Upper target communicated to the model (hard cap stays {@link MAX_FINDINGS}). */
export const RESEARCH_TARGET_MAX = 10;
/**
 * Max final-answer attempts before we accept whatever was gathered. Bounds the
 * retry so a model that can't reach the minimum still advances (no stall).
 */
export const RESEARCH_MAX_ATTEMPTS = 3;

/** Merge `extra` into `base`, dropping duplicate claims (case-insensitive), capped. */
function mergeFindings(base: Finding[], extra: Finding[]): Finding[] {
  const seen = new Set(base.map((f) => f.claim.trim().toLowerCase()));
  const out = [...base];
  for (const f of extra) {
    const key = f.claim.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(f);
    }
  }
  return out.slice(0, MAX_FINDINGS);
}

export function createResearchAgent(
  build: AgentBuildOptions = {},
): Agent<NetworkState> {
  // Per-run state (this factory runs once per `buildNetwork`, i.e. once per
  // generation and once per Inngest retry — so it never leaks across runs):
  //  - `attempts`  counts final-answer turns (retry budget).
  //  - `best`      accumulates distinct findings across attempts.
  //  - `lastCount` size of `best` after the latest attempt (-1 = none yet), read
  //                by `system()` to add a corrective nudge on the next pass.
  let attempts = 0;
  let best: Finding[] = [];
  let lastCount = -1;

  return createAgent<NetworkState>({
    name: "research",
    description:
      "Searches the web for primary sources and extracts source-backed claims.",
    model: capTokens(cheapModel(textModelOverride(build.options)), CHEAP_MAX_TOKENS),
    tools: [webSearchTool, fetchUrlTool],
    system: async () => {
      const recent = await getRecentTopics();
      const memory =
        recent.length > 0
          ? `\n\nFor context, these topics were generated recently (avoid duplicating angles already covered, and note if this request overlaps): ${recent
              .map((t) => `"${t}"`)
              .join(", ")}.`
          : "";

      const base =
        "You are the RESEARCH agent for an autonomous post generator. Your job " +
        "is to gather trustworthy, source-backed facts about the user's topic, " +
        "then STOP and report them.\n\n" +
        "TOOL BUDGET: perform AT MOST 4 `web_search` calls and AT MOST 2 " +
        "`fetch_url` calls in this entire conversation. Use DIFFERENT, specific " +
        "queries across searches (distinct angles, subtopics, dates, named " +
        "entities) so you gather a WIDE spread of facts — not many results about " +
        "the same point.\n\n" +
        `TARGET: collect AT LEAST ${RESEARCH_MIN_FINDINGS} and up to ` +
        `${RESEARCH_TARGET_MAX} DISTINCT, sourced facts. Do NOT stop at 3–4. Keep ` +
        `searching until you have at least ${RESEARCH_MIN_FINDINGS} solid ` +
        "findings OR you have used your entire tool budget.\n\n" +
        "Use only the `web_search` snippets and any `fetch_url` text you actually " +
        "retrieved. Prefer primary/official and reputable sources. Never invent " +
        "facts or URLs; every claim must trace to a result you actually saw. Each " +
        "finding must be a DISTINCT claim — do not repeat the same fact.\n\n" +
        "OUTPUT CONTRACT (critical): on any turn where you are NOT calling a tool, " +
        "your message must be ONLY a raw JSON object — no prose, no explanation, no " +
        "code fences — of exactly this shape:\n" +
        '{ "findings": [ { "claim": "<specific factual claim>", "source": ' +
        '{ "title": "<page title>", "url": "<exact source url>" } } ] }\n' +
        "Never mix prose and JSON. Either call a tool, or emit the final JSON.";

      // On a retry, tell the model exactly how short it fell so it searches more.
      const shortfall =
        lastCount >= 0 && lastCount < RESEARCH_MIN_FINDINGS
          ? `\n\nIMPORTANT: your previous answer had only ${lastCount} finding(s) — ` +
            "that is too few. Run MORE `web_search` calls with NEW queries and " +
            `return at least ${RESEARCH_MIN_FINDINGS} distinct sourced findings ` +
            "this time (keep the ones you already found and add more)."
          : "";

      return base + shortfall + memory;
    },
    lifecycle: {
      onFinish: ({ network, result }) => {
        if (!network) return result;
        if (!isFinalAnswerTurn(result)) return result; // tool turn — keep going
        attempts += 1;

        const parsed = extractJsonValue(lastAssistantText(result));
        const findings = coerceFindings(parsed, false).slice(0, MAX_FINDINGS);
        // Accumulate across attempts so a short first pass isn't thrown away.
        best = mergeFindings(best, findings);
        lastCount = best.length;

        // Advance once we have enough, OR the retry budget is spent (accept the
        // best set gathered — never loop to maxIter). Require at least one sourced
        // finding before advancing (product principle: trust through sources); if
        // we have none even after the budget, leave `research` unset so the run
        // fails cleanly rather than writing an unsourced post.
        const enough = best.length >= RESEARCH_MIN_FINDINGS;
        const budgetSpent = attempts >= RESEARCH_MAX_ATTEMPTS;
        if ((enough || budgetSpent) && best.length > 0) {
          network.state.data.research = best;
        }
        return result;
      },
    },
  });
}
