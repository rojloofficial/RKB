import "server-only";
import { getDb } from "./db";

// Dual-tier rate limiter:
// Tier 1 (L1): Fast in-memory sliding-window bucket (zero network overhead, instant burst protection)
// Tier 2 (L2): MongoDB atomic collection with TTL index (distributed across all serverless lambda instances)
//
// Keyed by IP or scope key (e.g. `start-register:192.168.1.1`).

interface Bucket {
  timestamps: number[];
}

const memoryBuckets = new Map<string, Bucket>();
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

let rateIndexCreated = false;

async function getRateLimitsCollection() {
  const db = await getDb();
  if (!db) return null;
  const col = db.collection("rate_limits");
  if (!rateIndexCreated) {
    try {
      await col.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
      rateIndexCreated = true;
    } catch {
      // Non-fatal: index may already exist
    }
  }
  return col;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = WINDOW_MS
): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  let bucket = memoryBuckets.get(key);

  if (!bucket) {
    bucket = { timestamps: [] };
    memoryBuckets.set(key, bucket);
  }

  // Drop timestamps outside the window.
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    return { ok: false, remaining: 0, retryAfterMs };
  }

  bucket.timestamps.push(now);

  // Prevent unbounded growth of the map
  if (memoryBuckets.size > 10000) {
    const now2 = Date.now();
    for (const [k, v] of memoryBuckets) {
      v.timestamps = v.timestamps.filter((t) => now2 - t < windowMs);
      if (v.timestamps.length === 0) memoryBuckets.delete(k);
    }
  }

  return { ok: true, remaining: limit - bucket.timestamps.length, retryAfterMs: 0 };
}

/**
 * Distributed rate limiter across all serverless instances using MongoDB + in-memory L1 cache.
 */
export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs = WINDOW_MS
): Promise<{ ok: boolean; remaining: number; retryAfterMs: number }> {
  // L1 Fast Path: If in-memory already exceeds limit, reject immediately with 0 DB latency.
  const l1 = checkRateLimit(key, limit, windowMs);
  if (!l1.ok) {
    return l1;
  }

  try {
    const col = await getRateLimitsCollection();
    if (!col) {
      return l1; // Degrade gracefully to in-memory
    }

    const now = new Date();
    const expireAt = new Date(now.getTime() + windowMs);

    // Atomic increment or insert
    const result = await col.findOneAndUpdate(
      { _id: key as unknown as import("mongodb").ObjectId },
      {
        $inc: { count: 1 },
        $setOnInsert: { createdAt: now, expireAt },
      },
      { upsert: true, returnDocument: "after" }
    );

    const doc = result as unknown as { count?: number; expireAt?: Date } | null;
    const currentCount = Number(doc?.count ?? 1);

    if (currentCount > limit) {
      const docExpiry = doc?.expireAt ? new Date(doc.expireAt).getTime() : expireAt.getTime();
      const retryAfterMs = Math.max(0, docExpiry - Date.now());
      return { ok: false, remaining: 0, retryAfterMs };
    }

    return {
      ok: true,
      remaining: Math.max(0, limit - currentCount),
      retryAfterMs: 0,
    };
  } catch (err) {
    console.error("[rate-limit] Distributed check error, falling back to L1:", err);
    return l1;
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

