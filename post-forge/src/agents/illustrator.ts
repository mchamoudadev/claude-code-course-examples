/**
 * Illustrator agent (pipeline stage 5 · CHEAP tier — authors only a short prompt).
 *
 * Tool: generate_poster. Reads the final post/title from state, crafts a vivid
 * poster prompt, and calls `generate_poster` — which itself reads
 * `state.data.postId` (+ optional `options.imageModel`), stores the image bytes
 * in GridFS, and writes `state.data.posterImageId`. `tool_choice` forces the
 * tool so illustration completes in a single deterministic turn.
 */

import { createAgent, type Agent } from "@inngest/agent-kit";
import { cheapModel } from "@/lib/models";
import { generatePosterTool } from "@/agents/tools";
import type { NetworkState } from "@/lib/state";
import { CHEAP_MAX_TOKENS, capTokens } from "./shared";

// Utility agent: authors only a short poster prompt, so it stays on the CHEAP
// tier and intentionally does not honor the per-run text-model override.
export function createIllustratorAgent(): Agent<NetworkState> {
  return createAgent<NetworkState>({
    name: "illustrate",
    description:
      "Crafts a poster prompt from the finished post and generates the poster image.",
    model: capTokens(cheapModel(), CHEAP_MAX_TOKENS),
    tools: [generatePosterTool],
    // Force the single-action tool so this stage resolves in one turn.
    tool_choice: "generate_poster",
    system: ({ network }) => {
      const data = network?.state.data ?? {};
      const title = data.title ?? "";
      const finalPost = data.finalPost ?? "";
      const excerpt = finalPost.slice(0, 1200);
      return (
        "You are the ILLUSTRATOR agent for an autonomous post generator. Design a " +
        "striking, original poster image for the finished post below.\n\n" +
        `Title: ${title}\n\n` +
        `Post (excerpt):\n${excerpt}\n\n` +
        "Call `generate_poster` exactly once. In its `prompt`, describe a vivid, " +
        "specific poster: the central subject/scene, the artistic style, the color " +
        "palette, composition, and mood. Make it evocative of the post's theme. Do " +
        "NOT include real logos, watermarks, or long passages of text in the image."
      );
    },
  });
}
