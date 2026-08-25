/**
 * Cookie-bound session helpers for Route Handlers and Server Components.
 *
 * These use `next/headers` `cookies()` (async in Next 16), so they are ONLY
 * valid inside a request scope (route handlers / server components) — NOT in
 * `proxy.ts`, which reads `request.cookies` directly and calls
 * `resolveSessionUser` from `./session`.
 */

import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  resolveSessionUser,
  revokeSession,
  type SessionUser,
} from "./session";

/** The signed-in user for the current request, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return resolveSessionUser(store.get(SESSION_COOKIE)?.value);
}

/** Write the session cookie (httpOnly, Secure in prod, SameSite=Lax). */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Revoke the current session (delete server-side) and clear the cookie. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  await revokeSession(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
}
