/**
 * Router determinism — the correctness crux of PostForge (T04 → T18).
 *
 * `selectNextAgentId` is a PURE function of `network.state.data`: it walks the
 * fixed ladder Research → Verify → Write → Edit → Illustrate → Publish, always
 * returning the FIRST unmet stage, and `null` (which the network router
 * normalizes to `undefined`, ending the run) ONLY once `published` is set. These
 * tests pin that contract exhaustively so no future edit can let an agent run
 * out of order or fail to terminate.
 *
 * No env / model / network is touched — importing the module is side-effect-free
 * and we never build the live network (that would need OpenRouter keys).
 */

import { describe, expect, it } from "vitest";
import {
  AGENT_NAMES,
  selectNextAgentId,
  type RouterAgentId,
} from "@/agents/network";
import type { Finding, NetworkState } from "@/lib/state";

/** The six gating keys, in the exact order the router inspects them. */
const GATES = [
  "research",
  "verifiedFindings",
  "draft",
  "finalPost",
  "posterImageId",
  "published",
] as const;

/** The agent each gate selects when that gate is the first unmet one. */
const GATE_AGENT: Record<(typeof GATES)[number], RouterAgentId> = {
  research: "research",
  verifiedFindings: "verify",
  draft: "write",
  finalPost: "edit",
  posterImageId: "illustrate",
  published: "publish",
};

const FINDING: Finding = {
  claim: "c",
  source: { title: "t", url: "https://example.com" },
  verified: false,
};

/** A truthy, correctly-typed value for a given state gate. */
function presentValue(gate: (typeof GATES)[number]): unknown {
  switch (gate) {
    case "research":
      return [FINDING];
    case "verifiedFindings":
      return [{ ...FINDING, verified: true }];
    case "draft":
      return "draft body";
    case "finalPost":
      return "final body";
    case "posterImageId":
      return "poster-123";
    case "published":
      return true;
  }
}

/** Build a partial state from a 6-bit presence mask (bit b ⇒ GATES[b] present). */
function stateFromMask(mask: number): Partial<NetworkState> {
  const state: Record<string, unknown> = {};
  for (let b = 0; b < GATES.length; b++) {
    if (mask & (1 << b)) state[GATES[b]] = presentValue(GATES[b]);
  }
  return state as Partial<NetworkState>;
}

describe("selectNextAgentId — deterministic router", () => {
  it("returns 'research' for empty / seed-only state", () => {
    expect(selectNextAgentId({})).toBe("research");
    expect(selectNextAgentId({ topic: "x", runId: "r", options: {} })).toBe(
      "research",
    );
  });

  it("walks the ladder one rung at a time as each stage completes", () => {
    const s: Partial<NetworkState> = {};
    expect(selectNextAgentId(s)).toBe("research");

    s.research = [FINDING];
    expect(selectNextAgentId(s)).toBe("verify");

    s.verifiedFindings = [{ ...FINDING, verified: true }];
    expect(selectNextAgentId(s)).toBe("write");

    s.draft = "draft";
    expect(selectNextAgentId(s)).toBe("edit");

    s.finalPost = "final";
    expect(selectNextAgentId(s)).toBe("illustrate");

    s.posterImageId = "poster-1";
    expect(selectNextAgentId(s)).toBe("publish");

    s.published = true;
    expect(selectNextAgentId(s)).toBeNull();
  });

  it("for EVERY partial-state permutation, selects the first unmet stage (never out of order)", () => {
    for (let mask = 0; mask < 1 << GATES.length; mask++) {
      const state = stateFromMask(mask);

      // Expected next agent = the first gate whose bit is unset.
      let firstUnset = -1;
      for (let b = 0; b < GATES.length; b++) {
        if (!(mask & (1 << b))) {
          firstUnset = b;
          break;
        }
      }
      const expected =
        firstUnset === -1 ? null : GATE_AGENT[GATES[firstUnset]];

      expect(selectNextAgentId(state)).toBe(expected);
    }
  });

  it("returns null (→ router undefined) ONLY when published is set", () => {
    for (let mask = 0; mask < 1 << GATES.length; mask++) {
      const state = stateFromMask(mask);
      const result = selectNextAgentId(state);
      if (result === null) {
        // Terminating implies published — and in fact ALL gates satisfied.
        expect(state.published).toBe(true);
        expect(mask).toBe((1 << GATES.length) - 1);
      }
    }
    // Conversely, an unpublished state (even with everything else present)
    // never terminates — it routes to 'publish'.
    expect(
      selectNextAgentId({
        research: [FINDING],
        verifiedFindings: [FINDING],
        draft: "d",
        finalPost: "f",
        posterImageId: "p",
        // published intentionally omitted
      }),
    ).toBe("publish");
  });

  it("a published state that is otherwise incomplete still routes to the earlier gap", () => {
    // published=true but posterImageId missing ⇒ illustrate wins (order matters).
    expect(
      selectNextAgentId({
        research: [FINDING],
        verifiedFindings: [FINDING],
        draft: "d",
        finalPost: "f",
        published: true,
      }),
    ).toBe("illustrate");
  });

  it("AGENT_NAMES is the canonical pipeline order", () => {
    expect([...AGENT_NAMES]).toEqual([
      "research",
      "verify",
      "write",
      "edit",
      "illustrate",
      "publish",
    ]);
  });
});

describe("router-driven happy path — generate → done", () => {
  it("reaches 'done' after exactly the six agents, in order, then terminates", () => {
    const state: Partial<NetworkState> = {};
    const order: RouterAgentId[] = [];

    for (let i = 0; i < 20; i++) {
      const next = selectNextAgentId(state);
      if (next === null) break;
      order.push(next);
      // Apply each agent's canonical state write.
      switch (next) {
        case "research":
          state.research = [FINDING];
          break;
        case "verify":
          state.verifiedFindings = [{ ...FINDING, verified: true }];
          break;
        case "write":
          state.draft = "draft body";
          break;
        case "edit":
          state.finalPost = "final body";
          state.title = "Title";
          break;
        case "illustrate":
          state.posterImageId = "poster-abc";
          break;
        case "publish":
          state.published = true;
          state.postId = "post-1";
          break;
      }
    }

    expect(order).toEqual([
      "research",
      "verify",
      "write",
      "edit",
      "illustrate",
      "publish",
    ]);
    // Terminal: no further agent, and the run is marked published/complete.
    expect(selectNextAgentId(state)).toBeNull();
    expect(state.published).toBe(true);
  });
});
