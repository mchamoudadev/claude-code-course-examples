/**
 * Verify-agent reliability (R-0025 regression).
 *
 * The verify stage is the pipeline's single brittle gate: the router re-selects
 * `verify` until `state.verifiedFindings` is set, so a weak model that never
 * emits the required JSON — or never stops calling `web_search` — used to loop
 * until the network's `maxIter` cap, hard-failing the WHOLE run at verify
 * ("generation ended before publishing"). These tests pin the two contracts that
 * prevent that:
 *   1. A parseable final-answer turn sets `verifiedFindings` (+ derived sources).
 *   2. After a bounded turn budget WITHOUT usable output, the agent DEGRADES
 *      GRACEFULLY — it passes the research findings through flagged
 *      `verified:false` — so the run always advances past the gate.
 *
 * We drive the agent's `onFinish` lifecycle hook directly with mock turns; no
 * model / network / OpenRouter call is made (a dummy key satisfies the factory).
 */

import { beforeAll, describe, expect, it } from "vitest";
import { createVerifyAgent } from "@/agents/verify";
import { selectNextAgentId } from "@/agents/network";
import { MAX_VERIFIED } from "@/agents/shared";
import type { Finding, NetworkState } from "@/lib/state";

// Building the agent constructs a model adapter, which reads the OpenRouter key.
// A dummy value is enough — no request is ever sent in these unit tests.
beforeAll(() => {
  process.env.OPENROUTER_API_KEY ??= "test-key";
});

/** The onFinish lifecycle hook, cast to the minimal shape these tests drive. */
type OnFinishArgs = {
  network: { state: { data: Partial<NetworkState> } };
  result: { toolCalls: unknown[]; output: unknown[] };
};
function onFinishOf(): (a: OnFinishArgs) => unknown {
  const agent = createVerifyAgent();
  return agent.lifecycles?.onFinish as unknown as (a: OnFinishArgs) => unknown;
}

/** A final-answer turn (no tool calls) carrying assistant text. */
function textTurn(text: string) {
  return {
    toolCalls: [],
    output: [{ type: "text", role: "assistant", content: text }],
  };
}

/** A tool-call turn (the model kept searching — never a final answer). */
function toolTurn() {
  return { toolCalls: [{ type: "tool_call" }], output: [] };
}

function net(research: Finding[]): { state: { data: Partial<NetworkState> } } {
  return { state: { data: { research } } };
}

function finding(i: number, verified = true): Finding {
  return {
    claim: `claim ${i}`,
    source: { title: `Source ${i}`, url: `https://example.com/${i}` },
    verified,
  };
}

const RESEARCH = [finding(1), finding(2), finding(3)];

describe("verify onFinish — parseable output advances the gate", () => {
  it("sets verifiedFindings + de-duplicated sources from a JSON final-answer turn", () => {
    const onFinish = onFinishOf();
    const n = net(RESEARCH);
    onFinish({
      network: n,
      result: textTurn(
        JSON.stringify({
          verifiedFindings: [
            {
              claim: "corroborated claim",
              source: { title: "Reuters", url: "https://reuters.com/x" },
              verified: true,
            },
          ],
        }),
      ),
    });

    expect(n.state.data.verifiedFindings).toHaveLength(1);
    expect(n.state.data.verifiedFindings?.[0].verified).toBe(true);
    expect(n.state.data.sources).toEqual([
      { title: "Reuters", url: "https://reuters.com/x" },
    ]);
    // The router now advances past verify.
    expect(selectNextAgentId(n.state.data)).toBe("write");
  });

  it("accepts a well-formed EMPTY result (all claims dropped) and advances", () => {
    const onFinish = onFinishOf();
    const n = net(RESEARCH);
    onFinish({ network: n, result: textTurn('{ "verifiedFindings": [] }') });

    expect(n.state.data.verifiedFindings).toEqual([]);
    expect(selectNextAgentId(n.state.data)).toBe("write");
  });
});

describe("verify onFinish — graceful degradation (R-0025)", () => {
  it("does NOT degrade while still under the turn budget", () => {
    const onFinish = onFinishOf();
    const n = net(RESEARCH);
    // Five prose turns — the model keeps failing the JSON contract.
    for (let i = 0; i < 5; i++) {
      onFinish({ network: n, result: textTurn("I reviewed the claims; looks fine.") });
    }
    // Under budget: the gate is still open so the router re-selects verify.
    expect(n.state.data.verifiedFindings).toBeUndefined();
    expect(selectNextAgentId(n.state.data)).toBe("verify");
  });

  it("degrades to research passthrough (verified:false) once the budget is spent — prose turns", () => {
    const onFinish = onFinishOf();
    const n = net(RESEARCH);
    for (let i = 0; i < 6; i++) {
      onFinish({ network: n, result: textTurn("still no valid json here") });
    }
    expect(n.state.data.verifiedFindings).toHaveLength(RESEARCH.length);
    expect(n.state.data.verifiedFindings?.every((f) => f.verified === false)).toBe(true);
    expect(n.state.data.sources).toHaveLength(RESEARCH.length);
    // Crucially: the run now advances past the verify gate instead of stalling.
    expect(selectNextAgentId(n.state.data)).toBe("write");
  });

  it("degrades even when the model NEVER stops calling tools (no final answer)", () => {
    const onFinish = onFinishOf();
    const n = net(RESEARCH);
    for (let i = 0; i < 6; i++) {
      onFinish({ network: n, result: toolTurn() });
    }
    expect(n.state.data.verifiedFindings).toHaveLength(RESEARCH.length);
    expect(n.state.data.verifiedFindings?.every((f) => f.verified === false)).toBe(true);
    expect(selectNextAgentId(n.state.data)).toBe("write");
  });

  it("caps degraded passthrough at MAX_VERIFIED", () => {
    const many = Array.from({ length: MAX_VERIFIED + 5 }, (_, i) => finding(i));
    const onFinish = onFinishOf();
    const n = net(many);
    for (let i = 0; i < 6; i++) {
      onFinish({ network: n, result: textTurn("no json") });
    }
    expect(n.state.data.verifiedFindings).toHaveLength(MAX_VERIFIED);
  });

  it("degrades to an empty (but defined) result when there was no research either", () => {
    const onFinish = onFinishOf();
    const n = net([]);
    for (let i = 0; i < 6; i++) {
      onFinish({ network: n, result: textTurn("no json") });
    }
    // verifiedFindings is now defined ([]), so the router leaves the verify gate.
    expect(n.state.data.verifiedFindings).toEqual([]);
    expect(selectNextAgentId(n.state.data)).toBe("write");
  });
});
