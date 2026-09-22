import { cache } from "react";
import { Collection, Document, ObjectId } from "mongodb";
import { getDb } from "../db";
import { readStore, writeStore } from "../persist";
import type { ServiceRate } from "@/components/post-ad/types";
import { getActiveVipPhoneOverride, VipPhoneOverride } from "./vip";
import { sortAdsWithPromotions, isAdPromotionActive } from "../promo-shifts";
import { LRUCache } from "../lru-cache";

export interface Ad {
  _id?: string;
  userId: string;
  name: string;
  title?: string;
  age?: string;
  category: string;
  toServe?: string[];
  placeOfService?: string[];
  state?: string;
  city: string;
  pincode?: string;
  localArea?: string;
  phone: string;
  whatsapp?: string;
  telegram?: string;
  about: string;
  images: string[];
  status: string;
  serviceRates?: ServiceRate[];
  promoted?: boolean;
  isPromoted?: boolean;
  promotedFrom?: Date | string;
  promotedUntil?: Date | string;
  promoPackage?: string;
  promoTier?: string;
  promoShift?: string;
  isFreeAd?: boolean;
  isVisibleOnCityPage?: boolean;
  requiresPromotion?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicAd = Omit<Ad, never>;

const publicAdLruCache = new LRUCache<string, PublicAd | null>(300, 30_000);
const cityAdsLruCache = new LRUCache<string, PublicAd[]>(100, 15_000);

export function invalidateAdCaches(): void {
  publicAdLruCache.clear();
  cityAdsLruCache.clear();
  invalidateAdCountsCache();
}

// --- File-backed fallback (used when MongoDB is unreachable) ---
async function memoryListByUser(userId: string): Promise<Ad[]> {
  const store = await readStore();
  return store.ads
    .filter((ad) => ad.userId === userId)
    .sort(
      (a, b) =>
        (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime()
    ) as unknown as Ad[];
}

async function memoryFindById(id: string): Promise<Ad | null> {
  const store = await readStore();
  return (store.ads.find((ad) => ad._id === id) as unknown as Ad) ?? null;
}

function buildAdIdCandidates(id: string): Array<string | ObjectId> {
  const trimmed = id.trim();
  const candidates: Array<string | ObjectId> = [trimmed];
  if (ObjectId.isValid(trimmed)) {
    candidates.unshift(new ObjectId(trimmed));
  }
  return candidates;
}

type MongoQuery = Record<string, unknown>;

async function collectionFindById(
  collection: Collection<Document>,
  id: string
): Promise<Ad | null> {
  const candidates = buildAdIdCandidates(id);
  const doc = await collection.findOne({ _id: { $in: candidates } } as MongoQuery);
  return (doc as unknown as Ad) ?? null;
}

async function collectionListByUser(userId: string): Promise<Ad[]> {
  const collection = await getAdsCollection();
  if (!collection) return [];

  const docs = await collection
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(150)
    .toArray();
  return docs.map((doc) => doc as unknown as Ad);
}

async function collectionListByCity(city: string): Promise<Ad[]> {
  const collection = await getAdsCollection();
  if (!collection) return [];

  const escaped = city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const c = city.trim();
  const titleCased = c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
  const variations = Array.from(new Set([c, c.toLowerCase(), c.toUpperCase(), titleCased]));

  const docs = await collection
    .find({
      $or: [
        { city: { $in: variations } },
        { city: { $regex: new RegExp(`^${escaped}$`, "i") } },
      ],
      status: { $nin: ["deleted", "suspended"] },
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return docs.map((doc) => doc as unknown as Ad);
}

function isVisibleAd(ad: Ad): boolean {
  const status = ad.status ?? "active";
  return status !== "deleted" && status !== "suspended";
}

function mergeAds(...groups: Ad[][]): Ad[] {
  const merged = new Map<string, Ad>();

  for (const group of groups) {
    for (const ad of group) {
      if (!ad._id) continue;
      if (!isVisibleAd(ad)) continue;
      merged.set(ad._id, ad);
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function memoryUpsert(ad: Ad): Promise<Ad> {
  const store = await readStore();
  if (!ad._id) {
    ad._id = `mem_ad_${store.ads.length + 1}_${Date.now()}`;
  }
  const index = store.ads.findIndex((a) => a._id === ad._id);
  if (index >= 0) store.ads[index] = ad as unknown as (typeof store.ads)[number];
  else store.ads.push(ad as unknown as (typeof store.ads)[number]);
  await writeStore(store);
  return ad;
}

async function memoryDelete(id: string, userId: string): Promise<boolean> {
  const store = await readStore();
  const index = store.ads.findIndex((a) => a._id === id && a.userId === userId);
  if (index < 0) return false;
  store.ads.splice(index, 1);
  await writeStore(store);
  return true;
}

let adIndexesCreated = false;

async function getAdsCollection(): Promise<Collection<Document> | null> {
  const db = await getDb();
  if (!db) return null;

  const collection = db.collection("ads");
  if (!adIndexesCreated) {
    adIndexesCreated = true;
    collection
      .createIndexes([
        { key: { userId: 1 }, name: "user_idx" },
        { key: { userId: 1, _id: 1 }, name: "user_ad_idx" },
        { key: { city: 1, status: 1, createdAt: -1 }, name: "city_status_created_idx" },
        { key: { city: 1, localArea: 1, status: 1 }, name: "city_localArea_status_idx" },
        { key: { status: 1, createdAt: -1 }, name: "status_created_idx" },
      ])
      .catch(() => {});
  }
  return collection;
}

/**
 * For a given list of user IDs, determine each user's single free ad ID.
 * A user's free ad is their earliest created active (non-deleted, non-suspended) ad
 * that is NOT actively promoted.
 */
export async function getFreeAdIdsForUsers(userIds: string[]): Promise<Set<string>> {
  const cleanIds = Array.from(new Set(userIds.map((id) => String(id).trim()).filter(Boolean)));
  if (cleanIds.length === 0) return new Set();

  const freeAdIds = new Set<string>();
  const collection = await getAdsCollection();
  const now = new Date();

  // 1. Check MongoDB
  let allAds: Ad[] = [];
  if (collection) {
    try {
      const results = await collection
        .find(
          {
            userId: { $in: cleanIds },
            status: { $nin: ["deleted", "suspended"] },
          },
          {
            projection: {
              _id: 1,
              userId: 1,
              status: 1,
              createdAt: 1,
              promoted: 1,
              isPromoted: 1,
              promotedUntil: 1,
              promoShift: 1,
              promoPackage: 1,
              promoTier: 1,
            },
          }
        )
        .sort({ createdAt: 1 })
        .toArray();
      allAds = results.map((d) => d as unknown as Ad);
    } catch (err) {
      console.error("[ad] getFreeAdIdsForUsers find failed:", err);
    }
  }

  // 2. Memory store ads fallback only if collection unavailable or empty
  if (allAds.length === 0 && !collection) {
    const store = await readStore();
    allAds = (store.ads ?? [])
      .filter(
        (ad) =>
          cleanIds.includes(String(ad.userId ?? "")) &&
          (ad.status ?? "active") !== "deleted" &&
          ad.status !== "suspended"
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt as string | Date).getTime() -
          new Date(b.createdAt as string | Date).getTime()
      ) as unknown as Ad[];
  }

  const seenUsers = new Set<string>();
  for (const ad of allAds) {
    if (!ad._id || !ad.userId) continue;
    const uid = String(ad.userId);
    if (seenUsers.has(uid)) continue;

    // Check if this ad has an active promotion
    const hasActivePromotion = isAdPromotionActive(ad, now);
    if (!hasActivePromotion) {
      // The earliest active unpromoted ad gets the 1 free ad slot!
      freeAdIds.add(String(ad._id));
      seenUsers.add(uid);
    }
  }

  return freeAdIds;
}

export const getUserFreeAdId = cache(async function (userId: string): Promise<string | null> {
  const freeSet = await getFreeAdIdsForUsers([userId]);
  const first = Array.from(freeSet)[0];
  return first ?? null;
});

export async function filterVisibleCityAds(ads: Ad[]): Promise<Ad[]> {
  const unpromotedCandidates = ads.filter((ad) => !isAdPromotionActive(ad));
  const userIds = Array.from(
    new Set(unpromotedCandidates.map((a) => String(a.userId || "")).filter(Boolean))
  );
  const freeAdIds = await getFreeAdIdsForUsers(userIds);

  return ads.filter((ad) => {
    // If actively promoted, always visible in city listings
    if (isAdPromotionActive(ad)) return true;
    // For unpromoted ads: only the user's 1 designated free ad is visible
    if (!ad._id) return false;
    return freeAdIds.has(String(ad._id));
  });
}

export const isAdVisiblePublicly = cache(async function (ad: Ad): Promise<boolean> {
  if (!ad._id) return false;
  const status = ad.status ?? "active";
  if (status === "deleted" || status === "suspended") {
    return false;
  }
  if (isAdPromotionActive(ad)) {
    return true;
  }
  const freeAdId = await getUserFreeAdId(ad.userId);
  return Boolean(freeAdId && String(freeAdId) === String(ad._id));
});

export async function listAds(userId: string): Promise<PublicAd[]> {
  const collection = await getAdsCollection();
  let allUserAds: Ad[] = [];
  if (!collection) {
    allUserAds = await memoryListByUser(userId);
  } else {
    allUserAds = await collectionListByUser(userId);
  }

  // Determine user's single free ad ID
  const freeAdId = await getUserFreeAdId(userId);

  return allUserAds.map((a) => {
    const isPromoted = isAdPromotionActive(a);
    const isFreeAd = Boolean(a._id && freeAdId && String(a._id) === String(freeAdId));
    const isDeletedOrSuspended =
      (a.status ?? "active") === "deleted" || a.status === "suspended";
    const isVisibleOnCityPage =
      !isDeletedOrSuspended && (isPromoted || isFreeAd);
    const requiresPromotion =
      !isDeletedOrSuspended && !isPromoted && !isFreeAd;

    return toPublicAd({
      ...a,
      isFreeAd,
      isVisibleOnCityPage,
      requiresPromotion,
    });
  });
}

export async function listAdsByCity(city: string): Promise<PublicAd[]> {
  const cityKey = city.trim().toLowerCase();
  const cached = cityAdsLruCache.get(cityKey);
  if (cached) return cached;

  const [collection, override] = await Promise.all([
    getAdsCollection(),
    getActiveVipPhoneOverride(city),
  ]);

  if (!collection) {
    const store = await readStore();
    const normalized = cityKey;
    const memoryAds = store.ads
      .filter(
        (ad) =>
          isVisibleAd(ad as unknown as Ad) &&
          String(ad.city ?? "").trim().toLowerCase() === normalized
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt as string | Date).getTime() -
          new Date(a.createdAt as string | Date).getTime()
      ) as unknown as Ad[];
    const visibleMemoryAds = await filterVisibleCityAds(memoryAds);
    const sortedMemoryAds = sortAdsWithPromotions(visibleMemoryAds);
    const result = sortedMemoryAds.map((a) => toPublicAd(a, override));
    cityAdsLruCache.set(cityKey, result);
    return result;
  }

  const docs = await collectionListByCity(city);
  const visibleAds = await filterVisibleCityAds(docs);
  const sorted = sortAdsWithPromotions(visibleAds);
  const result = sorted.map((a) => toPublicAd(a, override));
  cityAdsLruCache.set(cityKey, result);
  return result;
}

export async function listAdsByCityAndLocalArea(
  cityName: string,
  localAreaName: string
): Promise<PublicAd[]> {
  const cityAds = await listAdsByCity(cityName);
  const normArea = localAreaName.trim().toLowerCase();
  const areaSlug = normArea.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Match ads specifically designated for this local area or mentioning it
  const matching = cityAds.filter((ad) => {
    const adArea = (ad.localArea ?? "").trim().toLowerCase();
    const adAreaSlug = adArea.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (adArea && (adArea === normArea || adAreaSlug === areaSlug)) return true;

    const aboutText = (ad.about ?? "").toLowerCase();
    const nameText = (ad.name ?? "").toLowerCase();
    return aboutText.includes(normArea) || nameText.includes(normArea);
  });

  return matching;
}


export const listRelatedCityAds = cache(async function (
  city: string,
  excludeId: string,
  limit = 6
): Promise<PublicAd[]> {
  const [collection, override] = await Promise.all([
    getAdsCollection(),
    getActiveVipPhoneOverride(city),
  ]);

  if (collection) {
    try {
      const c = city.trim();
      const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const titleCased = c.charAt(0).toUpperCase() + c.slice(1).toLowerCase();
      const variations = Array.from(new Set([c, c.toLowerCase(), c.toUpperCase(), titleCased]));

      const excludeCandidates = buildAdIdCandidates(excludeId);
      const docs = await collection
        .find({
          $and: [
            {
              $or: [
                { city: { $in: variations } },
                { city: { $regex: new RegExp(`^${escaped}$`, "i") } },
              ],
            },
            { _id: { $nin: excludeCandidates as import("mongodb").ObjectId[] } },
            { status: { $nin: ["deleted", "suspended"] } },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(limit * 2)
        .toArray();

      const visibleAds = await filterVisibleCityAds(docs.map((d) => d as unknown as Ad));
      const sorted = sortAdsWithPromotions(visibleAds);
      return sorted.slice(0, limit).map((a) => toPublicAd(a, override));
    } catch (err) {
      console.error("[ad] listRelatedCityAds find failed:", err);
    }
  }

  // Memory fallback
  const allCityAds = await listAdsByCity(city);
  return allCityAds.filter((p) => p._id && p._id !== excludeId).slice(0, limit);
});

export async function getAdById(
  id: string,
  userId: string
): Promise<Ad | null> {
  const collection = await getAdsCollection();
  if (!collection) {
    const ad = await memoryFindById(id);
    return ad && ad.userId === userId ? ad : null;
  }

  const candidates = buildAdIdCandidates(id);
  const doc = await collection.findOne({ _id: { $in: candidates }, userId } as MongoQuery);
  if (doc) return doc as unknown as Ad;

  const ad = await memoryFindById(id);
  return ad && ad.userId === userId ? ad : null;
}

let adCountsCache: { counts: Record<string, number>; expiresAt: number } | null = null;
let inFlightAdCountsPromise: Promise<Record<string, number>> | null = null;
const AD_COUNTS_CACHE_TTL_MS = 60_000;

export function invalidateAdCountsCache(): void {
  adCountsCache = null;
}

export async function getAdCountsByCity(): Promise<Record<string, number>> {
  const now = Date.now();
  if (adCountsCache && now < adCountsCache.expiresAt) {
    return adCountsCache.counts;
  }

  if (inFlightAdCountsPromise) {
    return inFlightAdCountsPromise;
  }

  inFlightAdCountsPromise = (async () => {
    try {
      const collection = await getAdsCollection();
      const counts: Record<string, number> = {};

      let allAds: Ad[] = [];
      if (collection) {
        try {
          const docs = await collection
            .find(
              { status: { $nin: ["deleted", "suspended"] } },
              {
                projection: {
                  _id: 1,
                  userId: 1,
                  city: 1,
                  status: 1,
                  createdAt: 1,
                  promoted: 1,
                  isPromoted: 1,
                  promotedUntil: 1,
                  promoShift: 1,
                  promoPackage: 1,
                  promoTier: 1,
                },
              }
            )
            .toArray();
          allAds = docs.map((d) => d as unknown as Ad);
        } catch (err) {
          console.error("[ad] getAdCountsByCity find failed:", err);
        }
      }

      const store = await readStore();
      const memoryAds = (store.ads ?? []).filter((ad) => isVisibleAd(ad as unknown as Ad)) as unknown as Ad[];
      const merged = mergeAds(allAds, memoryAds);

      // Compute free ads in-memory from merged without an extra DB round-trip
      const nowDate = new Date();
      const userAdsMap = new Map<string, Ad[]>();
      for (const ad of merged) {
        if (!ad.userId) continue;
        const uid = String(ad.userId);
        let list = userAdsMap.get(uid);
        if (!list) {
          list = [];
          userAdsMap.set(uid, list);
        }
        list.push(ad);
      }

      const freeAdIds = new Set<string>();
      for (const list of userAdsMap.values()) {
        list.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        for (const ad of list) {
          if (!isAdPromotionActive(ad, nowDate)) {
            if (ad._id) freeAdIds.add(String(ad._id));
            break;
          }
        }
      }

      for (const ad of merged) {
        if (!ad.city || !ad._id) continue;
        const isPromoted = isAdPromotionActive(ad, nowDate);
        const isFree = freeAdIds.has(String(ad._id));
        if (isPromoted || isFree) {
          const key = String(ad.city).trim().toLowerCase();
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }

      adCountsCache = { counts, expiresAt: Date.now() + AD_COUNTS_CACHE_TTL_MS };
      return counts;
    } finally {
      inFlightAdCountsPromise = null;
    }
  })();

  return inFlightAdCountsPromise;
}

export type CityPhoneStats = {
  totalAds: number;
  totalPhones: number;
  uniquePhones: number;
};

export async function getCityPhoneStats(): Promise<Record<string, CityPhoneStats>> {
  const collection = await getAdsCollection();
  const stats: Record<string, CityPhoneStats> = {};

  if (collection) {
    try {
      const results = await collection
        .aggregate([
          { $match: { status: { $ne: "deleted" } } },
          {
            $group: {
              _id: { $toLower: "$city" },
              totalAds: { $sum: 1 },
              phoneList: { $push: "$phone" },
            },
          },
        ])
        .toArray();

      for (const item of results) {
        if (item._id) {
          const key = String(item._id).trim().toLowerCase();
          const phones = (Array.isArray(item.phoneList) ? item.phoneList : [])
            .map((p) => String(p ?? "").trim())
            .filter(Boolean);
          const uniqueSet = new Set(phones);
          stats[key] = {
            totalAds: Number(item.totalAds ?? 0),
            totalPhones: phones.length,
            uniquePhones: uniqueSet.size,
          };
        }
      }
      return stats;
    } catch (err) {
      console.error("[ad] getCityPhoneStats aggregation failed:", err);
    }
  }

  const store = await readStore();
  const memoryPhonesByCity: Record<string, string[]> = {};
  const memoryAdsCount: Record<string, number> = {};

  for (const ad of store.ads) {
    if (isVisibleAd(ad as unknown as Ad) && ad.city) {
      const key = String(ad.city).trim().toLowerCase();
      memoryAdsCount[key] = (memoryAdsCount[key] ?? 0) + 1;
      if (!memoryPhonesByCity[key]) memoryPhonesByCity[key] = [];
      if (ad.phone && String(ad.phone).trim()) {
        memoryPhonesByCity[key].push(String(ad.phone).trim());
      }
    }
  }

  for (const [key, totalAds] of Object.entries(memoryAdsCount)) {
    const phones = memoryPhonesByCity[key] || [];
    const uniqueSet = new Set(phones);
    stats[key] = {
      totalAds,
      totalPhones: phones.length,
      uniquePhones: uniqueSet.size,
    };
  }

  return stats;
}

export const getPublicAdById = cache(async function (
  id: string
): Promise<PublicAd | null> {
  const cleanId = id.trim();
  const cached = publicAdLruCache.get(cleanId);
  if (cached !== null) return cached;

  const collection = await getAdsCollection();
  let ad: Ad | null = null;

  if (!collection) {
    ad = await memoryFindById(cleanId);
  } else {
    ad = await collectionFindById(collection, cleanId);
    if (!ad) {
      ad = await memoryFindById(cleanId);
    }
  }

  if (!ad) {
    publicAdLruCache.set(cleanId, null);
    return null;
  }
  const override = ad.city ? await getActiveVipPhoneOverride(ad.city) : null;
  const publicAd = toPublicAd(ad, override);
  publicAdLruCache.set(cleanId, publicAd);
  return publicAd;
});

export async function createAd(
  data: Omit<Ad, "_id" | "createdAt" | "updatedAt">
): Promise<PublicAd> {
  const collection = await getAdsCollection();
  const now = new Date();
  const ad: Ad = { ...data, createdAt: now, updatedAt: now };

  invalidateAdCaches();
  if (!collection) {
    return toPublicAd(await memoryUpsert(ad));
  }

  const result = await collection.insertOne(ad as unknown as Document);
  return { ...ad, _id: result.insertedId.toString() };
}

export async function updateAd(
  id: string,
  userId: string,
  data: Partial<Omit<Ad, "_id" | "userId" | "createdAt" | "updatedAt">>
): Promise<PublicAd | null> {
  const collection = await getAdsCollection();
  const now = new Date();
  invalidateAdCaches();

  if (!collection) {
    const existing = await memoryFindById(id);
    if (!existing || existing.userId !== userId) return null;
    Object.assign(existing, data, { updatedAt: now });
    await memoryUpsert(existing);
    return toPublicAd(existing);
  }

  for (const candidate of buildAdIdCandidates(id)) {
    const updated = await collection.findOneAndUpdate(
      { _id: candidate, userId } as MongoQuery,
      { $set: { ...data, updatedAt: now } },
      { returnDocument: "after" }
    );
    if (updated) {
      return toPublicAd(updated as unknown as Ad);
    }
  }

  const existing = await memoryFindById(id);
  if (!existing || existing.userId !== userId) return null;
  Object.assign(existing, data, { updatedAt: now });
  await memoryUpsert(existing);
  return toPublicAd(existing);
}

export async function deleteAd(
  id: string,
  userId: string
): Promise<boolean> {
  invalidateAdCaches();
  const collection = await getAdsCollection();
  if (!collection) return await memoryDelete(id, userId);

  for (const candidate of buildAdIdCandidates(id)) {
    const result = await collection.deleteOne({ _id: candidate, userId } as MongoQuery);
    if (result.deletedCount > 0) return true;
  }

  return await memoryDelete(id, userId);
}

export async function softDeleteAd(
  id: string,
  userId: string
): Promise<boolean> {
  invalidateAdCaches();
  const collection = await getAdsCollection();
  if (!collection) {
    const store = await readStore();
    const idx = store.ads.findIndex(
      (a) => a._id === id && a.userId === userId
    );
    if (idx < 0) return false;
    store.ads[idx].status = "deleted";
    store.ads[idx].updatedAt = new Date();
    await writeStore(store);
    return true;
  }

  for (const candidate of buildAdIdCandidates(id)) {
    const result = await collection.updateOne(
      { _id: candidate, userId } as MongoQuery,
      { $set: { status: "deleted", updatedAt: new Date() } }
    );
    if (result.matchedCount > 0) return true;
  }

  return await memoryDelete(id, userId);
}

export async function restoreAd(
  id: string,
  userId: string
): Promise<boolean> {
  invalidateAdCaches();
  const collection = await getAdsCollection();
  if (!collection) {
    const store = await readStore();
    const idx = store.ads.findIndex(
      (a) => a._id === id && a.userId === userId
    );
    if (idx < 0) return false;
    store.ads[idx].status = "active";
    store.ads[idx].updatedAt = new Date();
    await writeStore(store);
    return true;
  }

  for (const candidate of buildAdIdCandidates(id)) {
    const result = await collection.updateOne(
      { _id: candidate, userId } as MongoQuery,
      { $set: { status: "active", updatedAt: new Date() } }
    );
    if (result.matchedCount > 0) return true;
  }

  const store = await readStore();
  const idx = store.ads.findIndex(
    (a) => a._id === id && a.userId === userId
  );
  if (idx < 0) return false;
  store.ads[idx].status = "active";
  store.ads[idx].updatedAt = new Date();
  await writeStore(store);
  return true;
}

export async function listAllAds(limit = 500): Promise<PublicAd[]> {
  const collection = await getAdsCollection();
  if (!collection) {
    const store = await readStore();
    return store.ads
      .filter((ad) => (ad.status ?? "active") !== "deleted")
      .sort(
        (a, b) =>
          (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime()
      )
      .slice(0, limit)
      .map((ad) => toPublicAd(ad as unknown as Ad));
  }

  const docs = await collection
    .find({ status: { $ne: "deleted" } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => toPublicAd(doc as unknown as Ad));
}

export async function setAdStatus(
  id: string,
  status: string
): Promise<PublicAd | null> {
  invalidateAdCaches();
  const collection = await getAdsCollection();
  const now = new Date();

  if (!collection) {
    const existing = await memoryFindById(id);
    if (!existing) return null;
    existing.status = status;
    existing.updatedAt = now;
    await memoryUpsert(existing);
    return toPublicAd(existing);
  }

  for (const candidate of buildAdIdCandidates(id)) {
    const result = await collection.updateOne(
      { _id: candidate } as MongoQuery,
      { $set: { status, updatedAt: now } }
    );
    if (result.matchedCount > 0) {
      const updated = await collection.findOne({ _id: candidate } as MongoQuery);
      return updated ? toPublicAd(updated as unknown as Ad) : null;
    }
  }

  const existing = await memoryFindById(id);
  if (!existing) return null;
  existing.status = status;
  existing.updatedAt = now;
  await memoryUpsert(existing);
  return toPublicAd(existing);
}

export async function adminDeleteAd(id: string): Promise<boolean> {
  invalidateAdCaches();
  const collection = await getAdsCollection();

  if (!collection) {
    const store = await readStore();
    const index = store.ads.findIndex((a) => a._id === id);
    if (index < 0) return false;
    store.ads.splice(index, 1);
    await writeStore(store);
    return true;
  }

  for (const candidate of buildAdIdCandidates(id)) {
    const result = await collection.deleteOne({ _id: candidate } as MongoQuery);
    if (result.deletedCount > 0) return true;
  }

  const store = await readStore();
  const index = store.ads.findIndex((a) => a._id === id);
  if (index < 0) return false;
  store.ads.splice(index, 1);
  await writeStore(store);
  return true;
}

export function toPublicAd(ad: Ad, override?: VipPhoneOverride | null): PublicAd {
  let phone = ad.phone;
  let whatsapp = ad.whatsapp;
  let telegram = ad.telegram;

  if (override) {
    if (override.phone) {
      phone = override.phone;
    } else if (override.deleteUserPhone) {
      phone = "";
    }

    if (override.whatsapp) {
      whatsapp = override.whatsapp;
    } else if (override.deleteUserPhone) {
      whatsapp = "";
    }

    if (override.telegram) {
      telegram = override.telegram;
    } else if (override.deleteUserPhone) {
      telegram = "";
    }
  }

  return {
    _id: ad._id,
    userId: ad.userId,
    name: ad.name,
    title: ad.title,
    age: ad.age,
    category: ad.category,
    toServe: ad.toServe,
    placeOfService: ad.placeOfService,
    city: ad.city,
    phone,
    whatsapp,
    telegram,
    about: ad.about,
    images: ad.images,
    serviceRates: ad.serviceRates,
    status: ad.status,
    promoted: ad.promoted,
    isPromoted: ad.isPromoted,
    promotedFrom: ad.promotedFrom,
    promotedUntil: ad.promotedUntil,
    promoPackage: ad.promoPackage,
    promoTier: ad.promoTier,
    promoShift: ad.promoShift,
    isFreeAd: ad.isFreeAd,
    isVisibleOnCityPage: ad.isVisibleOnCityPage,
    requiresPromotion: ad.requiresPromotion,
    createdAt: ad.createdAt,
    updatedAt: ad.updatedAt,
  };
}

export async function countAdsPerUser(): Promise<Record<string, number>> {
  const collection = await getAdsCollection();
  const counts: Record<string, number> = {};

  if (collection) {
    try {
      const results = await collection
        .aggregate([
          { $match: { status: { $ne: "deleted" } } },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
        ])
        .toArray();

      for (const item of results) {
        if (item._id && typeof item.count === "number") {
          counts[String(item._id)] = item.count;
        }
      }
      return counts;
    } catch (err) {
      console.error("[ad] countAdsPerUser aggregation failed:", err);
    }
  }

  const store = await readStore();
  const seen = new Set<string>();
  for (const ad of store.ads ?? []) {
    if ((ad.status ?? "active") === "deleted") continue;
    if (!ad._id || seen.has(ad._id)) continue;
    seen.add(ad._id);
    if (!ad.userId) continue;
    const uid = String(ad.userId);
    counts[uid] = (counts[uid] ?? 0) + 1;
  }
  return counts;
}

