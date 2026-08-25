/**
 * POST /api/auth/login — verify credentials + mint a session.
 * Body: { username, password }. Sets the httpOnly session cookie on success.
 */

import { z } from "zod";
import { errorBody } from "@/lib/dto";
import { loginUser, setSessionCookie, InvalidCredentialsError } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(errorBody("Invalid JSON body", "invalid_request"), {
      status: 400,
    });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      errorBody("Enter your username and password.", "invalid_request"),
      { status: 400 },
    );
  }

  try {
    const { user, token, expiresAt } = await loginUser(
      parsed.data.username,
      parsed.data.password,
    );
    await setSessionCookie(token, expiresAt);
    return Response.json({ user: { username: user.username } });
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return Response.json(errorBody(err.message, "invalid_credentials"), {
        status: 401,
      });
    }
    console.error("[auth/login] failed:", err);
    return Response.json(errorBody("Could not sign in.", "server_error"), {
      status: 500,
    });
  }
}
