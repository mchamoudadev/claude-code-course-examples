/**
 * Session tokens — opaque, DB-backed, revocable.
 *
 * A session is a random 256-bit token handed to the browser in an httpOnly
 * cookie. Only its SHA-256 is stored (in `sessions.tokenHash`), so a database
 * leak never yields usable tokens. `resolveSessionUser` validates a raw token
 * against the store and is safe to call from `proxy.ts` (Node runtime) — this
 * module imports NO `next/headers`, only Mongo + Node `crypto`, so it works in
 * both the proxy and route-handler contexts. Cookie read/write helpers that need
 * `next/headers` live in `./cookies`.
 */

import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import {
  deleteSessionByTokenHash,
  findSessionByTokenHash,
  findUserById,
  insertSession,
} from "./repo";

/** Cookie name holding the opaque session token. */
export const SESSION_COOKIE = "pf_session";

/** Session lifetime. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** The minimal user identity attached to a request. */
export interface SessionUser {
  id: string;
  username: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Mint a new session for `userId`; returns the raw token + its expiry. */
export async function issueSession(
  userId: ObjectId,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await insertSession(userId, hashToken(token), expiresAt);
  return { token, expiresAt };
}

/** Resolve a raw token to its user, or null if missing/expired/unknown. */
export async function resolveSessionUser(
  token: string | undefined | null,
): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await findSessionByTokenHash(hashToken(token));
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  const user = await findUserById(session.userId);
  if (!user) return null;
  return { id: user._id.toString(), username: user.username };
}

/** Revoke a session by its raw token (logout). */
export async function revokeSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await deleteSessionByTokenHash(hashToken(token));
}
