import { MongoClient, Db } from "mongodb";
import dns from "dns";

// Configure custom DNS once at module initialization for local ISP resolution (e.g. Jio/Airtel SRV lookup).
// Skip on Vercel/cloud where internal AWS/Vercel DNS resolver is faster and already configured.
if (!process.env.VERCEL) {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  } catch {
    // Ignore in restricted environments
  }
}

const uri = process.env.MONGODB_URI?.trim().replace(/^['"]|['"]$/g, "");
const dbName = (process.env.MONGODB_DB || "rojlo")
  .trim()
  .replace(/^['"]|['"]$/g, "");
const retryAfterMs = 5_000;

let resolvedUri: string | null = null;

/**
 * Resolves mongodb+srv:// to direct replica set hosts using public DNS (8.8.8.8, 1.1.1.1)
 * if local ISP/Windows DNS fails with querySrv ECONNREFUSED.
 */
async function getEffectiveMongoUri(baseUri: string): Promise<string> {
  if (resolvedUri) return resolvedUri;
  if (!baseUri.startsWith("mongodb+srv://")) {
    resolvedUri = baseUri;
    return resolvedUri;
  }

  const parsed = baseUri.match(
    /^mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/\?]+)(?:\/([^\?]*))?(?:\?(.*))?$/
  );
  if (!parsed) {
    resolvedUri = baseUri;
    return resolvedUri;
  }

  const [, user, pass, hostname, pathDb, queryStr] = parsed;

  try {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

    const [srvRecords, txtRecords] = await Promise.all([
      resolver.resolveSrv(`_mongodb._tcp.${hostname}`),
      resolver.resolveTxt(hostname).catch(() => []),
    ]);

    if (srvRecords && srvRecords.length > 0) {
      const hostList = srvRecords
        .map((r) => `${r.name}:${r.port}`)
        .join(",");
      const params = new URLSearchParams(queryStr || "");
      params.set("tls", "true");

      if (txtRecords && txtRecords.length > 0) {
        for (const group of txtRecords) {
          const line = Array.isArray(group) ? group.join("") : String(group);
          const search = new URLSearchParams(line);
          search.forEach((v, k) => {
            if (!params.has(k)) {
              params.set(k, v);
            }
          });
        }
      }

      resolvedUri = `mongodb://${user}:${pass}@${hostList}/${pathDb || ""}?${params.toString()}`;
      return resolvedUri;
    }
  } catch (err) {
    console.warn(
      "[db] SRV resolver fallback notice:",
      err instanceof Error ? err.message : String(err)
    );
  }

  resolvedUri = baseUri;
  return resolvedUri;
}

// Validate URI format
if (uri && !uri.startsWith("mongodb+srv://") && !uri.startsWith("mongodb://")) {
  console.error("[db] Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://");
}

interface MongoCache {
  client: MongoClient | null;
  promise: Promise<{ client: MongoClient; db: Db }> | null;
}

declare global {
  var _mongoCache: MongoCache | undefined;
}

const globalCache: MongoCache =
  global._mongoCache ??
  (global._mongoCache = { client: null, promise: null });

let cachedDb: Db | null = null;
let connectionFailed = false;
let lastConnectionFailure: Error | null = null;
let lastConnectionFailureAt = 0;
let warned = false;

export async function getDb(): Promise<Db | null> {
  if (!uri) {
    if (!warned) {
      console.warn(
        "[db] Notice: MONGODB_URI is not configured in environment variables. " +
          "Using resilient in-memory / local store (data remains active)."
      );
      warned = true;
    }
    connectionFailed = true;
    return null;
  }

  if (connectionFailed) {
    if (
      lastConnectionFailure &&
      Date.now() - lastConnectionFailureAt >= retryAfterMs
    ) {
      connectionFailed = false;
      lastConnectionFailure = null;
    } else {
      return null;
    }
  }

  if (cachedDb) return cachedDb;

  if (!globalCache.promise) {
    globalCache.promise = (async () => {
      const isProduction = process.env.NODE_ENV === "production";

      // Helper to attempt connection with a given URI
      async function tryConnect(targetUri: string) {
        const isServerless =
          Boolean(process.env.VERCEL) ||
          Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
          Boolean(process.env.AWS_REGION);

        const client = new MongoClient(targetUri, {
          maxPoolSize: 20,
          minPoolSize: isServerless ? 0 : (isProduction ? 2 : 0),
          maxIdleTimeMS: 60000,
          socketTimeoutMS: 15000,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          tls: true,
        });
        return await client.connect();
      }

      let connectedClient: MongoClient | null = null;

      try {
        // Attempt native URI first
        connectedClient = await tryConnect(uri);
      } catch (nativeErr) {
        const isDnsIssue =
          nativeErr instanceof Error &&
          (nativeErr.message.includes("querySrv") ||
            nativeErr.message.includes("ECONNREFUSED"));

        if (isDnsIssue && uri.startsWith("mongodb+srv://")) {
          // Fall back to resolved SRV URI via public DNS
          const fallbackUri = await getEffectiveMongoUri(uri);
          connectedClient = await tryConnect(fallbackUri);
        } else {
          throw nativeErr;
        }
      }

      console.log("[db] MongoDB connected successfully");
      globalCache.client = connectedClient;
      cachedDb = connectedClient.db(dbName);
      connectionFailed = false;
      lastConnectionFailure = null;
      warned = false;
      return { client: connectedClient, db: cachedDb! };
    })().catch((err) => {
      connectionFailed = true;
      lastConnectionFailure = err instanceof Error ? err : new Error(String(err));
      lastConnectionFailureAt = Date.now();
      globalCache.promise = null;
      resolvedUri = null;

      if (!warned) {
        const isTlsAlert80 =
          err?.message?.includes("SSL alert number 80") ||
          err?.message?.includes("tlsv1 alert internal error");

        if (isTlsAlert80) {
          console.warn(
            "[db] MongoDB Atlas connection was rejected with TLS Alert 80.\n" +
            "👉 ACTION REQUIRED: Your IP address is not whitelisted in MongoDB Atlas.\n" +
            "1. Log in to https://cloud.mongodb.com\n" +
            "2. Navigate to: Security -> Network Access\n" +
            "3. Click '+ Add IP Address' -> Select 'Allow Access from Anywhere' (0.0.0.0/0)\n" +
            "4. Click Confirm. Connection will succeed automatically.\n" +
            "ℹ️ In the meantime, the website is running normally using the local resilient store."
          );
        } else {
          console.warn(
            "[db] MongoDB connection notice: " + (err?.message || "Connection refused") +
            ". Operating normally on local fallback store."
          );
        }
        warned = true;
      }
      return null as unknown as { client: MongoClient; db: Db };
    });
  }

  try {
    const res = await globalCache.promise;
    if (res && res.db) {
      cachedDb = res.db;
      return res.db;
    }
    return null;
  } catch {
    return null;
  }
}

export function isDbAvailable(): boolean {
  return Boolean(uri) && !connectionFailed;
}

