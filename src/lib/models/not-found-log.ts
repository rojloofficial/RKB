import "server-only";

import { Collection, Document, ObjectId } from "mongodb";
import { getDb } from "../db";
import { readStore, writeStore } from "../persist";

export type NotFoundLog = {
  _id?: string;
  path: string;
  hits: number;
  firstSeen: Date | string;
  lastSeen: Date | string;
  referrers?: string[];
  userAgent?: string;
  ip?: string;
  resolved: boolean;
};

let indexesCreated = false;

async function getNotFoundCollection(): Promise<Collection<Document> | null> {
  const db = await getDb();
  if (!db) return null;
  const col = db.collection("not_found_logs");
  if (!indexesCreated) {
    try {
      await col.createIndex({ path: 1 }, { unique: true });
      await col.createIndex({ lastSeen: -1 });
      await col.createIndex({ hits: -1 });
      await col.createIndex({ resolved: 1 });
      indexesCreated = true;
    } catch {
      // Non-fatal
    }
  }
  return col;
}

function normalizePath(rawUrl: string): string {
  if (!rawUrl) return "/";
  try {
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      const parsed = new URL(rawUrl);
      return parsed.pathname + (parsed.search || "");
    }
  } catch {
    // ignore
  }
  return rawUrl.trim().startsWith("/") ? rawUrl.trim() : `/${rawUrl.trim()}`;
}

export async function recordNotFound(
  rawUrl: string,
  referrer?: string,
  userAgent?: string,
  ip?: string
): Promise<void> {
  const path = normalizePath(rawUrl);
  if (!path || path === "/" || path.startsWith("/_next/") || path === "/favicon.ico") {
    return;
  }

  const now = new Date();
  const cleanReferrer = referrer && referrer.trim() ? referrer.trim().slice(0, 500) : undefined;
  const cleanUa = userAgent ? userAgent.trim().slice(0, 300) : undefined;

  const col = await getNotFoundCollection();
  if (col) {
    try {
      await col.updateOne(
        { path },
        {
          $inc: { hits: 1 },
          $set: {
            lastSeen: now,
            ...(cleanUa ? { userAgent: cleanUa } : {}),
            ...(ip ? { ip } : {}),
            resolved: false,
          },
          $setOnInsert: {
            firstSeen: now,
          },
          ...(cleanReferrer ? { $addToSet: { referrers: cleanReferrer } as unknown as Document } : {}),
        },
        { upsert: true }
      );
      return;
    } catch (err) {
      console.error("[not-found-log] MongoDB record failed:", err);
    }
  }

  // Memory/file fallback
  try {
    const store = await readStore();
    const list = (store.notFoundLogs ?? []) as unknown as NotFoundLog[];
    const existing = list.find((item) => item.path === path);

    if (existing) {
      existing.hits = (Number(existing.hits) || 0) + 1;
      existing.lastSeen = now;
      existing.resolved = false;
      if (cleanUa) existing.userAgent = cleanUa;
      if (ip) existing.ip = ip;
      if (cleanReferrer) {
        existing.referrers = Array.from(new Set([...(existing.referrers || []), cleanReferrer])).slice(-10);
      }
    } else {
      list.push({
        _id: `nf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        path,
        hits: 1,
        firstSeen: now,
        lastSeen: now,
        referrers: cleanReferrer ? [cleanReferrer] : [],
        userAgent: cleanUa,
        ip,
        resolved: false,
      });
    }

    store.notFoundLogs = list as unknown as typeof store.notFoundLogs;
    await writeStore(store);
  } catch (err) {
    console.error("[not-found-log] Fallback store record failed:", err);
  }
}

export async function listNotFoundLogs(options?: {
  resolved?: boolean;
  search?: string;
  limit?: number;
}): Promise<NotFoundLog[]> {
  const col = await getNotFoundCollection();
  const limit = options?.limit ?? 200;

  if (col) {
    try {
      const query: Record<string, unknown> = {};
      if (typeof options?.resolved === "boolean") {
        query.resolved = options.resolved;
      }
      if (options?.search && options.search.trim()) {
        const escaped = options.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.path = { $regex: new RegExp(escaped, "i") };
      }

      const docs = await col.find(query).sort({ lastSeen: -1 }).limit(limit).toArray();
      return docs.map((d) => ({
        _id: d._id.toString(),
        path: String(d.path || ""),
        hits: Number(d.hits || 1),
        firstSeen: d.firstSeen instanceof Date ? d.firstSeen.toISOString() : String(d.firstSeen || new Date().toISOString()),
        lastSeen: d.lastSeen instanceof Date ? d.lastSeen.toISOString() : String(d.lastSeen || new Date().toISOString()),
        referrers: Array.isArray(d.referrers) ? d.referrers.map(String) : [],
        userAgent: d.userAgent ? String(d.userAgent) : undefined,
        ip: d.ip ? String(d.ip) : undefined,
        resolved: Boolean(d.resolved),
      }));
    } catch (err) {
      console.error("[not-found-log] MongoDB list failed:", err);
    }
  }

  const store = await readStore();
  let list = (store.notFoundLogs ?? []) as unknown as NotFoundLog[];

  if (typeof options?.resolved === "boolean") {
    list = list.filter((l) => Boolean(l.resolved) === options.resolved);
  }
  if (options?.search && options.search.trim()) {
    const q = options.search.trim().toLowerCase();
    list = list.filter((l) => l.path.toLowerCase().includes(q));
  }

  return list
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
    .slice(0, limit);
}

export async function toggleNotFoundResolved(
  id: string,
  resolved: boolean
): Promise<boolean> {
  const col = await getNotFoundCollection();
  if (col) {
    try {
      const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id as unknown as ObjectId };
      const res = await col.updateOne(query, { $set: { resolved } });
      if (res.matchedCount > 0) return true;
    } catch (err) {
      console.error("[not-found-log] MongoDB toggleResolved failed:", err);
    }
  }

  const store = await readStore();
  const list = (store.notFoundLogs ?? []) as unknown as NotFoundLog[];
  const item = list.find((l) => l._id === id);
  if (!item) return false;
  item.resolved = resolved;
  store.notFoundLogs = list as unknown as typeof store.notFoundLogs;
  await writeStore(store);
  return true;
}

export async function deleteNotFoundLog(id: string): Promise<boolean> {
  const col = await getNotFoundCollection();
  if (col) {
    try {
      const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id as unknown as ObjectId };
      const res = await col.deleteOne(query);
      if (res.deletedCount > 0) return true;
    } catch (err) {
      console.error("[not-found-log] MongoDB delete failed:", err);
    }
  }

  const store = await readStore();
  const list = (store.notFoundLogs ?? []) as unknown as NotFoundLog[];
  const idx = list.findIndex((l) => l._id === id);
  if (idx < 0) return false;
  list.splice(idx, 1);
  store.notFoundLogs = list as unknown as typeof store.notFoundLogs;
  await writeStore(store);
  return true;
}

export async function clearNotFoundLogs(): Promise<boolean> {
  const col = await getNotFoundCollection();
  if (col) {
    try {
      await col.deleteMany({});
    } catch (err) {
      console.error("[not-found-log] MongoDB clear failed:", err);
    }
  }

  const store = await readStore();
  store.notFoundLogs = [];
  await writeStore(store);
  return true;
}
