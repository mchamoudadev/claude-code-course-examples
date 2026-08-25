/**
 * Auth data layer — `users` and `sessions` collections in the same MongoDB the
 * rest of the app uses (local `mongodb://…` in dev, Atlas `mongodb+srv://…` in
 * prod — selected by the `MONGODB_URI` environment, see `.env.example`).
 *
 * Indexes are ensured lazily on first access (idempotent):
 *   - `users.usernameLower`  unique  → one account per case-insensitive name
 *   - `sessions.tokenHash`   unique  → fast session lookup (we store only the
 *                                      SHA-256 of the token, never the token)
 *   - `sessions.expiresAt`   TTL     → expired sessions auto-purge
 *
 * Server-only (imports the Mongo driver). Never import into client code.
 */

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";

export const USERS_COLLECTION = "users";
export const SESSIONS_COLLECTION = "sessions";

export interface UserDoc {
  _id: ObjectId;
  /** Display username as the user typed it. */
  username: string;
  /** Lowercased username — the unique key (case-insensitive accounts). */
  usernameLower: string;
  /** `scrypt$salt$hash` (see `password.ts`). */
  passwordHash: string;
  createdAt: Date;
}

export interface SessionDoc {
  _id: ObjectId;
  /** SHA-256 hex of the opaque session token held in the cookie. */
  tokenHash: string;
  userId: ObjectId;
  createdAt: Date;
  expiresAt: Date;
}

let indexesEnsured: Promise<void> | null = null;

function ensureIndexes(): Promise<void> {
  if (!indexesEnsured) {
    indexesEnsured = (async () => {
      const db = await getDb();
      await db
        .collection(USERS_COLLECTION)
        .createIndex({ usernameLower: 1 }, { unique: true });
      await db
        .collection(SESSIONS_COLLECTION)
        .createIndex({ tokenHash: 1 }, { unique: true });
      await db
        .collection(SESSIONS_COLLECTION)
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    })().catch((err) => {
      // Reset so a transient failure can be retried on the next call.
      indexesEnsured = null;
      throw err;
    });
  }
  return indexesEnsured;
}

/* ------------------------------- users ---------------------------------- */

/** Thrown when a username is already taken (unique-index violation). */
export class UsernameTakenError extends Error {
  constructor() {
    super("That username is already taken.");
    this.name = "UsernameTakenError";
  }
}

export async function createUser(
  username: string,
  passwordHash: string,
): Promise<UserDoc> {
  await ensureIndexes();
  const db = await getDb();
  const doc: UserDoc = {
    _id: new ObjectId(),
    username,
    usernameLower: username.toLowerCase(),
    passwordHash,
    createdAt: new Date(),
  };
  try {
    await db.collection<UserDoc>(USERS_COLLECTION).insertOne(doc);
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new UsernameTakenError();
    throw err;
  }
  return doc;
}

export async function findUserByUsername(
  username: string,
): Promise<UserDoc | null> {
  await ensureIndexes();
  const db = await getDb();
  return db
    .collection<UserDoc>(USERS_COLLECTION)
    .findOne({ usernameLower: username.toLowerCase() });
}

export async function findUserById(id: ObjectId): Promise<UserDoc | null> {
  const db = await getDb();
  return db.collection<UserDoc>(USERS_COLLECTION).findOne({ _id: id });
}

/* ------------------------------ sessions -------------------------------- */

export async function insertSession(
  userId: ObjectId,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  await db.collection<SessionDoc>(SESSIONS_COLLECTION).insertOne({
    _id: new ObjectId(),
    tokenHash,
    userId,
    createdAt: new Date(),
    expiresAt,
  });
}

export async function findSessionByTokenHash(
  tokenHash: string,
): Promise<SessionDoc | null> {
  const db = await getDb();
  return db
    .collection<SessionDoc>(SESSIONS_COLLECTION)
    .findOne({ tokenHash });
}

export async function deleteSessionByTokenHash(tokenHash: string): Promise<void> {
  const db = await getDb();
  await db.collection<SessionDoc>(SESSIONS_COLLECTION).deleteOne({ tokenHash });
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}
