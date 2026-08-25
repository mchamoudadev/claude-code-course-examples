/**
 * web_search tool (T03 → T18): Serper is fully mocked (no key, no network).
 * Covers organic→{title,url,snippet} normalization (link→url, empty-url drop,
 * MAX_RESULTS cap) and the failure paths (missing key, non-2xx, transport error).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { webSearchTool, type WebSearchResult } from "@/agents/tools/web_search";
import type { Tool } from "@inngest/agent-kit";
import type { NetworkState } from "@/lib/state";

/** The tool handler ignores its opts here; a bare cast keeps types honest. */
const opts = {} as unknown as Tool.Options<NetworkState>;

function run(query: string): Promise<WebSearchResult[]> {
  return webSearchTool.handler({ query }, opts) as Promise<WebSearchResult[]>;
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("web_search — normalization", () => {
  it("maps Serper organic results to { title, url, snippet } (link→url)", async () => {
    vi.stubEnv("SERPER_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        organic: [
          { title: "First", link: "https://a.example", snippet: "s1", position: 1 },
          { title: "Second", link: "https://b.example", snippet: "s2" },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const results = await run("world cup 2026");

    expect(results).toEqual([
      { title: "First", url: "https://a.example", snippet: "s1" },
      { title: "Second", url: "https://b.example", snippet: "s2" },
    ]);

    // Correct endpoint + auth header + query body.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, reqInit] = fetchMock.mock.calls[0];
    expect(url).toBe("https://google.serper.dev/search");
    expect(reqInit.method).toBe("POST");
    expect(reqInit.headers["X-API-KEY"]).toBe("test-key");
    expect(JSON.parse(reqInit.body)).toEqual({ q: "world cup 2026" });
  });

  it("drops results with no link and caps at MAX_RESULTS (8)", async () => {
    vi.stubEnv("SERPER_API_KEY", "test-key");
    const organic = [
      { title: "no link", snippet: "x" }, // dropped (missing url)
      { title: "blank link", link: "", snippet: "y" }, // dropped (empty url)
      ...Array.from({ length: 12 }, (_, i) => ({
        title: `t${i}`,
        link: `https://example.com/${i}`,
        snippet: `s${i}`,
      })),
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ organic })));

    const results = await run("q");
    expect(results).toHaveLength(8);
    expect(results.every((r) => r.url !== "")).toBe(true);
    expect(results[0]).toEqual({
      title: "t0",
      url: "https://example.com/0",
      snippet: "s0",
    });
  });

  it("coerces missing title/snippet fields to empty strings", async () => {
    vi.stubEnv("SERPER_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ organic: [{ link: "https://only-link.example" }] }),
      ),
    );
    const results = await run("q");
    expect(results).toEqual([
      { title: "", url: "https://only-link.example", snippet: "" },
    ]);
  });

  it("returns [] when the response has no organic array", async () => {
    vi.stubEnv("SERPER_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({})));
    expect(await run("q")).toEqual([]);
  });
});

describe("web_search — failure paths", () => {
  it("throws a named MissingEnvError when SERPER_API_KEY is absent (no fetch)", async () => {
    vi.stubEnv("SERPER_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(run("q")).rejects.toThrow(/SERPER_API_KEY is not set/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws with the HTTP status + body on a non-2xx Serper response", async () => {
    vi.stubEnv("SERPER_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("rate limited", { status: 429 }),
      ),
    );
    await expect(run("q")).rejects.toThrow(/Serper returned HTTP 429/);
  });

  it("wraps a transport-level failure", async () => {
    vi.stubEnv("SERPER_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNRESET")),
    );
    await expect(run("q")).rejects.toThrow(/request to Serper failed: ECONNRESET/);
  });
});
