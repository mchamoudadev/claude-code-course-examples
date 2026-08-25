/**
 * Verify agent (pipeline stage 2 · SMART tier).
 *
 * Tool: web_search. Re-checks each research finding against fresh independent
 * sources, sets the `verified` flag, and DROPS claims it cannot support. Writes
 * `state.data.verifiedFindings: Finding[]` and derives `state.data.sources` (the
 * de-duplicated citation list the writer/editor/publisher reuse).
 *
 * Drop-vs-flag policy (BRD §10):
 *   - DROP a claim that is contradicted by sources or is a fabricated/unfindable
 *     URL — it must not reach the writer at all.
 *   - KEEP-BUT-FLAG (`verified:false`) a claim that is plausible but could not be
 *     independently corroborated — the writer may only use it with hedging.
 *   - KEEP (`verified:true`) a claim corroborated by a credible source.
 */

import { createAgent, type Agent } from "@inngest/agent-kit";
import { smartModel } from "@/lib/models";
import { webSearchTool } from "@/agents/tools";
import type { NetworkState } from "@/lib/state";
import {
  type AgentBuildOptions,
  MAX_SOURCES,
  MAX_VERIFIED,
  SMART_MAX_TOKENS,
  capTokens,
  coerceFindings,
  dedupeSources,
  extractJsonValue,
  isFinalAnswerTurn,
  lastAssistantText,
  renderFindings,
  textModelOverride,
} from "./shared";

/**
 * Turn budget for the verify stage. A well-behaved run needs at most 3
 * `web_search` calls + 1 final-answer turn (see the system prompt). We allow a
 * little slack for a retry, then DEGRADE GRACEFULLY rather than let the router
 * re-select `verify` until the network's `maxIter` cap hard-fails the whole run
 * at the verify gate (the observed failure with weak models — R-0025). Set well
 * below `DEFAULT_MAX_ITER` (40) so degradation always wins the race.
 */
const VERIFY_MAX_TURNS = 6;

export function createVerifyAgent(
  build: AgentBuildOptions = {},
): Agent<NetworkState> {
  // Per-run turn counter. This factory is called once per `buildNetwork`, and
  // `buildNetwork` runs fresh on every generation (and every Inngest retry), so
  // the counter is naturally scoped to a single run — no cross-run leakage.
  let turns = 0;

  return createAgent<NetworkState>({
    name: "verify",
    description:
      "Fact-checks each research claim against fresh sources; drops or flags unsupported ones.",
    model: capTokens(smartModel(textModelOverride(build.options)), SMART_MAX_TOKENS),
    tools: [webSearchTool],
    system: ({ network }) => {
      const research = network?.state.data.research ?? [];
      return (
        "You are the VERIFY agent — the fact-checking gate for an autonomous post " +
        "generator. Trust is the product: nothing unverified may pass unmarked.\n\n" +
        "Here are the research findings to check:\n" +
        `${renderFindings(research)}\n\n` +
        "STRICT tool budget: perform AT MOST 3 `web_search` calls total, then STOP. " +
        "Corroborate the most important claims against independent, credible " +
        "sources; you need not search every claim individually. Then decide, for " +
        "each finding:\n" +
        "- DROP it (omit from output) if a source contradicts it, or its URL/claim " +
        "appears fabricated or cannot be found.\n" +
        "- KEEP with \"verified\": false if it is plausible but you could NOT " +
        "independently corroborate it.\n" +
        "- KEEP with \"verified\": true if a credible source confirms it.\n\n" +
        `Keep at most ${MAX_VERIFIED} findings.\n\n` +
        "OUTPUT CONTRACT (critical): on any turn where you are NOT calling a tool, " +
        "your message must be ONLY a raw JSON object — no prose, no code fences — of " +
        "exactly this shape:\n" +
        '{ "verifiedFindings": [ { "claim": "<claim>", "source": { "title": ' +
        '"<title>", "url": "<url>" }, "verified": true } ] }\n' +
        "Never mix prose and JSON. Either call `web_search`, or emit the final JSON."
      );
    },
    lifecycle: {
      onFinish: ({ network, result }) => {
        if (!network) return result;
        turns += 1;

        // On a final-answer (non-tool) turn, try to parse the structured output.
        // An empty array is a valid outcome (all claims dropped) and advances.
        if (isFinalAnswerTurn(result)) {
          const parsed = extractJsonValue(lastAssistantText(result));
          if (parsed !== null) {
            const verified = coerceFindings(parsed, false).slice(0, MAX_VERIFIED);
            network.state.data.verifiedFindings = verified;
            network.state.data.sources = dedupeSources(verified, MAX_SOURCES);
            return result;
          }
          // Final answer but nothing parseable — fall through to the budget check.
        }

        // Graceful degradation: the model has exhausted its turn budget without
        // ever emitting usable JSON (it kept calling tools, or kept answering in
        // prose). Rather than stall — the router would re-select `verify` until
        // `maxIter`, hard-failing the run at the verify gate — pass the research
        // findings through flagged `verified:false`. Trust policy holds: nothing
        // is asserted as verified that wasn't corroborated, and the writer only
        // uses [UNVERIFIED] claims with explicit hedging.
        if (turns >= VERIFY_MAX_TURNS) {
          const research = network.state.data.research ?? [];
          const passthrough = research
            .slice(0, MAX_VERIFIED)
            .map((f) => ({ ...f, verified: false }));
          network.state.data.verifiedFindings = passthrough;
          network.state.data.sources = dedupeSources(passthrough, MAX_SOURCES);
        }
        return result; // under budget — let the router give verify another turn
      },
    },
  });
}
