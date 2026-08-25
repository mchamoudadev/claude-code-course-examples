/**
 * Hot-reload-safe MongoDB client + GridFS bucket for PostForge.
 *
 * A single `MongoClient` is cached on `globalThis` so Next.js dev hot-reloads
 * (and multiple route handlers) reuse one connection pool instead of opening a
 * new connection per module evaluation. Indexes on the `posts` collection are
 * ensured exactly once per process.
 */

import { Db, GridFSBucket, MongoClient } from "mongodb";
import { requireEnv } from "./env";

/** GridFS bucket that stores poster image bytes. */
export const POSTERS_BUCKET = "posters";

/** The `posts` collection name (canonical). */
export const POSTS_COLLECTION = "posts";

/** The `settings` singleton collection name. */
export const SETTINGS_COLLECTION = "settings";

interface MongoCache {
  client: MongoClient | null;
  clientPromise: Promise<MongoClient> | null;
  indexesPromise: Promise<void> | null;
}

// Persist the cache across hot reloads by hanging it off globalThis.
const globalForMongo = globalThis as unknown as {
  __postforgeMongo?: MongoCache;
};

const cache: MongoCache =
  globalForMongo.__postforgeMongo ??
  (globalForMongo.__postforgeMongo = {
    client: null,
    clientPromise: null,
    indexesPromise: null,
  });

/**
 * Get the shared, connected `MongoClient`, connecting on first use. Subsequent
 * calls (including across hot reloads) return the same instance.
 */
export async function getClient(): Promise<MongoClient> {
  if (cache.client) return cache.client;

  if (!cache.clientPromise) {
    const uri = requireEnv("MONGODB_URI");
    const client = new MongoClient(uri, {
      // Conservative pool sizing suited to serverless-style route handlers.
      maxPoolSize: 10,
      // Fail fast if the local server is unreachable rather than hanging.
      serverSelectionTimeoutMS: 5000,
    });
    cache.clientPromise = client
      .connect()
      .then((connected) => {
        cache.client = connected;
        return connected;
      })
      .catch((err) => {
        // Reset so a later call can retry a fresh connection.
        cache.clientPromise = null;
        throw err;
      });
  }

  return cache.clientPromise;
}

/**
 * Get the PostForge database (name taken from the connection string), ensuring
 * indexes on the `posts` collection on first access.
 */
export async function getDb(): Promise<Db> {
  const client = await getClient();
  const db = client.db(); // db name comes from MONGODB_URI (e.g. /postforge)
  await ensureIndexes(db);
  return db;
}

/** Get a GridFS bucket for poster bytes. */
export async function getBucket(): Promise<GridFSBucket> {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: POSTERS_BUCKET });
}

/**
 * Ensure the `posts` indexes exist. Runs at most once per process; concurrent
 * callers await the same promise.
 */
function ensureIndexes(db: Db): Promise<void> {
  if (!cache.indexesPromise) {
    const posts = db.collection(POSTS_COLLECTION);
    cache.indexesPromise = Promise.all([
      posts.createIndex({ createdAt: -1 }, { name: "createdAt_desc" }),
      posts.createIndex({ status: 1 }, { name: "status_1" }),
      posts.createIndex({ topic: "text" }, { name: "topic_text" }),
      posts.createIndex({ runId: 1 }, { name: "runId_unique", unique: true }),
    ])
      .then(() => undefined)
      .catch((err) => {
        // Reset so a later call can retry ensuring indexes.
        cache.indexesPromise = null;
        throw err;
      });
  }
  return cache.indexesPromise;
}
