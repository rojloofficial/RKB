import type { Document } from "mongodb";
import { getDb } from "@/lib/db";
import { readStore, writeStore, invalidateStoreCache } from "@/lib/persist";
import {
  type PromotionPackage,
  DEFAULT_PROMO_PACKAGES,
} from "@/lib/promotion-packages";
import { normalizeTier, TIER_RANK_MAP, type PromoTier } from "@/lib/promo-shifts";
import { LRUCache } from "@/lib/lru-cache";

export type { PromotionPackage };
export { DEFAULT_PROMO_PACKAGES };

const promoPackagesLru = new LRUCache<string, PromotionPackage[]>(10, 60_000);

export function invalidatePromoPackagesCache(): void {
  promoPackagesLru.clear();
}

function normalizePackage(pkg: Partial<PromotionPackage>, index = 0): PromotionPackage {
  const tier: PromoTier = normalizeTier(pkg.tier, `${pkg.id || ""} ${pkg.title || ""}`);
  const rankInfo = TIER_RANK_MAP[tier] || TIER_RANK_MAP.bronze;

  let durationHours = Number(pkg.durationHours || 0);
  let durationDays = Number(pkg.durationDays || 0);

  if (!durationHours && durationDays) {
    durationHours = Math.round(durationDays * 24);
  } else if (!durationHours) {
    durationHours = 24;
    durationDays = 1;
  }

  if (!durationDays && durationHours) {
    durationDays = durationHours / 24;
  }

  return {
    _id: pkg._id || `promo-pkg-${index + 1}`,
    id: pkg.id || `promo-${tier}-${index + 1}`,
    title: pkg.title || rankInfo.title,
    tier,
    rankRange: pkg.rankRange || rankInfo.rankRange,
    durationDays: durationDays > 0 ? durationDays : 1,
    durationHours: durationHours > 0 ? durationHours : 24,
    coinsCost: Math.max(0, Math.round(Number(pkg.coinsCost || 0))),
    tag: typeof pkg.tag === "string" ? pkg.tag.trim() : "",
    highlight: Boolean(pkg.highlight),
    features: Array.isArray(pkg.features)
      ? pkg.features.map((f) => String(f).trim()).filter(Boolean)
      : [],
    createdAt: pkg.createdAt || new Date(),
    updatedAt: pkg.updatedAt || new Date(),
  };
}

export async function getPromotionPackages(): Promise<PromotionPackage[]> {
  const cached = promoPackagesLru.get("all");
  if (cached) return cached;

  const db = await getDb();
  if (db) {
    try {
      const docs = await db.collection("promotion_packages").find({}).toArray();
      if (docs && docs.length > 0) {
        const list = docs.map((doc, idx) =>
          normalizePackage(
            {
              ...doc,
              _id: doc._id?.toString(),
            } as Partial<PromotionPackage>,
            idx
          )
        );
        promoPackagesLru.set("all", list);
        return list;
      }
    } catch (err) {
      console.error("[promotion-package] MongoDB fetch failed:", err);
    }
  }

  const store = await readStore();
  const rawPackages = ((store.promotionPackages ?? []) as unknown) as Partial<PromotionPackage>[];

  if (Array.isArray(rawPackages) && rawPackages.length > 0) {
    const list = rawPackages.map((pkg, idx) => normalizePackage(pkg, idx));
    if (db) {
      try {
        await db.collection("promotion_packages").deleteMany({});
        await db.collection("promotion_packages").insertMany(list.map(({ _id, ...p }) => { void _id; return p as Document; }));
      } catch {}
    }
    promoPackagesLru.set("all", list);
    return list;
  }

  // Initial seeding on fresh database or re-seed
  const seeded: PromotionPackage[] = DEFAULT_PROMO_PACKAGES.map((pkg, index) => ({
    _id: `promo-package-${index + 1}`,
    ...pkg,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  if (db) {
    try {
      await db.collection("promotion_packages").deleteMany({});
      await db.collection("promotion_packages").insertMany(seeded.map(({ _id, ...p }) => { void _id; return p as Document; }));
    } catch {}
  }

  store.promotionPackages = (seeded as unknown) as typeof store.promotionPackages;
  store.promotionPackagesInitialized = true;
  await writeStore(store);

  promoPackagesLru.set("all", seeded);
  return seeded;
}

export async function savePromotionPackages(
  packages: Array<{
    _id?: string;
    id?: string;
    title: string;
    tier?: string;
    rankRange?: string;
    durationDays?: number;
    durationHours?: number;
    coinsCost: number;
    tag?: string;
    highlight?: boolean;
    features?: string[];
  }>
): Promise<PromotionPackage[]> {
  const cleaned: PromotionPackage[] = packages
    .filter(
      (pkg) =>
        pkg &&
        typeof pkg.title === "string" &&
        pkg.title.trim().length > 0 &&
        (Number(pkg.durationDays) > 0 || Number(pkg.durationHours) > 0) &&
        Number(pkg.coinsCost) >= 0
    )
    .map((pkg, idx) => {
      const tier = normalizeTier(pkg.tier, `${pkg.id || ""} ${pkg.title || ""}`);
      const rankInfo = TIER_RANK_MAP[tier] || TIER_RANK_MAP.bronze;

      let durationHours = Number(pkg.durationHours || 0);
      let durationDays = Number(pkg.durationDays || 0);

      if (durationHours > 0 && !durationDays) {
        durationDays = durationHours / 24;
      } else if (durationDays > 0 && !durationHours) {
        durationHours = Math.round(durationDays * 24);
      } else if (!durationHours && !durationDays) {
        durationHours = tier === "bronze" ? 12 : 24;
        durationDays = durationHours / 24;
      }

      const generatedId =
        pkg.id && pkg.id.trim()
          ? pkg.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-")
          : `promo-${tier}-${idx + 1}`;

      return {
        _id:
          pkg._id && !pkg._id.startsWith("pkg-")
            ? String(pkg._id)
            : `promo-package-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        id: generatedId,
        title: pkg.title.trim(),
        tier,
        rankRange: pkg.rankRange?.trim() || rankInfo.rankRange,
        durationDays,
        durationHours,
        coinsCost: Math.max(0, Math.round(Number(pkg.coinsCost))),
        tag: typeof pkg.tag === "string" ? pkg.tag.trim() : "",
        highlight: Boolean(pkg.highlight),
        features: Array.isArray(pkg.features)
          ? pkg.features.map((f) => String(f).trim()).filter(Boolean)
          : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

  const db = await getDb();
  if (db) {
    try {
      const col = db.collection("promotion_packages");
      await col.deleteMany({});
      if (cleaned.length > 0) {
        await col.insertMany(cleaned.map(({ _id, ...p }) => { void _id; return p as Document; }));
      }
    } catch (err) {
      console.error("[promotion-package] MongoDB write failed:", err);
    }
  }

  const store = await readStore();
  store.promotionPackages = (cleaned as unknown) as typeof store.promotionPackages;
  store.promotionPackagesInitialized = true;

  await writeStore(store);
  invalidateStoreCache();
  invalidatePromoPackagesCache();

  return [...cleaned];
}
