import type { Document } from "mongodb";
import { getDb } from "@/lib/db";
import { readStore, writeStore, invalidateStoreCache } from "@/lib/persist";
import {
  type CoinPackage,
  DEFAULT_PACKAGES,
} from "@/lib/coin-packages";
import { LRUCache } from "@/lib/lru-cache";

export type { CoinPackage };
export { DEFAULT_PACKAGES };

const coinPackagesLru = new LRUCache<string, CoinPackage[]>(10, 60_000);

export function invalidateCoinPackagesCache(): void {
  coinPackagesLru.clear();
}

export async function getCoinPackages(): Promise<CoinPackage[]> {
  const cached = coinPackagesLru.get("all");
  if (cached) return cached;

  const db = await getDb();
  if (db) {
    try {
      const docs = await db.collection("coin_packages").find({}).toArray();
      if (docs && docs.length > 0) {
        const list: CoinPackage[] = docs.map((doc) => ({
          _id: doc._id?.toString(),
          coins: Number(doc.coins || 0),
          price: Number(doc.price || 0),
          originalPrice: doc.originalPrice ? Number(doc.originalPrice) : undefined,
          breakdown: typeof doc.breakdown === "string" ? doc.breakdown : "",
          discount: typeof doc.discount === "string" ? doc.discount : "",
          label: typeof doc.label === "string" ? doc.label : "",
          popular: Boolean(doc.popular),
          createdAt: doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt || Date.now()),
          updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : new Date(doc.updatedAt || Date.now()),
        }));
        const sorted = list.sort((a, b) => Number(a.coins) - Number(b.coins));
        coinPackagesLru.set("all", sorted);
        return sorted;
      }
    } catch (err) {
      console.error("[coin-package] MongoDB fetch failed:", err);
    }
  }

  const store = await readStore();
  const packages = (store.coinPackages ?? []) as CoinPackage[];

  if (Array.isArray(packages) && packages.length > 0) {
    const list = [...packages].sort((a, b) => Number(a.coins) - Number(b.coins));
    if (db) {
      try {
        await db.collection("coin_packages").deleteMany({});
        await db.collection("coin_packages").insertMany(list.map(({ _id, ...p }) => { void _id; return p as Document; }));
      } catch {}
    }
    coinPackagesLru.set("all", list);
    return list;
  }

  // Initial seeding on fresh setup
  const seeded = DEFAULT_PACKAGES.map((pkg, index) => ({
    _id: `coin-package-${index + 1}`,
    ...pkg,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  if (db) {
    try {
      await db.collection("coin_packages").deleteMany({});
      await db.collection("coin_packages").insertMany(seeded.map(({ _id, ...p }) => { void _id; return p as Document; }));
    } catch {}
  }

  store.coinPackages = seeded;
  store.coinPackagesInitialized = true;
  store.coinPackagesVersion = 2;
  await writeStore(store);

  coinPackagesLru.set("all", seeded);
  return seeded;
}

export async function saveCoinPackages(
  packages: Array<{
    _id?: string;
    coins: number;
    price: number;
    originalPrice?: number;
    breakdown?: string;
    discount?: string;
    label?: string;
    popular?: boolean;
  }>
): Promise<CoinPackage[]> {
  const cleaned: CoinPackage[] = packages
    .filter((pkg) => pkg && Number(pkg.coins) > 0 && Number(pkg.price) >= 0)
    .map((pkg, idx) => ({
      _id: pkg._id && !pkg._id.startsWith("pkg-")
        ? String(pkg._id)
        : `coin-package-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      coins: Number(pkg.coins),
      price: Number(pkg.price),
      originalPrice:
        pkg.originalPrice && Number(pkg.originalPrice) > 0
          ? Number(pkg.originalPrice)
          : undefined,
      breakdown: typeof pkg.breakdown === "string" ? pkg.breakdown.trim() : "",
      discount: typeof pkg.discount === "string" ? pkg.discount.trim() : "",
      label: typeof pkg.label === "string" ? pkg.label.trim() : "",
      popular: Boolean(pkg.popular),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

  const db = await getDb();
  if (db) {
    try {
      const col = db.collection("coin_packages");
      await col.deleteMany({});
      if (cleaned.length > 0) {
        await col.insertMany(cleaned.map(({ _id, ...p }) => { void _id; return p as Document; }));
      }
    } catch (err) {
      console.error("[coin-package] MongoDB write failed:", err);
    }
  }

  const store = await readStore();
  store.coinPackages = cleaned;
  store.coinPackagesInitialized = true;
  store.coinPackagesVersion = 2;

  await writeStore(store);
  invalidateStoreCache();
  invalidateCoinPackagesCache();

  return [...cleaned].sort((a, b) => Number(a.coins) - Number(b.coins));
}

export async function getAllPackagesCoins(): Promise<number> {
  const db = await getDb();
  if (db) {
    try {
      const doc = await db.collection("settings").findOne({ key: "all_packages_coins" });
      if (doc && typeof doc.value === "number" && doc.value > 0) {
        return Math.round(doc.value);
      }
    } catch (err) {
      console.error("[coin-package] MongoDB settings read failed:", err);
    }
  }

  const store = await readStore();
  const raw = Number((store as Record<string, unknown>).allPackagesCoins);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 55;
}

export async function saveAllPackagesCoins(coins: number): Promise<number> {
  const val = Math.max(1, Math.round(Number(coins) || 55));
  const db = await getDb();
  if (db) {
    try {
      await db.collection("settings").updateOne(
        { key: "all_packages_coins" },
        { $set: { key: "all_packages_coins", value: val, updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      console.error("[coin-package] MongoDB settings write failed:", err);
    }
  }

  const store = await readStore();
  (store as Record<string, unknown>).allPackagesCoins = val;
  await writeStore(store);
  invalidateStoreCache();
  return val;
}

