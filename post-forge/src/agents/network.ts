/**
 * PostForge agent network — the six agents assembled under a deterministic,
 * state-driven code router (AgentKit's recommended orchestration pattern; no LLM
 * routing). The router walks Research → Verify → Write → Edit → Illustrate →
 * Publish by inspecting `network.state.data` and stops when `published === true`.
 *
 * Verified against @inngest/agent-kit@0.13.2: the router is a plain function
 * `({ network }) => Agent | undefined`, re-evaluated after every agent turn; a
 * single Agent return is normalized to a stack of one; `undefined` ends the run.
 * The network's `maxIter` is the loop safety cap (its default of 0 means
 * *unbounded*, so we set it explicitly).
 *
 * `buildNetwork(...)` is the per-run factory T05 uses: AgentKit networks are
 * stateful and `run()` may only be called once, so a fresh network (with
 * per-run model overrides + seeded initial state) is built for each generation.
 */

import { createNetwork, createState, type Agent, type Network } from "@inngest/agent-kit";
import type { GenerationOptions, NetworkState } from "@/lib/state";
import { DEFAULT_MAX_ITER, stripUnknownToolCalls } from "./shared";
import { createResearchAgent } from "./research";
import { createVerifyAgent } from "./verify";
import { createWriterAgent } from "./writer";
import { createEditorAgent } from "./editor";
import { createIllustratorAgent } from "./illustrator";
import { createPublisherAgent } from "./publisher";

/** The stage-aligned agent name each router rung selects. */
export type RouterAgentId =
  | "research"
  | "verify"
  | "write"
  | "edit"
  | "illustrate"
  | "publish";

/** Agent names, in pipeline order. Also the telemetry/stage keys T05 uses. */
export const AGENT_NAMES: readonly RouterAgentId[] = [
  "research",
  "verify",
  "write",
  "edit",
  "illustrate",
  "publish",
] as const;

/**
 * The deterministic router as a PURE function of state — the unit T18 tests.
 * Exactly the BRD §4.2 if-ladder; returns the next agent's id, or `null` when
 * the run is complete (`published === true`). No agent can run out of order for
 * any partial state.
 */
export function selectNextAgentId(
  state: Partial<NetworkState>,
): RouterAgentId | null {
  if (!state.research) return "research";
  if (!state.verifiedFindings) return "verify";
  if (!state.draft) return "write";
  if (!state.finalPost) return "edit";
  if (!state.posterImageId) return "illustrate";
  if (!state.published) return "publish";
  return null; // done
}

/** Per-run configuration for {@link buildNetwork}. */
export interface BuildNetworkOptions {
  /** Per-run generation options (tone/length/model/imageModel). */
  options?: GenerationOptions;
  /** Correlation id from POST /api/generate — required by the publisher's save_post. */
  runId?: string;
  /** The `posts` document id (string) — required by the illustrator's generate_poster. */
  postId?: string;
  /** The user's topic (seed input). */
  topic?: string;
  /** Router/loop safety cap (max agent invocations). Defaults to {@link DEFAULT_MAX_ITER}. */
  maxIter?: number;
}

/**
 * Attach a hallucinated-tool-call guard to an agent's `onResponse`, composing
 * with any hook it already defines. See {@link stripUnknownToolCalls} (R-0030):
 * a weak model calling a tool the agent doesn't expose would otherwise throw
 * inside AgentKit and crash the whole run.
 */
function guardToolCalls(agent: Agent<NetworkState>): Agent<NetworkState> {
  const prior = agent.lifecycles?.onResponse;
  agent.lifecycles = {
    ...agent.lifecycles,
    onResponse: async (args) => {
      const cleaned = stripUnknownToolCalls(args.agent, args.result);
      return prior ? prior({ ...args, result: cleaned }) : cleaned;
    },
  };
  return agent;
}

/** Build the six agents with per-run model overrides applied. */
export function createAgents(
  options?: GenerationOptions,
): Record<RouterAgentId, Agent<NetworkState>> {
  const build = { options };
  const agents: Record<RouterAgentId, Agent<NetworkState>> = {
    research: createResearchAgent(build),
    verify: createVerifyAgent(build),
    write: createWriterAgent(build),
    edit: createEditorAgent(build),
    illustrate: createIllustratorAgent(),
    publish: createPublisherAgent(),
  };
  for (const agent of Object.values(agents)) guardToolCalls(agent);
  return agents;
}

/**
 * Build a fresh, ready-to-run PostForge network. Seeds initial `state.data` with
 * `{ topic, runId, postId, options }` so the tools (generate_poster/save_post)
 * and dynamic agent prompts find what they need. Call once per generation run.
 */
export function buildNetwork(
  build: BuildNetworkOptions = {},
): Network<NetworkState> {
  const { options, runId, postId, topic, maxIter = DEFAULT_MAX_ITER } = build;

  const agents = createAgents(options);

  const seed: NetworkState = { options: options ?? {} };
  if (topic !== undefined) seed.topic = topic;
  if (runId !== undefined) seed.runId = runId;
  if (postId !== undefined) seed.postId = postId;

  return createNetwork<NetworkState>({
    name: "postforge",
    agents: Object.values(agents),
    defaultState: createState<NetworkState>(seed),
    maxIter,
    router: ({ network }) => {
      const id = selectNextAgentId(network.state.data);
      return id ? agents[id] : undefined;
    },
  });
}
