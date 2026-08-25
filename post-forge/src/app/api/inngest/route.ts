import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generatePost } from "@/inngest/functions";
import { cron } from "@/inngest/cron";

/**
 * Inngest serve handler (Next.js App Router).
 *
 * Registers the durable functions the Inngest dev server discovers by syncing
 * against this route (default path `/api/inngest`). T05 adds `generatePost`
 * (the `post/generate.requested` orchestration); T14 adds `cron` (the
 * scheduled-posts poller that fires due schedules).
 *
 * Webhook authentication (signature verification of the `POST` remote trigger)
 * is enforced by the shared client in `@/inngest/client`: in production it pins
 * cloud mode + an explicit `INNGEST_SIGNING_KEY` and throws at import if
 * `INNGEST_DEV` is set or the key is missing (fail-closed). In Inngest v4 the
 * `InngestCommHandler` reads `client.signingKey`, so `serve()` takes no separate
 * `signingKey` option — importing the guarded client is what secures this route.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generatePost, cron],
});
