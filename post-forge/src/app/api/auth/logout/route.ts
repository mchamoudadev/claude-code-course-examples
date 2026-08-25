/**
 * POST /api/auth/logout — revoke the current session and clear the cookie.
 */

import { endSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  await endSession();
  return Response.json({ ok: true });
}
