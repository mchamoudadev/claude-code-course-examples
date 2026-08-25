/**
 * GET /api/auth/me — the current signed-in user, or 401. Lets the client render
 * the real username / gate UI without trusting anything client-side.
 */

import { errorBody } from "@/lib/dto";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(errorBody("Not authenticated", "unauthorized"), {
      status: 401,
    });
  }
  return Response.json({ user: { username: user.username } });
}
