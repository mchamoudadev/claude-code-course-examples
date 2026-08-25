/**
 * `safeHttpUrl` — allowlist a URL down to safe HTTP(S) links only.
 *
 * Source URLs enter the system from untrusted places (Serper search results and
 * the LLM via `save_post`) and are rendered straight into anchor `href`s. React
 * does NOT sanitize `href`, so a value like `javascript:alert(1)` becomes a live
 * XSS vector when clicked. This helper is the single gate: it returns the URL
 * string ONLY when it parses and its protocol is exactly `http:` or `https:`,
 * and `null` for everything else (`javascript:`, `data:`, `vbscript:`, `file:`,
 * blanks, non-strings, malformed input).
 *
 * Pure and dependency-free — no server-only imports — so it is safe to call from
 * client components as well as the server-side ingestion boundaries.
 */
export function safeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  return trimmed;
}
