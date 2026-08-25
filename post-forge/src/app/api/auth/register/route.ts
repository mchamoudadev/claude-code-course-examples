/**
 * POST /api/auth/register — create an account + session.
 * Body: { username, password }. Sets the httpOnly session cookie on success.
 */

import { z } from "zod";
import { errorBody } from "@/lib/dto";
import { registerUser, setSessionCookie, UsernameTakenError } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(32, "Username must be at most 32 characters.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphen or underscore only."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password is too long."),
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
    const message = parsed.error.issues.map((i) => i.message).join(" ");
    return Response.json(errorBody(message || "Invalid input", "invalid_request"), {
      status: 400,
    });
  }

  try {
    const { user, token, expiresAt } = await registerUser(
      parsed.data.username,
      parsed.data.password,
    );
    await setSessionCookie(token, expiresAt);
    return Response.json({ user: { username: user.username } });
  } catch (err) {
    if (err instanceof UsernameTakenError) {
      return Response.json(errorBody(err.message, "username_taken"), {
        status: 409,
      });
    }
    console.error("[auth/register] failed:", err);
    return Response.json(errorBody("Could not create account.", "server_error"), {
      status: 500,
    });
  }
}
