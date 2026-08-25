/**
 * Env accessor contract (T02 → T18): `requireEnv` fails fast, `env` reads softly,
 * and `requireOpenRouterKey` resolves the canonical name OR the legacy alias.
 *
 * All reads go through `process.env`, so tests drive them with `vi.stubEnv` and
 * restore afterwards — no `.env` file is (or should be) auto-loaded here.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MissingEnvError,
  env,
  requireEnv,
  requireOpenRouterKey,
} from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireEnv", () => {
  it("returns the trimmed value when set", () => {
    vi.stubEnv("MONGODB_URI", "  mongodb://localhost/db  ");
    expect(requireEnv("MONGODB_URI")).toBe("mongodb://localhost/db");
  });

  it("throws a named MissingEnvError when the var is unset", () => {
    vi.stubEnv("SERPER_API_KEY", "");
    expect(() => requireEnv("SERPER_API_KEY")).toThrow(MissingEnvError);
    try {
      requireEnv("SERPER_API_KEY");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingEnvError);
      expect((err as MissingEnvError).varName).toBe("SERPER_API_KEY");
      expect((err as Error).message).toBe("SERPER_API_KEY is not set");
    }
  });

  it("treats a whitespace-only value as missing", () => {
    vi.stubEnv("MONGODB_URI", "   ");
    expect(() => requireEnv("MONGODB_URI")).toThrow(/MONGODB_URI is not set/);
  });
});

describe("env (soft read)", () => {
  it("returns undefined for unset or whitespace-only vars, never throwing", () => {
    vi.stubEnv("SERPER_API_KEY", "");
    expect(env("SERPER_API_KEY")).toBeUndefined();
    vi.stubEnv("SERPER_API_KEY", "   ");
    expect(env("SERPER_API_KEY")).toBeUndefined();
  });

  it("returns the trimmed value when present", () => {
    vi.stubEnv("LLM_MODEL", "  openai/gpt-5-mini ");
    expect(env("LLM_MODEL")).toBe("openai/gpt-5-mini");
  });
});

describe("requireOpenRouterKey", () => {
  it("resolves the canonical OPENROUTER_API_KEY", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "canonical-key");
    vi.stubEnv("OPEN_ROUTER", "");
    expect(requireOpenRouterKey()).toBe("canonical-key");
  });

  it("falls back to the legacy OPEN_ROUTER alias", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("OPEN_ROUTER", "legacy-key");
    expect(requireOpenRouterKey()).toBe("legacy-key");
  });

  it("prefers the canonical name over the alias when both are set", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "canonical-key");
    vi.stubEnv("OPEN_ROUTER", "legacy-key");
    expect(requireOpenRouterKey()).toBe("canonical-key");
  });

  it("throws MissingEnvError('OPENROUTER_API_KEY') when neither is set", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("OPEN_ROUTER", "");
    expect(() => requireOpenRouterKey()).toThrow(MissingEnvError);
    try {
      requireOpenRouterKey();
    } catch (err) {
      expect((err as MissingEnvError).varName).toBe("OPENROUTER_API_KEY");
    }
  });
});
