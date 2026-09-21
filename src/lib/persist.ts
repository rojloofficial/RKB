import "server-only";

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { getDb } from "./db";

function getStoreFilePath(): string {
  // Serverless environments (Vercel, AWS Lambda) have read-only execution directories (/var/task).
  // os.tmpdir() (/tmp) is the only guaranteed writable filesystem location.
  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.AWS_REGION) ||
    (typeof process.cwd === "function" && process.cwd().startsWith("/var/task"));

  if (isServerless) {
    return path.join(os.tmpdir(), "rojlo_data", "store.json");
  }
  return path.join(process.cwd(), ".data", "store.json");
}

const FILE = getStoreFilePath();
const SEED_FILE = path.join(process.cwd(), ".data", "store.json");

type StoreRecord = {
  _id?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
};

type StoreData = {
  users: StoreRecord[];
  ads: StoreRecord[];
  cities: StoreRecord[];
  states: StoreRecord[];
  citySeo: StoreRecord[];
  upis: StoreRecord[];
  coupons: StoreRecord[];
  cityVipAssignments: StoreRecord[];
  paymentRequests: StoreRecord[];
  paymentHistory: StoreRecord[];
  coinPackages: StoreRecord[];
  promotionPackages?: StoreRecord[];
  promotionPackagesInitialized?: boolean;
  coinPackagesInitialized?: boolean;
  coinPackagesVersion?: number;
  allPackagesCoins?: number;
  deletedCities: string[];
  deletedStates?: string[];
  deletedLocalAreas?: string[];
  admins: StoreRecord[];
  upiRotation: {
    index: number;
    requestCount: number;
  };
  localAreas: StoreRecord[];
  localAreaSeo?: StoreRecord[];
  notFoundLogs: StoreRecord[];
  vipUsers?: StoreRecord[];
  vipPhoneOverrides?: StoreRecord[];
  [key: string]: unknown;
};

function reviveDates(record: StoreRecord) {
  if (record && typeof record.createdAt === "string") {
    record.createdAt = new Date(record.createdAt);
  }
  if (record && typeof record.updatedAt === "string") {
    record.updatedAt = new Date(record.updatedAt);
  }
  return record;
}

function defaults(): StoreData {
  return {
    users: [],
    ads: [],
    cities: [],
    states: [],
    citySeo: [],
    upis: [],
    coupons: [],
    cityVipAssignments: [],
    paymentRequests: [],
    paymentHistory: [],
    coinPackages: [],
    promotionPackages: [],
    promotionPackagesInitialized: false,
    coinPackagesInitialized: false,
    coinPackagesVersion: 2,
    allPackagesCoins: 55,
    deletedCities: [],
    deletedStates: [],
    deletedLocalAreas: [],
    admins: [],
    upiRotation: {
      index: 0,
      requestCount: 0,
    },
    localAreas: [],
    localAreaSeo: [],
    notFoundLogs: [],
    vipUsers: [],
    vipPhoneOverrides: [],
  };
}

function normalize(raw: Partial<StoreData>): StoreData {
  const data: StoreData = {
    ...raw,
    users: raw.users ?? [],
    ads: raw.ads ?? [],
    cities: raw.cities ?? [],
    states: raw.states ?? [],
    citySeo: raw.citySeo ?? [],
    upis: raw.upis ?? [],
    coupons: raw.coupons ?? [],
    cityVipAssignments: raw.cityVipAssignments ?? [],
    paymentRequests: raw.paymentRequests ?? [],
    paymentHistory: raw.paymentHistory ?? [],
    coinPackages: raw.coinPackages ?? [],
    promotionPackages: raw.promotionPackages ?? [],
    promotionPackagesInitialized: raw.promotionPackagesInitialized !== undefined ? Boolean(raw.promotionPackagesInitialized) : ((raw.promotionPackages && raw.promotionPackages.length > 0) ? true : false),
    coinPackagesInitialized: raw.coinPackagesInitialized !== undefined ? Boolean(raw.coinPackagesInitialized) : ((raw.coinPackages && raw.coinPackages.length > 0) ? true : false),
    coinPackagesVersion: raw.coinPackagesVersion !== undefined ? Number(raw.coinPackagesVersion) : 2,
    allPackagesCoins: raw.allPackagesCoins !== undefined && Number(raw.allPackagesCoins) > 0 ? Number(raw.allPackagesCoins) : 55,
    deletedCities: raw.deletedCities ?? [],
    deletedStates: raw.deletedStates ?? [],
    admins: raw.admins ?? [],
    upiRotation: raw.upiRotation ?? {
      index: 0,
      requestCount: 0,
    },
    localAreas: raw.localAreas ?? [],
    notFoundLogs: raw.notFoundLogs ?? [],
    vipUsers: raw.vipUsers ?? [],
    vipPhoneOverrides: raw.vipPhoneOverrides ?? [],
  };
  data.users = data.users.map((user) => ({
    ...user,
    coins: Number((user as StoreRecord & { coins?: number }).coins ?? 0),
  }));
  data.users.forEach(reviveDates);
  data.ads.forEach(reviveDates);
  (data.vipPhoneOverrides ?? []).forEach(reviveDates);
  return data;
}

// ---------- MongoDB (production) ----------

async function readStoreFromMongo(): Promise<StoreData> {
  const db = await getDb();
  if (!db) return defaults();

  try {
    const doc = await db.collection("_store").findOne({ key: "app_state" });
    if (!doc) return defaults();
    const rest: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(doc)) {
      if (k !== "_id" && k !== "key") rest[k] = v;
    }
    return normalize(rest as Partial<StoreData>);
  } catch (err) {
    console.error("[persist] MongoDB readStore failed:", err);
    return defaults();
  }
}

let inFlightMongoWrite: Promise<void> | null = null;
let pendingMongoWriteData: StoreData | null = null;

async function doWriteStoreToMongo(data: StoreData): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[persist] MongoDB not available, write skipped");
    return;
  }

  try {
    const { _id, ...payload } = data as Record<string, unknown> & StoreData;
    void _id;
    await db
      .collection("_store")
      .updateOne(
        { key: "app_state" },
        { $set: payload },
        { upsert: true }
      );
  } catch (err) {
    console.error("[persist] MongoDB writeStore failed:", err);
  }
}

async function writeStoreToMongo(data: StoreData): Promise<void> {
  if (inFlightMongoWrite) {
    // Another write is currently transmitting; queue the latest data
    pendingMongoWriteData = data;
    return inFlightMongoWrite;
  }

  inFlightMongoWrite = (async () => {
    try {
      await doWriteStoreToMongo(data);
      // If another write arrived while this was transmitting, flush the latest snapshot
      if (pendingMongoWriteData) {
        const nextData = pendingMongoWriteData;
        pendingMongoWriteData = null;
        await doWriteStoreToMongo(nextData);
      }
    } finally {
      inFlightMongoWrite = null;
    }
  })();

  return inFlightMongoWrite;
}

// ---------- File (development & serverless /tmp fallback) ----------

async function readStoreFromFile(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return normalize(parsed);
  } catch {
    // If running in serverless (/tmp) and active file doesn't exist yet, try seed file
    if (FILE !== SEED_FILE) {
      try {
        const raw = await fs.readFile(SEED_FILE, "utf8");
        const parsed = JSON.parse(raw) as Partial<StoreData>;
        return normalize(parsed);
      } catch {
        // Fall back to defaults
      }
    }
    return defaults();
  }
}

async function writeStoreToFile(data: StoreData): Promise<void> {
  try {
    const dir = path.dirname(FILE);
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data), "utf8");
    try {
      await fs.rename(tmp, FILE);
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === "EPERM" || nodeErr.code === "EEXIST") {
        await fs.unlink(FILE).catch(() => {});
        await fs.rename(tmp, FILE);
      } else {
        // Direct write fallback
        await fs.writeFile(FILE, JSON.stringify(data), "utf8");
        await fs.unlink(tmp).catch(() => {});
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : "UNKNOWN";

    console.warn("[persist] writeStoreToFile notice (continuing in-memory):", {
      error: message,
      code,
      file: FILE,
    });
    // In serverless environments, never re-throw filesystem write failures.
    // In-memory storeCache is already updated and serves all reads reliably.
  }
}

// In-memory cache for fast repeated reads across requests and server components
let storeCache: { data: StoreData; expiresAt: number } | null = null;
let inFlightReadStorePromise: Promise<StoreData> | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds (mutations immediately update storeCache)

// ---------- Public API ----------

export async function readStore(): Promise<StoreData> {
  const now = Date.now();
  if (storeCache && now < storeCache.expiresAt) {
    return storeCache.data;
  }

  // Deduplicate concurrent in-flight reads across server components / requests
  if (inFlightReadStorePromise) {
    return inFlightReadStorePromise;
  }

  inFlightReadStorePromise = (async () => {
    try {
      const db = await getDb();
      const data = db ? await readStoreFromMongo() : await readStoreFromFile();
      storeCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
      return data;
    } finally {
      inFlightReadStorePromise = null;
    }
  })();

  return inFlightReadStorePromise;
}

export async function writeStore(data: StoreData): Promise<void> {
  // Update cache immediately to guarantee instant consistency on subsequent reads
  storeCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };

  const db = await getDb();
  if (db) {
    await writeStoreToMongo(data);
  }
  // Try writing to file storage (/tmp in serverless or local file in dev),
  // but NEVER throw and crash requests if the underlying filesystem is restricted
  try {
    await writeStoreToFile(data);
  } catch (err) {
    console.warn("[persist] writeStore file write notice:", err);
  }
}

export function invalidateStoreCache(): void {
  storeCache = null;
}
