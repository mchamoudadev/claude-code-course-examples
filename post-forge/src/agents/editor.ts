/**
 * Editor agent (pipeline stage 4 · SMART tier).
 *
 * No tools. Polishes the draft into the final post + a title, ensuring every
 * claim still traces to the verified findings (both injected). Writes
 * `state.data.finalPost` and `state.data.title`. Single-turn.
 *
 * Output format avoids JSON-escaping a long Markdown body: a `TITLE:` line, a
 * `%%%BODY%%%` separator, then the body — parsed by {@link parseTitleAndBody}.
 */

import { createAgent, type Agent } from "@inngest/agent-kit";
import { smartModel } from "@/lib/models";
import type { NetworkState } from "@/lib/state";
import {
  type AgentBuildOptions,
  MAX_SOURCES,
  SMART_MAX_TOKENS,
  capTokens,
  dedupeSources,
  lastAssistantText,
  lengthGuidance,
  parseTitleAndBody,
  renderFindings,
  textModelOverride,
  toneGuidance,
} from "./shared";

export function createEditorAgent(
  build: AgentBuildOptions = {},
): Agent<NetworkState> {
  return createAgent<NetworkState>({
    name: "edit",
    description:
      "Polishes the draft into the final post + title; keeps every claim source-traceable.",
    model: capTokens(smartModel(textModelOverride(build.options)), SMART_MAX_TOKENS),
    system: ({ network }) => {
      const data = network?.state.data ?? {};
      const draft = data.draft ?? "";
      const verified = data.verifiedFindings ?? [];
      const options = data.options;
      return (
        "You are the EDITOR agent for an autonomous post generator. Turn the draft " +
        "into a polished, publication-ready post and give it a strong title.\n\n" +
        "Rules:\n" +
        "- Tighten prose, structure, and flow; fix errors and awkward phrasing.\n" +
        "- Every factual claim must still trace to the verified findings below. " +
        "Remove or soften anything that does not.\n" +
        `- Preserve the requested style. ${toneGuidance(options)} ${lengthGuidance(options)}\n\n` +
        "Verified findings (the only permissible factual basis):\n" +
        `${renderFindings(verified)}\n\n` +
        "Draft to edit:\n" +
        `${draft}\n\n` +
        "Respond in EXACTLY this format and nothing else:\n" +
        "TITLE: <a concise, compelling title>\n" +
        "%%%BODY%%%\n" +
        "<the final post body in Markdown>"
      );
    },
    lifecycle: {
      onFinish: ({ network, result }) => {
        if (!network) return result;
        const text = lastAssistantText(result);
        if (!text) return result;

        const { title, finalPost } = parseTitleAndBody(text);
        if (!finalPost) return result;
        network.state.data.finalPost = finalPost;
        network.state.data.title = title;
        // Ensure a sources list exists for the publisher even if verify didn't set it.
        if (!network.state.data.sources) {
          network.state.data.sources = dedupeSources(
            network.state.data.verifiedFindings ?? [],
            MAX_SOURCES,
          );
        }
        return result;
      },
    },
  });
}
