/**
 * fetch_url tool (T03 → T18): SSRF guard + text cap, with fetch and DNS mocked.
 *
 * - SSRF: literal private/loopback/link-local/metadata IPs, local hostnames,
 *   unsupported protocols, and hostnames that DNS-RESOLVE to a private address
 *   are all refused with `{ ok:false, blocked:true }` and no fetch.
 * - Cap: an oversized readable body is truncated to MAX_TEXT_CHARS (12k).
 * - Public literal IPs skip DNS (no network); fetch returns canned Responses.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));

import { lookup } from "node:dns/promises";
import { fetchUrlTool, type FetchUrlResult } from "@/agents/tools/fetch_url";
import type { Tool } from "@inngest/agent-kit";
import type { NetworkState } from "@/lib/state";

const lookupMock = vi.mocked(lookup);
const opts = {} as unknown as Tool.Options<NetworkState>;

function run(url: string): Promise<FetchUrlResult> {
  return fetchUrlTool.handler({ url }, opts) as Promise<FetchUrlResult>;
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

beforeEach(() => {
  lookupMock.mockReset();
  lookupMock.mockResolvedValue([] as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetch_url — SSRF guard", () => {
  const blockedLiterals: Array<[string, string]> = [
    ["cloud metadata", "http://169.254.169.254/latest/meta-data/"],
    ["loopback v4", "http://127.0.0.1/"],
    ["private 10/8", "http://10.0.0.1/"],
    ["private 172.16/12", "http://172.16.5.9/"],
    ["private 192.168/16", "http://192.168.1.1/"],
    ["CGNAT 100.64/10", "http://100.100.0.1/"],
    ["unspecified 0.0.0.0", "http://0.0.0.0/"],
    ["ipv6 loopback", "http://[::1]/"],
    // IPv6-mapped / -compatible / NAT64 forms of loopback + metadata that the
    // old dotted-decimal-only decoder let slip through.
    ["ipv6-mapped loopback (hex)", "http://[::ffff:7f00:1]/"],
    ["ipv6-mapped metadata (hex)", "http://[::ffff:a9fe:a9fe]/"],
    ["ipv6-mapped loopback (dotted)", "http://[::ffff:127.0.0.1]/"],
    ["ipv4-compatible loopback", "http://[::7f00:1]/"],
    ["nat64 metadata", "http://[64:ff9b::a9fe:a9fe]/"],
  ];

  it.each(blockedLiterals)(
    "refuses %s without any network call",
    async (_label, url) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const res = await run(url);
      expect(res.ok).toBe(false);
      expect(res.blocked).toBe(true);
      expect(res.note).toMatch(/SSRF guard/);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  const blockedHostnames = [
    "http://localhost/",
    "http://api.internal/",
    "http://db.local/",
  ];

  it.each(blockedHostnames)("refuses local hostname %s", async (url) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await run(url);
    expect(res.blocked).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    // Local hostnames are rejected by name — no DNS lookup needed.
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("refuses unsupported protocols", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = await run("ftp://example.com/file");
    expect(res.blocked).toBe(true);
    expect(res.note).toMatch(/unsupported protocol/);
  });

  it("refuses a malformed URL", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = await run("http://");
    expect(res.blocked).toBe(true);
  });

  it("refuses a hostname that DNS-resolves to a private address", async () => {
    lookupMock.mockResolvedValue([
      { address: "10.0.0.5", family: 4 },
    ] as never);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await run("http://sneaky.example.com/");
    expect(res.blocked).toBe(true);
    expect(res.note).toMatch(/resolves to non-public/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(lookupMock).toHaveBeenCalledWith("sneaky.example.com", { all: true });
  });
});

describe("fetch_url — fetch + parse (public literal IP, no DNS)", () => {
  const PUBLIC = "http://93.184.216.34/";

  it("extracts readable text + title from HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        htmlResponse(
          "<html><head><title>Example Domain</title></head><body>" +
            "<article><h1>Header</h1><p>Hello readable world content here.</p>" +
            "</article></body></html>",
        ),
      ),
    );
    const res = await run(PUBLIC);
    expect(res.ok).toBe(true);
    expect(res.blocked).toBeFalsy();
    expect(res.title).toBeDefined();
    expect(res.text).toContain("Hello readable world content");
    expect(lookupMock).not.toHaveBeenCalled(); // literal IP ⇒ no DNS
  });

  it("truncates oversized readable text to MAX_TEXT_CHARS (12k) and flags it", async () => {
    const huge = "lorem ipsum dolor ".repeat(3000); // ~54k chars
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        htmlResponse(
          `<html><head><title>Big</title></head><body><article><p>${huge}</p></article></body></html>`,
        ),
      ),
    );
    const res = await run(PUBLIC);
    expect(res.ok).toBe(true);
    expect(res.text?.length).toBe(12_000);
    expect(res.truncated).toBe(true);
  });

  it("skips non-HTML content with a note", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"a":1}', {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const res = await run(PUBLIC);
    expect(res.ok).toBe(false);
    expect(res.blocked).toBeFalsy();
    expect(res.note).toMatch(/non-HTML/);
  });

  it("reports a non-2xx fetch as a note (not a throw)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("nope", { status: 404 })),
    );
    const res = await run(PUBLIC);
    expect(res.ok).toBe(false);
    expect(res.note).toMatch(/HTTP 404/);
  });

  it("degrades gracefully on a transport failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    const res = await run(PUBLIC);
    expect(res.ok).toBe(false);
    expect(res.note).toMatch(/Fetch failed or timed out/);
  });
});

describe("fetch_url — redirect re-validation (SSRF)", () => {
  const PUBLIC = "http://93.184.216.34/";
  const PUBLIC_B = "http://93.184.216.35/";

  function redirect(location: string, status = 302): Response {
    return new Response(null, { status, headers: { location } });
  }

  it("re-checks a redirect hop and refuses one aimed at the metadata IP", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect("http://169.254.169.254/latest/meta-data/"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await run(PUBLIC);
    expect(res.ok).toBe(false);
    expect(res.blocked).toBe(true);
    expect(res.note).toMatch(/SSRF guard/);
    // The redirect target is a literal IP → guarded without a second fetch.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses a redirect to a raw loopback (e.g. mongo on 127.0.0.1)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect("http://127.0.0.1:27017/"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await run(PUBLIC);
    expect(res.blocked).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("follows a redirect to another public target and parses the final page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect(PUBLIC_B))
      .mockResolvedValueOnce(
        htmlResponse(
          "<html><head><title>Final</title></head><body><article>" +
            "<p>Followed to the real content here.</p></article></body></html>",
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await run(PUBLIC);
    expect(res.ok).toBe(true);
    expect(res.text).toContain("Followed to the real content");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Second hop is a literal IP → still no DNS.
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("resolves a relative Location against the current URL before following", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect("/next-page"))
      .mockResolvedValueOnce(
        htmlResponse(
          "<html><body><article><p>Relative redirect landed.</p></article></body></html>",
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await run(PUBLIC);
    expect(res.ok).toBe(true);
    expect(res.text).toContain("Relative redirect landed");
    // Second call must target the absolute resolution of the relative Location.
    expect(fetchMock.mock.calls[1][0]).toBe("http://93.184.216.34/next-page");
  });

  it("re-checks a redirect to a hostname that DNS-resolves to a private IP", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect("http://sneaky.example.com/"));
    vi.stubGlobal("fetch", fetchMock);
    lookupMock.mockResolvedValue([{ address: "10.0.0.5", family: 4 }] as never);

    const res = await run(PUBLIC);
    expect(res.blocked).toBe(true);
    expect(res.note).toMatch(/resolves to non-public/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after the redirect hop cap", async () => {
    // Always redirects to a (public) target so only the hop cap stops it.
    const fetchMock = vi.fn().mockResolvedValue(redirect(PUBLIC));
    vi.stubGlobal("fetch", fetchMock);

    const res = await run(PUBLIC);
    expect(res.ok).toBe(false);
    expect(res.note).toMatch(/Too many redirects/);
    // 5 hops allowed + the fetch that trips the cap = 6 requests.
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
});
