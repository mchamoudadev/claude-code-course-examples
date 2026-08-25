/**
 * Publisher agent (pipeline stage 6 · CHEAP tier — trivial persistence).
 *
 * Tool: save_post. Persists the finished post via an idempotent upsert keyed by
 * `state.data.runId` (which `save_post` REQUIRES — it throws without it). The
 * tool flips the post to done, sets `state.data.published = true` (stopping the
 * router) and `state.data.postId`.
 *
 * The exact final title/body/sources are injected into the prompt and the tool
 * is forced, so publishing resolves in a single deterministic turn.
 *
 * NOTE for T05: `save_post` writes the body from the model-provided tool args.
 * The authoritative final content lives in `state.data.finalPost/title/sources`,
 * so T05's own post-stage persistence (writing those state keys to the doc)
 * should be treated as the source of truth if they ever diverge.
 */

import { createAgent, type Agent } from "@inngest/agent-kit";
import { cheapModel } from "@/lib/models";
import { savePostTool } from "@/agents/tools";
import type { NetworkState } from "@/lib/state";
import { CHEAP_MAX_TOKENS, capTokens } from "./shared";

// Utility agent: trivial persistence, so it stays on the CHEAP tier and
// intentionally does not honor the per-run text-model override.
export function createPublisherAgent(): Agent<NetworkState> {
  return createAgent<NetworkState>({
    name: "publish",
    description: "Persists the finished post as the final publishing step.",
    model: capTokens(cheapModel(), CHEAP_MAX_TOKENS),
    tools: [savePostTool],
    // Force the single-action tool so this stage resolves in one turn.
    tool_choice: "save_post",
    system: ({ network }) => {
      const data = network?.state.data ?? {};
      const title = data.title ?? "";
      const finalPost = data.finalPost ?? "";
      const sources = data.sources ?? [];
      const sourcesJson = JSON.stringify(sources);
      return (
        "You are the PUBLISHER agent for an autonomous post generator. Persist the " +
        "finished post now by calling `save_post` exactly once.\n\n" +
        "Pass these values VERBATIM — do not summarize, translate, shorten, or " +
        "alter them in any way:\n\n" +
        `title: ${title}\n\n` +
        `finalPost (copy the full Markdown exactly):\n${finalPost}\n\n` +
        `sources (pass exactly this JSON array): ${sourcesJson}\n`
      );
    },
  });
}
