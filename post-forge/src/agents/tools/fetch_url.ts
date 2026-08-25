/**
 * `fetch_url` tool — fetch a page and return its readable text.
 *
 * Used by the Research agent to pull the body of a source it found via
 * `web_search`. Behaviour:
 *   1. SSRF guard — allow only http/https; refuse loopback, private, link-local,
 *      CGNAT, multicast and other non-public hosts (both literal IPs and
 *      hostnames that DNS-resolve to such addresses). This blocks the cloud
 *      metadata endpoint 169.254.169.254, 127.0.0.1, 10./172.16-31./192.168.,
 *      localhost, and IPv6 loopback/ULA/link-local.
 *   2. Fetch with an ~8s timeout and a byte cap.
 *   3. If HTML, extract readable text via @mozilla/readability + jsdom and
 *      truncate to ~12k chars.
 *
 * Degrade-gracefully policy: an SSRF-blocked host, a non-HTML body, an oversized
 * page, or an unreachable/timed-out request all return a short structured
 * `{ ok:false, note }` object rather than throwing — so the agent gets a usable
 * signal and simply moves on to the next source.
 *
 * Docs verified 2026-07-05: @mozilla/readability@0.6 — `new
 * Readability(document).parse()?.textContent`; jsdom@29 — `new JSDOM(html, {
 * url })` (scripts + external resources are NOT executed/loaded by default).
 */

import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import net from "node:net";
import { lookup } from "node:dns/promises";

/** Abort the page fetch after this long. */
const FETCH_TIMEOUT_MS = 8_000;
/** Hard cap on downloaded bytes (protects memory + the readability parse). */
const MAX_BYTES = 2_000_000;
/** Max characters of readable text returned to the agent. */
const MAX_TEXT_CHARS = 12_000;
/** Max redirect hops to follow (each re-checked by the SSRF guard). */
const MAX_REDIRECTS = 5;

/** Result of a `fetch_url` call. `ok:false` carries a `note` explaining why. */
export interface FetchUrlResult {
  url: string;
  ok: boolean;
  /** Article/site title, when extracted. */
  title?: string;
  /** Readable text (truncated to {@link MAX_TEXT_CHARS}). */
  text?: string;
  /** True when `text` was cut at the char cap. */
  truncated?: boolean;
  /** Response content-type, when known. */
  contentType?: string;
  /** True when the SSRF guard refused the request. */
  blocked?: boolean;
  /** Short human-readable note on any non-success / degraded path. */
  note?: string;
}

export const fetchUrlTool = createTool({
  name: "fetch_url",
  description:
    "Fetch a public web page (http/https) and return its readable text content, " +
    "with the title. Private/loopback hosts are refused. Non-HTML, oversized, or " +
    "unreachable pages return a short note instead of text.",
  parameters: z.object({
    // NOTE: plain string, NOT `.url()`. Zod's `.url()` serializes to JSON Schema
    // `format: "uri"`, which OpenAI's STRICT function-calling (gpt-5.x) rejects
    // ("'uri' is not a valid format" → 400 "Provider returned error"); Gemini
    // ignores it. The URL is fully validated at runtime by `ssrfCheck` below
    // (malformed → blocked, non-http(s) → blocked), so the schema constraint is
    // redundant. Keeping it plain makes the tool work across every model. (R-0031)
    url: z.string().describe("Absolute http(s) URL of the page to fetch."),
  }),
  handler: async ({ url }): Promise<FetchUrlResult> => {
    // 1. SSRF guard.
    const guard = await ssrfCheck(url);
    if (guard.blocked) {
      return {
        url,
        ok: false,
        blocked: true,
        note: `Refused to fetch: blocked by SSRF guard (${guard.reason}).`,
      };
    }

    // 2. Fetch with timeout, re-validating EVERY redirect hop against the SSRF
    //    guard. `redirect: "follow"` would let a public page 302 us to an
    //    internal target (169.254.169.254, 127.0.0.1:27017, …) that the initial
    //    guard never saw — so we follow manually and re-check each Location
    //    before connecting to it. One controller/timeout covers the whole chain.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      let currentUrl = url;
      let hops = 0;
      for (;;) {
        res = await fetch(currentUrl, {
          // Manual: a 3xx is returned to us (undici surfaces the real status +
          // Location server-side) instead of being auto-followed.
          redirect: "manual",
          signal: controller.signal,
          headers: {
            // A UA + accept header improves the odds of getting real HTML back.
            "User-Agent":
              "Mozilla/5.0 (compatible; PostForgeBot/1.0; +https://postforge.local)",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });

        // Non-redirect (or a 3xx without a usable Location) → final response.
        const location = isRedirectStatus(res.status)
          ? res.headers.get("location")
          : null;
        if (!location) break;

        // Resolve a possibly-relative Location against the current URL.
        let nextUrl: string;
        try {
          nextUrl = new URL(location, currentUrl).toString();
        } catch {
          // Unparseable Location — stop and treat the 3xx as the final response.
          break;
        }

        if (++hops > MAX_REDIRECTS) {
          await res.body?.cancel().catch(() => {});
          return {
            url,
            ok: false,
            note: `Too many redirects (>${MAX_REDIRECTS}).`,
          };
        }

        // Re-run the SSRF guard on the hop target BEFORE following it.
        const hopGuard = await ssrfCheck(nextUrl);
        if (hopGuard.blocked) {
          await res.body?.cancel().catch(() => {});
          return {
            url,
            ok: false,
            blocked: true,
            note: `Refused to fetch: blocked by SSRF guard on redirect to ${nextUrl} (${hopGuard.reason}).`,
          };
        }

        // Release the redirect response body before following the hop.
        await res.body?.cancel().catch(() => {});
        currentUrl = nextUrl;
      }
    } catch (err) {
      return {
        url,
        ok: false,
        note: `Fetch failed or timed out: ${errorMessage(err)}.`,
      };
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      return { url, ok: false, note: `Fetch returned HTTP ${res.status}.` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    const isHtml =
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml+xml") ||
      // Some servers omit content-type; fall through and try to parse.
      contentType === "";
    if (!isHtml) {
      // Drain/close the body so the socket is released.
      await res.body?.cancel().catch(() => {});
      return {
        url,
        ok: false,
        contentType,
        note: `Skipped non-HTML content (${contentType}).`,
      };
    }

    // 3. Read bytes with a hard cap.
    let read: { buf: Buffer; truncated: boolean };
    try {
      read = await readCapped(res, MAX_BYTES);
    } catch (err) {
      return { url, ok: false, note: `Failed to read body: ${errorMessage(err)}.` };
    }
    if (read.buf.length === 0) {
      return { url, ok: false, contentType, note: "Empty response body." };
    }

    // 4. Extract readable text via readability + jsdom.
    let title: string | undefined;
    let text = "";
    try {
      const html = read.buf.toString("utf8");
      const dom = new JSDOM(html, { url });
      const article = new Readability(dom.window.document).parse();
      title = article?.title?.trim() || dom.window.document.title?.trim() || undefined;
      text =
        (article?.textContent ??
          dom.window.document.body?.textContent ??
          "").replace(/\s+/g, " ").trim();
      // Free the DOM.
      dom.window.close();
    } catch (err) {
      return {
        url,
        ok: false,
        contentType,
        note: `Failed to parse HTML: ${errorMessage(err)}.`,
      };
    }

    if (text === "") {
      return {
        url,
        ok: false,
        contentType,
        title,
        note: "No readable text could be extracted.",
      };
    }

    const truncated = read.truncated || text.length > MAX_TEXT_CHARS;
    return {
      url,
      ok: true,
      title,
      text: text.slice(0, MAX_TEXT_CHARS),
      truncated,
      contentType,
    };
  },
});

/* --------------------------------------------------------------------------- */
/* SSRF guard                                                                  */
/* --------------------------------------------------------------------------- */

interface GuardResult {
  blocked: boolean;
  reason?: string;
}

/**
 * Refuse non-public request targets. Checks protocol, then the literal IP (v4 or
 * v6) or hostname, then — for hostnames — resolves DNS and rejects if ANY
 * resolved address is non-public. A DNS-resolution failure is treated as
 * "not blocked here" and left for the fetch step to surface as unreachable.
 */
async function ssrfCheck(raw: string): Promise<GuardResult> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { blocked: true, reason: "malformed URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { blocked: true, reason: `unsupported protocol ${parsed.protocol}` };
  }

  // URL.hostname keeps brackets around IPv6 literals — strip them.
  const host = parsed.hostname.replace(/^\[|\]$/g, "");

  const ipVersion = net.isIP(host);
  if (ipVersion === 4) {
    return isBlockedIPv4(host)
      ? { blocked: true, reason: `non-public IPv4 ${host}` }
      : { blocked: false };
  }
  if (ipVersion === 6) {
    return isBlockedIPv6(host)
      ? { blocked: true, reason: `non-public IPv6 ${host}` }
      : { blocked: false };
  }

  // Hostname (not a literal IP).
  if (isBlockedHostname(host)) {
    return { blocked: true, reason: `blocked hostname ${host}` };
  }

  // Resolve and reject if any address is non-public.
  // TODO(SSRF): DNS-rebinding residual — we validate the resolved address(es)
  // here, but `fetch` re-resolves the hostname independently at connect time, so
  // a rebinding server could return a public IP now and a private one to fetch
  // (TOCTOU). Fully closing this needs pinning the vetted IP for the connection
  // (undici Agent/dispatcher with a custom `lookup`, keeping the Host header).
  // Deferred: `undici` is not a direct dependency and `dispatcher` is a
  // non-standard fetch option, so wiring it risks breaking normal fetches —
  // which the task prioritizes over this residual. See result notes.
  try {
    const addresses = await lookup(host, { all: true });
    for (const addr of addresses) {
      const blocked =
        addr.family === 6
          ? isBlockedIPv6(addr.address)
          : isBlockedIPv4(addr.address);
      if (blocked) {
        return {
          blocked: true,
          reason: `${host} resolves to non-public address ${addr.address}`,
        };
      }
    }
  } catch {
    // DNS failure: not an SSRF block — let fetch report it as unreachable.
    return { blocked: false };
  }

  return { blocked: false };
}

/** True if an IPv4 address is loopback / private / link-local / reserved. */
function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (
    parts.length !== 4 ||
    parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)
  ) {
    return true; // malformed → refuse
  }
  const [a, b] = parts;
  if (a === 0) return true; //           0.0.0.0/8        "this" network
  if (a === 10) return true; //          10.0.0.0/8       private
  if (a === 127) return true; //         127.0.0.0/8      loopback
  if (a === 169 && b === 254) return true; // 169.254/16  link-local (+ metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true; //           224.0.0.0/3     multicast + reserved
  return false;
}

/**
 * True if an IPv6 address is loopback / unspecified / ULA / link-local, OR an
 * IPv4-mapped/-compatible/NAT64 form that embeds a blocked IPv4 address.
 *
 * The literal is fully expanded first, so BOTH the dotted form (`::ffff:127.0.0.1`)
 * AND the hex form (`::ffff:7f00:1`, `::ffff:a9fe:a9fe` = the metadata IP) are
 * caught — the previous dotted-only regex let the hex form slip straight through.
 */
function isBlockedIPv6(ip: string): boolean {
  const h = expandIPv6(ip);
  if (!h) return true; // unparseable → refuse

  // ::/128 unspecified and ::1/128 loopback.
  if (h.every((x) => x === 0)) return true;
  if (h[0] === 0 && h[1] === 0 && h[2] === 0 && h[3] === 0 &&
      h[4] === 0 && h[5] === 0 && h[6] === 0 && h[7] === 1) return true;

  // Low 32 bits as dotted IPv4 (only meaningful for the embedded-v4 prefixes).
  const embeddedV4 = () =>
    `${h[6] >> 8}.${h[6] & 0xff}.${h[7] >> 8}.${h[7] & 0xff}`;
  const topFiveZero =
    h[0] === 0 && h[1] === 0 && h[2] === 0 && h[3] === 0 && h[4] === 0;

  // ::ffff:0:0/96 — IPv4-mapped. Block the whole prefix (covers hex + dotted
  // loopback/metadata forms); a v4-mapped literal is never a legit public page.
  if (topFiveZero && h[5] === 0xffff) return true;
  // ::/96 — deprecated IPv4-compatible (e.g. ::7f00:1). Judge by embedded IPv4.
  if (topFiveZero && h[5] === 0) return isBlockedIPv4(embeddedV4());
  // 64:ff9b::/96 — NAT64 well-known prefix. Block the whole prefix.
  if (h[0] === 0x64 && h[1] === 0xff9b &&
      h[2] === 0 && h[3] === 0 && h[4] === 0 && h[5] === 0) return true;

  if ((h[0] & 0xfe00) === 0xfc00) return true; // fc00::/7  unique-local
  if ((h[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  return false;
}

/**
 * Expand an IPv6 literal (already validated by `net.isIP === 6`) into its eight
 * 16-bit hextets, handling `::` compression and a trailing embedded IPv4
 * (`::ffff:1.2.3.4`). Returns null if it cannot be parsed.
 */
function expandIPv6(input: string): number[] | null {
  let s = input.toLowerCase();
  // Drop any zone id (fe80::1%eth0).
  const pct = s.indexOf("%");
  if (pct !== -1) s = s.slice(0, pct);

  // Rewrite a trailing dotted-IPv4 group into two hex hextets.
  const lastColon = s.lastIndexOf(":");
  const lastPart = s.slice(lastColon + 1);
  if (lastPart.includes(".")) {
    const v4 = lastPart.split(".").map((p) => Number(p));
    if (
      v4.length !== 4 ||
      v4.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
    ) {
      return null;
    }
    const h1 = ((v4[0] << 8) | v4[1]).toString(16);
    const h2 = ((v4[2] << 8) | v4[3]).toString(16);
    s = s.slice(0, lastColon + 1) + h1 + ":" + h2;
  }

  let parts: string[];
  const dbl = s.indexOf("::");
  if (dbl !== -1) {
    const before = s.slice(0, dbl);
    const after = s.slice(dbl + 2);
    const head = before === "" ? [] : before.split(":");
    const tail = after === "" ? [] : after.split(":");
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    parts = [...head, ...Array<string>(missing).fill("0"), ...tail];
  } else {
    parts = s.split(":");
  }
  if (parts.length !== 8) return null;

  const hextets = parts.map((p) =>
    /^[0-9a-f]{1,4}$/.test(p) ? parseInt(p, 16) : NaN,
  );
  return hextets.some((n) => Number.isNaN(n)) ? null : hextets;
}

/** True for hostnames that are inherently local / internal. */
function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (h === "" || h === "localhost" || h.endsWith(".localhost")) return true;
  if (
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".localdomain")
  ) {
    return true;
  }
  return false;
}

/* --------------------------------------------------------------------------- */
/* Bounded body read                                                           */
/* --------------------------------------------------------------------------- */

/** Read a response body into a Buffer, stopping once {@link MAX_BYTES} is hit. */
async function readCapped(
  res: Response,
  maxBytes: number,
): Promise<{ buf: Buffer; truncated: boolean }> {
  if (!res.body) {
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    return {
      buf: buf.length > maxBytes ? buf.subarray(0, maxBytes) : buf,
      truncated: buf.length > maxBytes,
    };
  }

  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  let truncated = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    if (total + value.byteLength > maxBytes) {
      const remaining = maxBytes - total;
      chunks.push(Buffer.from(value.subarray(0, remaining)));
      truncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
    total += value.byteLength;
    chunks.push(Buffer.from(value));
  }

  return { buf: Buffer.concat(chunks), truncated };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** HTTP status codes that carry a redirect `Location` we should follow. */
function isRedirectStatus(status: number): boolean {
  return (
    status === 301 ||
    status === 302 ||
    status === 303 ||
    status === 307 ||
    status === 308
  );
}
