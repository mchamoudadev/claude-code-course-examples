/**
 * Writer agent (pipeline stage 3 · CHEAP tier — user directive: cheapest model).
 *
 * No tools. Composes an engaging draft grounded STRICTLY in the verified
 * findings (injected into the prompt), honoring the per-run tone/length options.
 * Writes `state.data.draft`. Single-turn (no tools → one inference), so its text
 * output is the draft.
 */

import { createAgent, type Agent } from "@inngest/agent-kit";
import { cheapModel } from "@/lib/models";
import type { NetworkState } from "@/lib/state";
import {
  type AgentBuildOptions,
  CHEAP_MAX_TOKENS,
  capTokens,
  lastAssistantText,
  lengthGuidance,
  renderFindings,
  textModelOverride,
  toneGuidance,
} from "./shared";

export function createWriterAgent(
  build: AgentBuildOptions = {},
): Agent<NetworkState> {
  return createAgent<NetworkState>({
    name: "write",
    description:
      "Drafts an engaging post grounded strictly in the verified findings.",
    model: capTokens(cheapModel(textModelOverride(build.options)), CHEAP_MAX_TOKENS),
    system: ({ network }) => {
      const data = network?.state.data ?? {};
      const verified = data.verifiedFindings ?? [];
      const options = data.options;
      return (
        "You are the WRITER agent for an autonomous post generator. Write a " +
        "compelling post about the user's topic.\n\n" +
        "You may ONLY use the verified findings below as your factual basis. Do " +
        "not add facts, statistics, quotes, or claims that are not supported by " +
        "them. Findings flagged [UNVERIFIED] may only be used with explicit " +
        "hedging (e.g. \"reportedly\"), or omitted.\n\n" +
        "Verified findings:\n" +
        `${renderFindings(verified)}\n\n` +
        `${toneGuidance(options)} ${lengthGuidance(options)}\n\n` +
        "Weave the facts into a natural narrative — do not just list them. Output " +
        "ONLY the post body as Markdown (no title line, no preamble, no meta " +
        "commentary)."
      );
    },
    lifecycle: {
      onFinish: ({ network, result }) => {
        if (!network) return result;
        const draft = lastAssistantText(result);
        if (draft) network.state.data.draft = draft;
        return result;
      },
    },
  });
}
