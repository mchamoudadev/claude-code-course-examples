/**
 * Hallucinated-tool-call guard (R-0030 regression).
 *
 * A weak model sometimes emits a `tool_call` for a tool the agent doesn't
 * expose (observed: `run`). AgentKit's `invokeTools` throws on an unknown tool,
 * which crashes the whole network run. `stripUnknownToolCalls` (wired as every
 * agent's `onResponse`) drops only the unknown entries, leaving valid tool calls
 * and text intact so the turn can still proceed.
 */

import { describe, expect, it } from "vitest";
import { stripUnknownToolCalls } from "@/agents/shared";
import type { AgentResult } from "@inngest/agent-kit";

/** An agent stub exposing only `tools.has` (all the guard needs). */
function agentWith(names: string[]) {
  return { tools: { has: (n: string) => names.includes(n) } };
}

function toolCallMsg(names: string[]) {
  return {
    type: "tool_call",
    role: "assistant",
    stop_reason: "tool",
    tools: names.map((name, i) => ({ type: "tool", id: `id-${i}`, name, input: {} })),
  };
}

function textMsg(content: string) {
  return { type: "text", role: "assistant", content };
}

function resultWith(output: unknown[]): AgentResult {
  return { output } as unknown as AgentResult;
}

/** Read the tool names off a tool_call message in the result output. */
function toolNames(result: AgentResult, index: number): string[] {
  const msg = (result.output as unknown[])[index] as { tools: { name: string }[] };
  return msg.tools.map((t) => t.name);
}

describe("stripUnknownToolCalls", () => {
  it("drops an unknown tool call but keeps the known ones", () => {
    const r = resultWith([toolCallMsg(["web_search", "run"])]);
    stripUnknownToolCalls(agentWith(["web_search", "fetch_url"]), r);
    expect(toolNames(r, 0)).toEqual(["web_search"]);
  });

  it("leaves the message untouched when every tool is known", () => {
    const msg = toolCallMsg(["web_search", "fetch_url"]);
    const r = resultWith([msg]);
    stripUnknownToolCalls(agentWith(["web_search", "fetch_url"]), r);
    // Same tools, all preserved.
    expect(toolNames(r, 0)).toEqual(["web_search", "fetch_url"]);
  });

  it("empties the tools array when ONLY a bogus tool was called (turn becomes tool-less)", () => {
    const r = resultWith([toolCallMsg(["run"])]);
    stripUnknownToolCalls(agentWith(["web_search"]), r);
    expect(toolNames(r, 0)).toEqual([]);
  });

  it("ignores non-tool_call messages and filters tool_call messages in place", () => {
    const r = resultWith([textMsg("hello"), toolCallMsg(["run", "save_post"])]);
    stripUnknownToolCalls(agentWith(["save_post"]), r);
    expect((r.output as unknown[])[0]).toEqual({
      type: "text",
      role: "assistant",
      content: "hello",
    });
    expect(toolNames(r, 1)).toEqual(["save_post"]);
  });

  it("returns the same result object it was given", () => {
    const r = resultWith([toolCallMsg(["run"])]);
    expect(stripUnknownToolCalls(agentWith([]), r)).toBe(r);
  });
});
