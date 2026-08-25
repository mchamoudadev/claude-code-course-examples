/**
 * Minimal in-memory MongoDB collection/db doubles for the T18 test suite.
 *
 * `mongodb-memory-server` is NOT installed (noted in the T18 report), so the
 * repository + `save_post` tests mock `@/lib/mongo` at the `getDb` level and run
 * against this tiny driver-compatible fake instead. It implements exactly the
 * surface PostForge's persistence layer uses — `insertOne`, `findOne`,
 * `countDocuments`, a chainable `find().sort().skip().limit().toArray()`, and
 * `findOneAndUpdate` with `$set` / `$push` / `$inc` / `$setOnInsert` (dot-path
 * aware) plus `upsert` — enough to faithfully exercise nested-path `$set`
 * isolation, filter/pagination, and idempotent upsert-by-`runId`.
 *
 * It is deliberately small and honest: no attempt at full MongoDB semantics,
 * only the operators the code under test actually issues.
 */

import { ObjectId } from "mongodb";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;
type Filter = Record<string, any>;
type Update = Record<string, any>;

function getPath(obj: any, path: string): any {
  return path
    .split(".")
    .reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
}

function setPath(obj: any, path: string, value: any): void {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (cur[k] === undefined || cur[k] === null || typeof cur[k] !== "object") {
      cur[k] = {};
    }
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

function incPath(obj: any, path: string, delta: number): void {
  const cur = getPath(obj, path);
  setPath(obj, path, (typeof cur === "number" ? cur : 0) + delta);
}

function pushPath(obj: any, path: string, value: any): void {
  const cur = getPath(obj, path);
  if (Array.isArray(cur)) cur.push(value);
  else setPath(obj, path, [value]);
}

function asTime(v: any): number {
  return v instanceof Date ? v.getTime() : v;
}

function isOperatorObject(v: any): boolean {
  return (
    v !== null &&
    typeof v === "object" &&
    !(v instanceof ObjectId) &&
    !(v instanceof Date) &&
    !Array.isArray(v) &&
    Object.keys(v).some((k) => k.startsWith("$"))
  );
}

/** True when `doc` matches the (subset of) Mongo query operators we support. */
function matches(doc: Doc, filter: Filter): boolean {
  for (const [key, cond] of Object.entries(filter)) {
    const val = getPath(doc, key);
    if (isOperatorObject(cond)) {
      if ("$regex" in cond) {
        const re = new RegExp(cond.$regex, cond.$options ?? "");
        if (typeof val !== "string" || !re.test(val)) return false;
      }
      if ("$gte" in cond && !(asTime(val) >= asTime(cond.$gte))) return false;
      if ("$lte" in cond && !(asTime(val) <= asTime(cond.$lte))) return false;
      continue;
    }
    if (cond instanceof ObjectId) {
      if (!(val instanceof ObjectId) || !val.equals(cond)) return false;
      continue;
    }
    if (val !== cond) return false;
  }
  return true;
}

function applyUpdate(doc: Doc, update: Update, isInsert: boolean): void {
  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) setPath(doc, k, v);
  }
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) incPath(doc, k, v as number);
  }
  if (update.$push) {
    for (const [k, v] of Object.entries(update.$push)) pushPath(doc, k, v);
  }
  if (isInsert && update.$setOnInsert) {
    for (const [k, v] of Object.entries(update.$setOnInsert)) setPath(doc, k, v);
  }
}

interface FindOneAndUpdateOptions {
  upsert?: boolean;
  returnDocument?: "before" | "after";
}

/** A tiny in-memory stand-in for a MongoDB collection. */
export class FakeCollection<T extends Doc = Doc> {
  readonly docs: Doc[] = [];

  async insertOne(doc: T): Promise<{ insertedId: any }> {
    this.docs.push(doc);
    return { insertedId: (doc as Doc)._id };
  }

  async findOne(filter: Filter): Promise<T | null> {
    return (this.docs.find((d) => matches(d, filter)) as T) ?? null;
  }

  async countDocuments(filter: Filter = {}): Promise<number> {
    return this.docs.filter((d) => matches(d, filter)).length;
  }

  find(filter: Filter = {}) {
    let rows = this.docs.filter((d) => matches(d, filter));
    let skipN = 0;
    let limitN: number | undefined;
    const cursor = {
      sort(spec: Record<string, 1 | -1>) {
        const [k, dir] = Object.entries(spec)[0];
        rows = [...rows].sort((a, b) => {
          const av = asTime(getPath(a, k));
          const bv = asTime(getPath(b, k));
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
        return cursor;
      },
      skip(n: number) {
        skipN = n;
        return cursor;
      },
      limit(n: number) {
        limitN = n;
        return cursor;
      },
      async toArray(): Promise<T[]> {
        let out = rows.slice(skipN);
        if (limitN !== undefined) out = out.slice(0, limitN);
        return out as T[];
      },
    };
    return cursor;
  }

  async findOneAndUpdate(
    filter: Filter,
    update: Update,
    opts: FindOneAndUpdateOptions = {},
  ): Promise<T | null> {
    const existing = this.docs.find((d) => matches(d, filter));
    if (existing) {
      applyUpdate(existing, update, false);
      return existing as T;
    }
    if (!opts.upsert) return null;

    // Upsert: seed from the filter's equality fields, then $setOnInsert + $set.
    const doc: Doc = {};
    for (const [k, v] of Object.entries(filter)) {
      if (!isOperatorObject(v)) setPath(doc, k, v);
    }
    applyUpdate(doc, update, true);
    if (doc._id === undefined) doc._id = new ObjectId();
    this.docs.push(doc);
    return doc as T;
  }
}

/** A `getDb`-compatible fake db that memoizes one {@link FakeCollection} per name. */
export class FakeDb {
  private readonly byName = new Map<string, FakeCollection>();
  collection<T extends Doc = Doc>(name: string): FakeCollection<T> {
    let col = this.byName.get(name);
    if (!col) {
      col = new FakeCollection();
      this.byName.set(name, col);
    }
    return col as FakeCollection<T>;
  }
}

/** Build a fresh, empty fake db. */
export function createFakeDb(): FakeDb {
  return new FakeDb();
}
