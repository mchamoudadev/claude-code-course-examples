import { Inngest } from "inngest";
import { env, requireEnv } from "@/lib/env";

/**
 * The shared Inngest client for PostForge.
 *
 * Consumed by every Inngest function (T05 `generatePost`, T14 cron) and by the
 * serve route at `src/app/api/inngest/route.ts`. The `id` is the app identifier
 * shown in the Inngest dev dashboard.
 *
 * ── Fail-closed production hardening ──────────────────────────────────────────
 * Inngest verifies incoming webhook signatures (the `POST /api/inngest` remote
 * trigger) ONLY when the client runs in "cloud" mode AND has a signing key.
 * Two footguns can silently disable that verification in production, turning the
 * endpoint into an open, unauthenticated remote trigger for `generatePost`/`cron`
 * (unbounded spend + arbitrary DB writes):
 *
 *   1. `INNGEST_DEV` truthy → the client drops into "dev" mode, which skips
 *      signature verification entirely.
 *   2. A missing/blank signing key → nothing to verify against.
 *
 * In Inngest v4 the signing key and mode are resolved from the *client* options
 * (`InngestCommHandler` reads `client.signingKey`; `serve()` has no `signingKey`
 * option in this version), so we assert both here, at module load, and pin the
 * mode explicitly. A misconfigured production deploy throws on import — which is
 * exactly what fails the webhook closed — rather than serving traffic unverified.
 *
 * Development (where `npm run dev` sets `INNGEST_DEV=1`) is untouched: the guard
 * only fires when `NODE_ENV === "production"`.
 */

// `next build` runs with NODE_ENV=production and evaluates route modules to
// collect metadata — but the app is not actually serving traffic then, so the
// signing key legitimately may not be present in the build environment. Skip the
// guard during the build phase; it still fires at RUNTIME (the module re-loads in
// the server process, where NEXT_PHASE is not the build phase), keeping the
// webhook fail-closed when it actually matters.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const isProduction = process.env.NODE_ENV === "production" && !isBuildPhase;

/** Matches the values Inngest itself treats as dev-mode-on (`parseAsBoolean`). */
function isInngestDevEnabled(value: string | undefined): boolean {
  if (value === undefined) return false;
  return ["true", "1"].includes(value.trim().toLowerCase());
}

/**
 * Signing key passed explicitly to the client in production so webhook
 * verification never relies purely on ambient env resolution. Left `undefined`
 * in development, where it is optional.
 */
let signingKey: string | undefined;

if (isProduction) {
  // (1) INNGEST_DEV must never be enabled in production — dev mode disables
  //     Inngest webhook signature verification.
  if (isInngestDevEnabled(env("INNGEST_DEV"))) {
    throw new Error(
      "INNGEST_DEV is enabled in production. Dev mode disables Inngest webhook " +
        "signature verification, exposing POST /api/inngest as an open remote " +
        "trigger. Unset INNGEST_DEV in production.",
    );
  }

  // (2) A signing key is mandatory in production so incoming webhooks are
  //     cryptographically verified. Throws MissingEnvError if absent/blank.
  signingKey = requireEnv("INNGEST_SIGNING_KEY");
}

export const inngest = new Inngest({
  id: "post-forge",
  // In production, pin cloud mode and the signing key explicitly so a stray
  // INNGEST_DEV or an unresolved key can never silently degrade to unverified
  // "dev" mode. In development, keep Inngest's default (env-driven) behavior.
  ...(isProduction ? { isDev: false as const, signingKey } : {}),
});
