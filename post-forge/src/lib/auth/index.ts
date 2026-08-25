/**
 * High-level auth operations: register + login. Both mint a session and return
 * the raw token for the caller (a route handler) to set as a cookie.
 *
 * Validation of username/password FORMAT happens at the route boundary (Zod);
 * here we enforce the security invariants (hashing, uniqueness, credential
 * check). Server-only.
 */

import { hashPassword, verifyPassword } from "./password";
import { createUser, findUserByUsername } from "./repo";
import { issueSession, type SessionUser } from "./session";

export { UsernameTakenError } from "./repo";
export { getCurrentUser, setSessionCookie, endSession } from "./cookies";
export { SESSION_COOKIE, resolveSessionUser, type SessionUser } from "./session";

/** Thrown by {@link loginUser} on unknown username or wrong password. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid username or password.");
    this.name = "InvalidCredentialsError";
  }
}

export interface AuthResult {
  user: SessionUser;
  token: string;
  expiresAt: Date;
}

/** Create a new account and an initial session. Throws `UsernameTakenError`. */
export async function registerUser(
  username: string,
  password: string,
): Promise<AuthResult> {
  const passwordHash = await hashPassword(password);
  const user = await createUser(username, passwordHash); // throws if taken
  const { token, expiresAt } = await issueSession(user._id);
  return { user: { id: user._id.toString(), username: user.username }, token, expiresAt };
}

/** Verify credentials and mint a session. Throws `InvalidCredentialsError`. */
export async function loginUser(
  username: string,
  password: string,
): Promise<AuthResult> {
  const user = await findUserByUsername(username);
  // Always run a hash comparison to blunt username-enumeration timing.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "scrypt$00$00");
  if (!user || !ok) throw new InvalidCredentialsError();
  const { token, expiresAt } = await issueSession(user._id);
  return { user: { id: user._id.toString(), username: user.username }, token, expiresAt };
}
