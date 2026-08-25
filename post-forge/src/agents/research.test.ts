/**
 * Research-agent coverage + retry (R-0028 regression).
 *
 * The research agent must gather 7–10 distinct sourced findings, but a weak
 * model tends to stop at ~3. These tests pin the stall-safe retry contract:
 *   1. A final answer with ≥ RESEARCH_MIN_FINDINGS advances immediately.
 *   2. A short answer does NOT advance — findings ACCUMULATE (deduped by claim)
 *      and the agent re-routes for another pass.
 *   3. Accumulation across attempts reaches the target and then advances.
 *   4. Once the attempt budget is spent it advances with the best set gathered
 *      (never loops to maxIter — the mistake that killed the verify gate).
 *   5. A run that finds NOTHING even after the budget stays unset (fails clean,
 *      rather than writing an unsourced post).
 *
 * We drive `onFinish` directly with mock turns; no model / network call is made.
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  RESEARCH_MAX_ATTEMPTS,
  RESEARCH_MIN_FINDINGS,
  createResearchAgent,
} from "@/agents/research";
import { selectNextAgentId } from "@/agents/network";
import { MAX_FINDINGS } from "@/agents/shared";
import type { NetworkState } from "@/lib/state";

beforeAll(() => {
  process.env.OPENROUTER_API_KEY ??= "test-key";
});

type OnFinishArgs = {
  network: { state: { data: Partial<NetworkState> } };
  result: { toolCalls: unknown[]; output: unknown[] };
};
function onFinishOf(): (a: OnFinishArgs) => unknown {
  const agent = createResearchAgent();
  return agent.lifecycles?.onFinish as unknown as (a: OnFinishArgs) => unknown;
}

/** A final-answer turn carrying a findings-JSON payload for `n` distinct claims. */
function findingsTurn(claims: Array<{ claim: string; url: string }>) {
  return {
    toolCalls: [],
    output: [
      {
        type: "text",
        role: "assistant",
        content: JSON.stringify({
          findings: claims.map((c) => ({
            claim: c.claim,
            source: { title: c.claim, url: c.url },
          })),
        }),
      },
    ],
  };
}

/** A tool-call turn (still gathering evidence — not a final answer). */
function toolTurn() {
  return { toolCalls: [{ type: "tool_call" }], output: [] };
}

function emptyNet(): { state: { data: Partial<NetworkState> } } {
  return { state: { data: {} } };
}

/** `n` distinct findings numbered `[from, from+n)`. */
function claims(n: number, from = 0): Array<{ claim: string; url: string }> {
  return Array.from({ length: n }, (_, i) => ({
    claim: `claim ${from + i}`,
    url: `https://example.com/${from + i}`,
  }));
}

describe("research onFinish — advances only with enough findings", () => {
  it("sets research immediately when the first answer already has the minimum", () => {
    const onFinish = onFinishOf();
    const n = emptyNet();
    onFinish({ network: n, result: findingsTurn(claims(RESEARCH_MIN_FINDINGS)) });

    expect(n.state.data.research).toHaveLength(RESEARCH_MIN_FINDINGS);
    expect(selectNextAgentId(n.state.data)).toBe("verify");
  });

  it("does NOT advance on a short first answer — it re-routes for more", () => {
    const onFinish = onFinishOf();
    const n = emptyNet();
    onFinish({ network: n, result: findingsTurn(claims(3)) });

    expect(n.state.data.research).toBeUndefined();
    expect(selectNextAgentId(n.state.data)).toBe("research");
  });

  it("does not count tool turns as attempts", () => {
    const onFinish = onFinishOf();
    const n = emptyNet();
    // Many tool turns then a short answer: still attempt #1, so still retrying.
    for (let i = 0; i < 5; i++) onFinish({ network: n, result: toolTurn() });
    onFinish({ network: n, result: findingsTurn(claims(3)) });
    expect(n.state.data.research).toBeUndefined();
  });
});

describe("research onFinish — accumulation across attempts (R-0028)", () => {
  it("merges distinct findings across passes and advances once the target is met", () => {
    const onFinish = onFinishOf();
    const n = emptyNet();

    // Pass 1: 4 findings — short, keep going.
    onFinish({ network: n, result: findingsTurn(claims(4, 0)) });
    expect(n.state.data.research).toBeUndefined();

    // Pass 2: 4 NEW findings → merged 8 ≥ min → advance.
    onFinish({ network: n, result: findingsTurn(claims(4, 4)) });
    expect(n.state.data.research).toHaveLength(8);
    expect(selectNextAgentId(n.state.data)).toBe("verify");
  });

  it("dedupes repeated claims across passes (no double-counting)", () => {
    const onFinish = onFinishOf();
    const n = emptyNet();

    onFinish({ network: n, result: findingsTurn(claims(4, 0)) });
    // Same 4 claims again → no growth, still short, still retrying.
    onFinish({ network: n, result: findingsTurn(claims(4, 0)) });
    expect(n.state.data.research).toBeUndefined();

    // A single genuinely-new batch pushes it over — but only distinct ones count.
    onFinish({ network: n, result: findingsTurn(claims(5, 4)) }); // attempt #3
    // Attempt budget is 3 → advances with the best set (4 + 5 = 9 distinct).
    expect(n.state.data.research).toHaveLength(9);
  });

  it("advances with the best set once the attempt budget is spent, even if short", () => {
    const onFinish = onFinishOf();
    const n = emptyNet();
    // Every attempt returns the same 3 findings — never reaches the minimum.
    for (let i = 0; i < RESEARCH_MAX_ATTEMPTS; i++) {
      onFinish({ network: n, result: findingsTurn(claims(3)) });
    }
    expect(n.state.data.research).toHaveLength(3); // accepted, no stall
    expect(selectNextAgentId(n.state.data)).toBe("verify");
  });

  it("caps accumulated findings at MAX_FINDINGS", () => {
    const onFinish = onFinishOf();
    const n = emptyNet();
    onFinish({ network: n, result: findingsTurn(claims(MAX_FINDINGS + 6)) });
    expect(n.state.data.research).toHaveLength(MAX_FINDINGS);
  });

  it("stays unset when NOTHING is found even after the budget (fails clean)", () => {
    const onFinish = onFinishOf();
    const n = emptyNet();
    for (let i = 0; i < RESEARCH_MAX_ATTEMPTS; i++) {
      onFinish({ network: n, result: findingsTurn([]) });
    }
    expect(n.state.data.research).toBeUndefined();
    expect(selectNextAgentId(n.state.data)).toBe("research");
  });
});
