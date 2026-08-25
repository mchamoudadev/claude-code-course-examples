# PostForge — Pre-Deployment Security Checklist

**Target:** VPS / container · MongoDB Atlas · **real public users**
**Current posture:** auth is a **cosmetic stub** — there is no `middleware.ts` and **no server-side auth on any `/api/**` route**. Every mutating and credit-spending endpoint is reachable by anyone. This checklist is derived from a code audit; each item cites the real `file:line`.

Legend: 🔴 blocker (do not expose publicly until done) · 🟠 high (before real traffic) · 🟡 medium · 🟢 already solid.

---

## ✅ Implemented in this pass (2026-07-06)

Verified end-to-end (build + live):

- **Username/password auth with DB-backed sessions** — `src/lib/auth/*`, `src/app/api/auth/{register,login,logout,me}`, and central enforcement in **`src/proxy.ts`** (Next 16's renamed middleware, Node runtime → validates the Mongo session). Anonymous `/api/**` → 401; anonymous pages → redirect to `/sign-in?next=…`. Sessions are opaque random tokens stored only as SHA-256, httpOnly + Secure(prod) + SameSite=Lax cookie, revocable, 7-day TTL. `scrypt` hashing (no new dependency). Sign-in/up wired to real endpoints; fake social-login buttons removed. **[#1, #2, #3, #14, #15 — access side]**
- **Inngest fail-closed in production** — `src/inngest/client.ts` throws at runtime if `INNGEST_DEV` is truthy or `INNGEST_SIGNING_KEY` is missing (skipped during `next build`). **[#5]**
- **SSRF: redirects re-validated per hop + IPv6-mapped/NAT64 loopback blocked** — `src/agents/tools/fetch_url.ts`. **[#4, #16]** (DNS-rebinding IP-pinning still a residual — see #12.)
- **Stored-XSS closed** — `src/lib/safe-url.ts` scheme allow-list at both render sites and ingestion (`web_search`, `save_post`). **[#8]**
- **Spend guard centralized** into `createGeneration` so cron + "run now" are gated; `/api/generate` no longer leaks raw errors. **[#6, #18]**
- **Security headers + `.dockerignore`** — CSP/HSTS/X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy, `poweredByHeader:false`; `.env*` excluded from the image. **[#10, part of #7]**
- **Env split** — local `MONGODB_URI` (mongod) vs production Atlas SRV, documented in `.env.example` + `.env.production.example`.
- **Multi-tenancy (posts are per-user)** — every post + schedule carries an owner (`userId`/`ownerUserId`); all reads/writes are scoped to the caller (`posts` list/detail/delete, `stats`, poster streaming, schedules CRUD + "run now", and cron-fired posts inherit the schedule owner). The rate/dedupe guard is now per-user too. A user can't read or delete another user's post (404, no existence leak). Seed data is owned by a `demo` / `demo12345` account. **Verified:** a fresh user sees 0 posts and 404s on demo's posts; demo's data survives. **[closes the IDOR gap + #14/#15 data side]**

**Still required before going fully public (see below):**
- **#7 — rotate the OpenRouter + Serper keys** (your action; they were on disk/in logs).
- **#11 — Atlas hardening** (IP allowlist to the server egress, least-privilege DB user) — deploy-side.
- **#9 / #13 — per-user rate-limit + spend cap, and request body-size limit.**
- **#12 — DNS-rebinding IP pinning** (residual; redirect hops are now checked).
- **#17 / #19 — prompt-injection delimiting, GridFS size cap.**
- ~~Multi-tenancy~~ — **done** (see above). Data is now scoped per-user.
- **Defense-in-depth** — sensitive data routes now also re-check `getCurrentUser()` (added with multi-tenancy); proxy remains the primary gate and the app uses no Server Actions.

---

## 🔴 Blockers — do NOT put this on the public internet until every one is done

- [ ] **1. Add real authentication across `/api/**`.** There is no `middleware.ts` and no session check anywhere; `src/app/(auth)/*` is UI-only. Every endpoint below is open to anonymous callers. Add auth (sessions or API keys) enforced in middleware, or at minimum gate the whole `/api` surface behind an authenticating reverse proxy.
- [ ] **2. Stop unauthenticated paid generation.** `POST /api/generate` (`src/app/api/generate/route.ts:24`) spends OpenRouter + Serper + image credits with no identity and no spend ceiling. Gate it and add a persisted spend/quota cap (see #7).
- [ ] **3. Stop unauthenticated destructive deletes.** `DELETE /api/posts/[id]` (`src/app/api/posts/[id]/route.ts:34`) permanently deletes any post **and** its GridFS poster, with no auth and no ownership check. `GET /api/posts` hands out every id, so no guessing is even needed.
- [ ] **4. Fix SSRF in `fetch_url` (redirects bypass the guard).** `ssrfCheck` runs once on the original URL (`src/agents/tools/fetch_url.ts:74`) but the fetch uses `redirect: "follow"` (`:89`). An attacker page the LLM is steered to fetch can 30x-redirect to `169.254.169.254` (cloud-metadata creds) or `127.0.0.1:27017` (your Mongo). Set `redirect: "manual"` and re-run `ssrfCheck` on each `Location` hop (with a hop cap), **and** pin the vetted IP for the connection to close the DNS-rebinding TOCTOU (`:235` resolves, `:89` re-resolves independently — see #12).
- [ ] **5. Make Inngest fail-closed in production.** `serve()` (`src/app/api/inngest/route.ts:14`) and the client (`src/inngest/client.ts:10`) pass no signing key and no explicit mode — signature verification depends entirely on ambient env. If `INNGEST_DEV=1` leaks into prod or `INNGEST_SIGNING_KEY` is blank (as `.env.example` ships it), **anyone can `POST /api/inngest` to run `generatePost`/`cron` with arbitrary payloads** (unbounded spend + arbitrary DB writes). Require `INNGEST_SIGNING_KEY` and assert `INNGEST_DEV` is unset when `NODE_ENV==="production"` — fail the boot otherwise.
- [ ] **6. Move the spend/dedupe guard into `createGeneration`.** `checkGenerateGuard` (`src/lib/dedupe.ts:65`) is called **only** in `/api/generate`. The cron poller (`src/inngest/cron.ts:80`) and schedule "run now" (`src/app/api/schedules/[id]/route.ts:157`) call `createGeneration` directly and skip the cap entirely — an unauthenticated schedule (`POST /api/schedules`) becomes a self-perpetuating paid job. Put the guard inside `createGeneration` so every path is gated.
- [ ] **7. Rotate the OpenRouter + Serper API keys now, and keep them out of the image.** Real live keys sit in plaintext at `.env` and their prefixes were surfaced during the audit session. On a VPS/container a stray `COPY . .` bakes them into an image layer. Rotate both, add a `.dockerignore` that excludes `.env`, and inject secrets only via the runtime/secret store — never the build context.

---

## 🟠 High — close before real traffic

- [ ] **8. Block `javascript:`/`data:` source URLs (stored XSS).** Source URLs come untrusted from Serper (`web_search.ts:106`) and the LLM (`save_post.ts:44`, `url: z.string()` — no scheme check) and render straight into anchor `href`s (`source-citation-chip.tsx:83`, `PostView.tsx:192`, `pipeline-view/stage-detail.tsx:126`). React does **not** sanitize `href`, so a `javascript:…` "source" runs in your origin on click. Validate the scheme (`new URL(u).protocol ∈ {http:, https:}`) both at render and at the `save_post`/`web_search` boundary.
- [ ] **9. Real rate-limiting + a daily spend cap.** The only control is a **global**, non-atomic `countDocuments` vs `MAX_INFLIGHT_RUNS` (default 3) at `src/lib/dedupe.ts:71` — check-then-create (TOCTOU: concurrent requests all pass), global (3 anyone-runs = DoS for everyone), and it caps concurrency, **not total spend**. Add per-IP + global persisted counters with an atomic `$inc`-guarded increment, plus a rolling daily spend ceiling. A reverse-proxy/WAF rate limit in front is the fastest first layer.
- [ ] **10. Add HTTP security headers (currently none).** `next.config.ts` is empty; there is no `headers()` and no middleware. Add: `Content-Security-Policy` (strict `default-src`/`frame-ancestors 'none'`), `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and set `poweredByHeader: false`.
- [ ] **11. Harden MongoDB Atlas.** `src/lib/mongo.ts:49` sets no `tls` option — it inherits the URI. Use the `mongodb+srv://` Atlas URI (TLS on by default), restrict the Atlas **IP allowlist to the VPS egress IP** (not `0.0.0.0/0`), and use a **least-privilege DB user** scoped `readWrite` to the `postforge` db only.
- [ ] **12. Pin the vetted IP for `fetch_url` (DNS-rebinding).** `ssrfCheck` resolves at `fetch_url.ts:235`, but `fetch` re-resolves independently at `:89`; a low-TTL domain can return a public IP to the check and a private IP to the fetch. Connect to the validated IP literal (custom `lookup`/dispatcher) with the original `Host` header. (Fold into #4.)
- [ ] **13. Add a request body-size limit.** No `sizeLimit`/body cap anywhere; `request.json()` buffers arbitrarily large bodies → memory-exhaustion DoS on any POST/PUT/PATCH. Cap body size at the proxy and/or in the route handlers.

---

## 🟡 Medium — schedule soon after launch

- [ ] **14. Auth-gate `PUT /api/settings`.** Unauthenticated, single-tenant: anyone rewrites the global default `model`/`imageModel`/`tone`/`length` for **all** future runs (`src/app/api/settings/route.ts:42`). Also **allowlist model ids** instead of accepting any `string.max(200)` here and in `/api/generate`.
- [ ] **15. Auth-gate + share-limit `POST /api/settings/test`.** Its throttle is in-memory/global on `globalThis` (`settings/test/route.ts:53`) — resets on deploy, doesn't span instances, and each call makes a real paid OpenRouter completion + Serper query (an unauthenticated paid amplifier).
- [ ] **16. Fix the IPv6-mapped-loopback SSRF bypass.** `isBlockedIPv6` (`fetch_url.ts:278`) only decodes dotted-decimal mapped addresses, so `::ffff:7f00:1` (127.0.0.1) / `::ffff:a9fe:a9fe` (metadata) slip through. Normalize/expand the address and block by the low-32-bit IPv4 range; also block `::ffff:0:0/96` and NAT64 `64:ff9b::/96`.
- [ ] **17. Defend prompt injection.** Fetched page text + search snippets enter the agent prompt with no trust boundary (`research.ts:80`). Wrap tool output in explicit `<untrusted_content>` delimiters, instruct the model to treat it as data, and re-validate any URL the model proposes before persistence (feeds #8).
- [ ] **18. Don't reflect raw errors.** `POST /api/generate` returns `err.message` in a 502 (`generate/route.ts:70`), which can leak driver/connection internals. Return a generic message; log detail server-side.
- [ ] **19. Bound GridFS poster streaming.** `/api/posters/[id]` (`posters/[id]/route.ts:29`) streams the full stored object with no size cap. Cap poster bytes at write time (or add a max-size guard) and front it with a CDN/proxy for caching + abuse protection.

---

## 🟢 Already solid (verified — keep it this way)

- **No client-side secret leakage** — zero `NEXT_PUBLIC_`; no `"use client"` module imports `env`/`mongo`/`models`/`image`/agents; all key use is server-only.
- **NoSQL injection: clean** — ids cast via `ObjectId.isValid`, `search` run through `escapeRegExp`, `status` whitelisted, `page`/`pageSize` numeric-clamped. No `$where`, no request objects spread into filters. Don't regress this.
- **Article body is safe from HTML injection** — `finalPost` renders as React text nodes (`article-body.tsx`), no `dangerouslySetInnerHTML`, no HTML markdown renderer. (The XSS risk in #8 is the URL `href` sink, not the body.)
- **No stack-trace leakage** (`error.tsx` shows only a digest) · **no prod browser source maps** (Next 16 default) · **`.env` gitignored and absent from git history**.

---

## Production `.env` invariants (the prod diff)

- [ ] `NODE_ENV=production`
- [ ] **Remove `INNGEST_DEV`** from the prod environment; set `INNGEST_SIGNING_KEY` **and** `INNGEST_EVENT_KEY` (and make them required at boot — #5).
- [ ] `MONGODB_URI=mongodb+srv://<least-priv-user>:…@…/postforge` (Atlas, TLS, IP-allowlisted).
- [ ] Fresh (rotated) `OPENROUTER_API_KEY` / `SERPER_API_KEY`, injected via the secret store — not baked into the image (`.dockerignore` excludes `.env`).
- [ ] TLS terminated at the reverse proxy, with HSTS (#10).

---

### The four that matter most, in order
1. **Auth on `/api/**`** (#1–#3) — today anyone can drain your credits and delete all data.
2. **Inngest fail-closed** (#5) — one env slip leaves `/api/inngest` an open remote trigger.
3. **SSRF redirect + rebinding** (#4/#12) — a public path to cloud-metadata creds and your Mongo.
4. **Rotate keys + `.dockerignore`** (#7) — plaintext keys must not ship in an image layer.
