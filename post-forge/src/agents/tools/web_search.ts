/**
 * `web_search` tool — Google web search via Serper.dev.
 *
 * Used by the Research agent (find sources for a topic) and the Verify agent
 * (re-check a claim). Posts to Serper's `/search` endpoint and normalizes the
 * `organic[]` results to a compact `{ title, url, snippet }[]` shape (note that
 * Serper names the link field `link`, which we map to `url`).
 *
 * Failure policy: a missing `SERPER_API_KEY` or a non-2xx response throws a
 * clearly-named error (not a silent empty result) so T05's retry/failure logic
 * is predictable.
 *
 * Docs verified 2026-07-05: Serper Google Search API — `POST
 * https://google.serper.dev/search`, header `X-API-KEY`, body `{ q }`, response
 * `organic[]` items carry `title` / `link` / `snippet` / `position`.
 */

import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { requireEnv } from "@/lib/env";
import { safeHttpUrl } from "@/lib/safe-url";

/** Serper Google search endpoint. */
const SERPER_SEARCH_URL = "https://google.serper.dev/search";
/** Maximum organic results returned to the agent. */
const MAX_RESULTS = 8;
/** Abort the Serper request after this long. */
const REQUEST_TIMEOUT_MS = 10_000;

/** A single normalized search result. */
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

/** Loosely-typed shape of a Serper organic result (fields validated at runtime). */
interface SerperOrganicItem {
  title?: unknown;
  link?: unknown;
  snippet?: unknown;
}

export const webSearchTool = createTool({
  name: "web_search",
  description:
    "Search the web with Google (via Serper). Returns the top organic results " +
    "as { title, url, snippet } objects. Use it to find sources for a topic or " +
    "to fact-check a specific claim.",
  parameters: z.object({
    query: z
      .string()
      .describe("The search query, e.g. 'World Cup 2026 host cities'."),
  }),
  handler: async ({ query }): Promise<WebSearchResult[]> => {
    // Throws MissingEnvError("SERPER_API_KEY is not set") when unset — surfaced,
    // not swallowed, so the caller sees a clear configuration failure.
    const apiKey = requireEnv("SERPER_API_KEY");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(SERPER_SEARCH_URL, {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query }),
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error(
        `web_search: request to Serper failed: ${errorMessage(err)}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `web_search: Serper returned HTTP ${res.status}` +
          (body ? `: ${body.slice(0, 300)}` : ""),
      );
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch (err) {
      throw new Error(
        `web_search: Serper returned a non-JSON response: ${errorMessage(err)}`,
      );
    }

    const organic =
      isRecord(json) && Array.isArray(json.organic)
        ? (json.organic as SerperOrganicItem[])
        : [];

    return organic
      .map((item) => ({
        title: typeof item.title === "string" ? item.title : "",
        // Only http(s) links survive ingestion — drops javascript:/data:/etc.
        // at the boundary so unsafe URLs never reach persistence or the UI.
        url: safeHttpUrl(item.link),
        snippet: typeof item.snippet === "string" ? item.snippet : "",
      }))
      .filter((r): r is WebSearchResult => r.url !== null)
      .slice(0, MAX_RESULTS);
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
