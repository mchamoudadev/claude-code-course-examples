import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy.
 *
 * Tradeoff: this baseline uses `'unsafe-inline'` for both `style-src` and
 * `script-src`. Next.js 16 + React 19 + Tailwind v4 inject inline <style>/<script>
 * (framework bootstrap, Tailwind's injected styles), so a strict policy without a
 * nonce would break the running app. `'unsafe-inline'` keeps the app working today.
 * The stricter follow-up is a nonce-based CSP (per-request nonce set in `proxy.ts`,
 * with `'strict-dynamic'`), which removes the need for `'unsafe-inline'` on scripts.
 * See node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
 *
 * Dev-only: React/Turbopack HMR uses `eval`, so `'unsafe-eval'` is required in
 * development to boot. It is deliberately NOT added to script-src in production
 * (React/Next do not use `eval` in prod) so prod is not weakened.
 *
 * Same-origin `img-src` covers posters streamed from /api/posters/[id]; `data:`
 * and `blob:` cover inline/generated image data (Next image handling, data URIs).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self'",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
