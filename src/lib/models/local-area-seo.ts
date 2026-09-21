import { cache } from "react";
import { getDb } from "../db";
import { readStore, writeStore, invalidateStoreCache } from "../persist";
import { getCitySeo, type ContentBlock, type FaqItem, type BlockType } from "./city-seo";

export type { BlockType, ContentBlock, FaqItem };

export type LocalAreaSeoMode = "inherit" | "individual";

export type LocalAreaSeo = {
  citySlug: string;
  cityName: string;
  areaSlug: string;
  areaName: string;
  mode: LocalAreaSeoMode; // "inherit" = Same content as city; "individual" = Custom SEO
  title?: string;
  description?: string;
  keywords?: string;
  primaryKeyword?: string;
  popularSearches?: string[];
  secondaryKeywords?: string[];
  longTailKeywords?: string[];
  canonicalUrl?: string;
  featuredImage?: string;
  imageAlt?: string;
  content?: ContentBlock[];
  faqs?: FaqItem[];
  status?: "draft" | "published";
  updatedAt?: string;
};

function compoundKey(citySlug: string, areaSlug: string): string {
  return `${citySlug.toLowerCase().trim()}::${areaSlug.toLowerCase().trim()}`;
}

function normalizeLocalAreaSeo(raw: Record<string, unknown>): LocalAreaSeo {
  const citySlug = String(raw.citySlug || "").toLowerCase().trim();
  const areaSlug = String(raw.areaSlug || "").toLowerCase().trim();
  const mode: LocalAreaSeoMode =
    raw.mode === "individual" ? "individual" : "inherit";

  return {
    citySlug,
    cityName: String(raw.cityName || citySlug),
    areaSlug,
    areaName: String(raw.areaName || areaSlug),
    mode,
    title: raw.title ? String(raw.title) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    keywords: raw.keywords ? String(raw.keywords) : undefined,
    primaryKeyword: raw.primaryKeyword ? String(raw.primaryKeyword) : undefined,
    popularSearches: Array.isArray(raw.popularSearches)
      ? (raw.popularSearches as string[]).map(String).filter(Boolean)
      : [],
    secondaryKeywords: Array.isArray(raw.secondaryKeywords)
      ? (raw.secondaryKeywords as string[]).map(String).filter(Boolean)
      : [],
    longTailKeywords: Array.isArray(raw.longTailKeywords)
      ? (raw.longTailKeywords as string[]).map(String).filter(Boolean)
      : [],
    canonicalUrl: raw.canonicalUrl ? String(raw.canonicalUrl) : undefined,
    featuredImage: raw.featuredImage ? String(raw.featuredImage) : undefined,
    imageAlt: raw.imageAlt ? String(raw.imageAlt) : undefined,
    content: Array.isArray(raw.content)
      ? (raw.content as ContentBlock[]).map((b, i) => ({
          id: b.id || `b_${i}`,
          type: (["h1", "h2", "h3", "p"].includes(b.type) ? b.type : "p") as BlockType,
          text: String(b.text || "").trim(),
        }))
      : [],
    faqs: Array.isArray(raw.faqs)
      ? (raw.faqs as FaqItem[])
          .map((f, i) => ({
            id: f.id || `faq_${i}`,
            question: String(f.question || "").trim(),
            answer: String(f.answer || "").trim(),
          }))
          .filter((f) => f.question || f.answer)
      : [],
    status: raw.status === "published" ? "published" : "draft",
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString(),
  };
}

const localAreaSeoCache = new Map<string, { data: LocalAreaSeo | null; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export function invalidateLocalAreaSeoCache(citySlug?: string, areaSlug?: string): void {
  if (citySlug && areaSlug) {
    localAreaSeoCache.delete(compoundKey(citySlug, areaSlug));
  } else {
    localAreaSeoCache.clear();
  }
}

export async function getAllLocalAreaSeo(): Promise<LocalAreaSeo[]> {
  const db = await getDb();
  if (db) {
    try {
      const docs = await db.collection("local_area_seo").find({}).toArray();
      if (docs && docs.length > 0) {
        return docs.map((d) => normalizeLocalAreaSeo(d as unknown as Record<string, unknown>));
      }
    } catch (err) {
      console.error("[local-area-seo] getAllLocalAreaSeo mongo failed:", err);
    }
  }

  const store = await readStore();
  return ((store.localAreaSeo ?? []) as unknown as Record<string, unknown>[]).map(
    normalizeLocalAreaSeo
  );
}

export const getLocalAreaSeo = cache(async function (
  citySlug: string,
  areaSlug: string
): Promise<LocalAreaSeo | null> {
  const key = compoundKey(citySlug, areaSlug);
  if (!key || key === "::") return null;

  const now = Date.now();
  const cached = localAreaSeoCache.get(key);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  let result: LocalAreaSeo | null = null;
  const db = await getDb();
  if (db) {
    try {
      const doc = await db.collection("local_area_seo").findOne({
        citySlug: citySlug.toLowerCase().trim(),
        areaSlug: areaSlug.toLowerCase().trim(),
      });
      if (doc) {
        result = normalizeLocalAreaSeo(doc as unknown as Record<string, unknown>);
      }
    } catch (err) {
      console.error("[local-area-seo] getLocalAreaSeo mongo failed:", err);
    }
  }

  if (!result) {
    const store = await readStore();
    const list = (store.localAreaSeo ?? []) as unknown as Record<string, unknown>[];
    const found = list.find((item) => {
      const c = String(item.citySlug || "").toLowerCase().trim();
      const a = String(item.areaSlug || "").toLowerCase().trim();
      return c === citySlug.toLowerCase().trim() && a === areaSlug.toLowerCase().trim();
    });
    if (found) {
      result = normalizeLocalAreaSeo(found);
    }
  }

  localAreaSeoCache.set(key, { data: result, expiresAt: now + CACHE_TTL_MS });
  return result;
});

/**
 * Returns the effective SEO for a Local Area:
 * - If custom individual SEO exists and mode is "individual", uses individual SEO.
 * - If mode is "inherit" (or no SEO set), inherits parent City SEO adapted for the neighborhood.
 */
export async function getEffectiveLocalAreaSeo(
  citySlug: string,
  areaSlug: string,
  areaNameFallback?: string,
  cityNameFallback?: string
): Promise<{
  mode: LocalAreaSeoMode;
  title: string;
  description: string;
  primaryKeyword: string;
  popularSearches: string[];
  content: ContentBlock[];
  faqs: FaqItem[];
  canonicalUrl?: string;
  status: "draft" | "published";
  isIndividual: boolean;
}> {
  const custom = await getLocalAreaSeo(citySlug, areaSlug);
  const citySeo = await getCitySeo(citySlug);

  const aName = custom?.areaName || areaNameFallback || areaSlug;
  const cName = custom?.cityName || cityNameFallback || citySeo?.name || citySlug;

  // 1. If individual mode with custom content
  if (custom && custom.mode === "individual" && (custom.title || custom.content?.length)) {
    return {
      mode: "individual",
      title: custom.title || `Best Places & Services in ${aName}, ${cName} | RKB`,
      description:
        custom.description ||
        `Explore verified services, classifieds, and top local listings in ${aName}, ${cName} on RKB.`,
      primaryKeyword: custom.primaryKeyword || `${aName} ${cName}`,
      popularSearches:
        custom.popularSearches && custom.popularSearches.length > 0
          ? custom.popularSearches
          : [
              `${aName} services`,
              `${aName} ${cName}`,
              `Verified ads in ${aName}`,
              `Top services in ${aName}, ${cName}`,
            ],
      content: custom.content ?? [],
      faqs: custom.faqs ?? [],
      canonicalUrl: custom.canonicalUrl,
      status: custom.status ?? "published",
      isIndividual: true,
    };
  }

  // 2. Inherit from parent City SEO
  if (citySeo) {
    // Contextualize City Title with Local Area Name
    let title = citySeo.title.trim();
    if (title) {
      if (title.toLowerCase().includes(cName.toLowerCase())) {
        title = title.replace(
          new RegExp(cName, "gi"),
          `${aName}, ${cName}`
        );
      } else {
        title = `${aName}, ${title}`;
      }
    } else {
      title = `Best Places & Services in ${aName}, ${cName} | RKB`;
    }

    // Contextualize City Description
    let description = citySeo.description.trim();
    if (description) {
      if (description.toLowerCase().includes(cName.toLowerCase())) {
        description = description.replace(
          new RegExp(cName, "gi"),
          `${aName}, ${cName}`
        );
      } else {
        description = `In ${aName}, ${cName}: ${description}`;
      }
    } else {
      description = `Explore top verified places and local classifieds in ${aName}, ${cName} on RKB.`;
    }

    // Adapt Content Blocks for Local Area
    const content: ContentBlock[] = (citySeo.content ?? []).map((b) => ({
      ...b,
      text: b.text.replace(new RegExp(cName, "gi"), `${aName}, ${cName}`),
    }));

    // Adapt FAQs
    const faqs: FaqItem[] = (citySeo.faqs ?? []).map((f) => ({
      ...f,
      question: f.question.replace(new RegExp(cName, "gi"), `${aName}, ${cName}`),
      answer: f.answer.replace(new RegExp(cName, "gi"), `${aName}, ${cName}`),
    }));

    const popularSearches = [
      `${aName} services`,
      `${aName} ${cName}`,
      ...(citySeo.popularSearches ?? []).map((s) =>
        s.replace(new RegExp(cName, "gi"), `${aName}, ${cName}`)
      ),
    ].slice(0, 10);

    return {
      mode: "inherit",
      title,
      description,
      primaryKeyword: `${aName} ${citySeo.primaryKeyword || cName}`,
      popularSearches,
      content,
      faqs,
      status: citySeo.status ?? "published",
      isIndividual: false,
    };
  }

  // 3. Fallback default
  return {
    mode: "inherit",
    title: `Best Places & Services in ${aName}, ${cName} | RKB`,
    description: `Explore top verified services, classifieds, and attractions in ${aName}, ${cName} on RKB.`,
    primaryKeyword: `${aName} ${cName}`,
    popularSearches: [
      `${aName} services`,
      `${aName} ${cName}`,
      `Verified ads in ${aName}`,
      `Top services near ${aName}`,
    ],
    content: [],
    faqs: [],
    status: "published",
    isIndividual: false,
  };
}

export async function upsertLocalAreaSeo(data: LocalAreaSeo): Promise<LocalAreaSeo> {
  const citySlug = data.citySlug.toLowerCase().trim();
  const areaSlug = data.areaSlug.toLowerCase().trim();
  const record: LocalAreaSeo = {
    ...data,
    citySlug,
    areaSlug,
    cityName: data.cityName || citySlug,
    areaName: data.areaName || areaSlug,
    updatedAt: new Date().toISOString(),
  };

  const db = await getDb();
  if (db) {
    try {
      await db.collection("local_area_seo").updateOne(
        { citySlug, areaSlug },
        { $set: record },
        { upsert: true }
      );
    } catch (err) {
      console.error("[local-area-seo] upsert mongo failed:", err);
    }
  }

  try {
    const store = await readStore();
    const list = (store.localAreaSeo ?? []) as unknown as LocalAreaSeo[];
    const idx = list.findIndex(
      (item) => item.citySlug === citySlug && item.areaSlug === areaSlug
    );
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.push(record);
    }
    store.localAreaSeo = list as unknown as typeof store.localAreaSeo;
    await writeStore(store);
  } catch (err) {
    console.warn("[local-area-seo] store fallback write failed:", err);
  }

  invalidateStoreCache();
  invalidateLocalAreaSeoCache(citySlug, areaSlug);
  return record;
}

export async function batchUpdateLocalAreaSeoModes(
  updates: Array<{
    citySlug: string;
    areaSlug: string;
    mode: LocalAreaSeoMode;
    cityName?: string;
    areaName?: string;
  }>
): Promise<number> {
  let count = 0;
  for (const upd of updates) {
    const existing = await getLocalAreaSeo(upd.citySlug, upd.areaSlug);
    if (existing) {
      existing.mode = upd.mode;
      if (upd.cityName) existing.cityName = upd.cityName;
      if (upd.areaName) existing.areaName = upd.areaName;
      await upsertLocalAreaSeo(existing);
      count++;
    } else {
      await upsertLocalAreaSeo({
        citySlug: upd.citySlug,
        cityName: upd.cityName || upd.citySlug,
        areaSlug: upd.areaSlug,
        areaName: upd.areaName || upd.areaSlug,
        mode: upd.mode,
      });
      count++;
    }
  }
  return count;
}

/**
 * Returns a set of lowercase citySlugs that have at least one Local Area
 * configured with individual SEO content (mode === "individual").
 * Powers the green dot indicator!
 */
export async function getCitiesWithCustomLocalAreaSeo(): Promise<Set<string>> {
  const all = await getAllLocalAreaSeo();
  const set = new Set<string>();
  for (const item of all) {
    if (item.mode === "individual" && item.citySlug) {
      set.add(item.citySlug.toLowerCase().trim());
    }
  }
  return set;
}
