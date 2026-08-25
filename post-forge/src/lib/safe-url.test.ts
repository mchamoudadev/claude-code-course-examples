import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./safe-url";

describe("safeHttpUrl", () => {
  it("accepts https URLs", () => {
    expect(safeHttpUrl("https://example.com/path?q=1")).toBe(
      "https://example.com/path?q=1",
    );
  });

  it("accepts http URLs", () => {
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com");
  });

  it("trims surrounding whitespace", () => {
    expect(safeHttpUrl("  https://example.com  ")).toBe("https://example.com");
  });

  it("rejects javascript: URLs", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    // Case-insensitive / whitespace-padded scheme still rejected.
    expect(safeHttpUrl("  JavaScript:alert(1)")).toBeNull();
  });

  it("rejects data: URLs", () => {
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("rejects vbscript: and file: URLs", () => {
    expect(safeHttpUrl("vbscript:msgbox(1)")).toBeNull();
    expect(safeHttpUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects empty and whitespace-only strings", () => {
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl("   ")).toBeNull();
  });

  it("rejects non-string input", () => {
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
    expect(safeHttpUrl(42)).toBeNull();
    expect(safeHttpUrl({ url: "https://example.com" })).toBeNull();
  });

  it("rejects malformed URLs", () => {
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl("example.com")).toBeNull();
    expect(safeHttpUrl("//example.com")).toBeNull();
  });
});
