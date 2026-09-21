import { cache } from "react";
import { getDb } from "../db";
import { readStore, writeStore, invalidateStoreCache } from "../persist";

export type BlockType = "h1" | "h2" | "h3" | "p";

export type ContentBlock = {
  id: string;
  type: BlockType;
  text: string;
};

export type SeoStatus = "draft" | "published";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type CitySeo = {
  slug: string;
  name: string;
  title: string;
  description: string;
  keywords: string;
  urlSlug?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  longTailKeywords?: string[];
  popularSearches?: string[];
  canonicalUrl?: string;
  featuredImage?: string;
  imageAlt?: string;
  content?: ContentBlock[];
  faqs?: FaqItem[];
  status?: SeoStatus;
  updatedAt?: string;
};

function normalizeSeoDoc(raw: Record<string, unknown>): CitySeo {
  return {
    slug: String(raw.slug || ""),
    name: String(raw.name || raw.slug || ""),
    title: String(raw.title || ""),
    description: String(raw.description || ""),
    keywords: String(raw.keywords || raw.primaryKeyword || ""),
    urlSlug: raw.urlSlug ? String(raw.urlSlug) : undefined,
    primaryKeyword: String(raw.primaryKeyword || ""),
    secondaryKeywords: Array.isArray(raw.secondaryKeywords)
      ? (raw.secondaryKeywords as string[]).map(String)
      : [],
    longTailKeywords: Array.isArray(raw.longTailKeywords)
      ? (raw.longTailKeywords as string[]).map(String)
      : [],
    popularSearches: Array.isArray(raw.popularSearches) && raw.popularSearches.length > 0
      ? Array.from(
          new Set(
            (raw.popularSearches as string[])
              .map(String)
              .map((s) => s.trim())
              .filter(Boolean)
          )
        )
      : Array.from(
          new Set(
            [
              ...(Array.isArray(raw.secondaryKeywords) ? (raw.secondaryKeywords as string[]).map(String) : []),
              ...(Array.isArray(raw.longTailKeywords) ? (raw.longTailKeywords as string[]).map(String) : []),
            ]
              .map((s) => s.trim())
              .filter(Boolean)
          )
        ),
    canonicalUrl: String(raw.canonicalUrl || ""),
    featuredImage: String(raw.featuredImage || ""),
    imageAlt: String(raw.imageAlt || ""),
    content: Array.isArray(raw.content)
      ? (raw.content as ContentBlock[]).map((b, i) => ({
          id: b.id || `b_${i}`,
          type: (["h1", "h2", "h3", "p"].includes(b.type) ? b.type : "p") as BlockType,
          text: String(b.text || ""),
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

export async function getAllCitySeo(): Promise<CitySeo[]> {
  const db = await getDb();
  if (db) {
    try {
      const docs = await db.collection("city_seo").find({}).toArray();
      if (docs && docs.length > 0) {
        return docs.map((d) => normalizeSeoDoc(d as unknown as Record<string, unknown>));
      }
    } catch (err) {
      console.error("[city-seo] getAllCitySeo from mongo failed:", err);
    }
  }

  const store = await readStore();
  return ((store.citySeo ?? []) as unknown as Record<string, unknown>[]).map(normalizeSeoDoc);
}

const seoCache = new Map<string, { data: CitySeo | null; expiresAt: number }>();
const SEO_CACHE_TTL_MS = 60_000;

export function invalidateCitySeoCache(slug?: string): void {
  if (slug) {
    seoCache.delete(slug.toLowerCase().trim());
  } else {
    seoCache.clear();
  }
}

export const getCitySeo = cache(async function (
  slug: string
): Promise<CitySeo | null> {
  const target = String(slug || "").trim().toLowerCase();
  if (!target) return null;

  const now = Date.now();
  const cached = seoCache.get(target);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  let result: CitySeo | null = null;
  const db = await getDb();
  if (db) {
    try {
      const doc = await db.collection("city_seo").findOne({
        $or: [
          { slug: target },
          { urlSlug: target },
          { slug: new RegExp(`^${target}$`, "i") },
          { urlSlug: new RegExp(`^${target}$`, "i") },
          { slug: new RegExp(`^${target}-`, "i") },
          { urlSlug: new RegExp(`^${target}-`, "i") },
          { name: new RegExp(`^${target}$`, "i") },
        ],
      });
      if (doc) {
        result = normalizeSeoDoc(doc as unknown as Record<string, unknown>);
      }
    } catch (err) {
      console.error("[city-seo] getCitySeo from mongo failed:", err);
    }
  }

  if (!result) {
    const store = await readStore();
    const list = (store.citySeo ?? []) as unknown as Record<string, unknown>[];
    const found = list.find((c) => {
      const s = String(c.slug || "").toLowerCase();
      const u = String(c.urlSlug || "").toLowerCase();
      const n = String(c.name || "").toLowerCase();
      return (
        s === target ||
        u === target ||
        s.startsWith(`${target}-`) ||
        u.startsWith(`${target}-`) ||
        n === target
      );
    });

    if (found) {
      result = normalizeSeoDoc(found);
    }
  }

  seoCache.set(target, { data: result, expiresAt: now + SEO_CACHE_TTL_MS });
  return result;
});

export async function upsertCitySeo(data: CitySeo): Promise<CitySeo> {
  const record: CitySeo = {
    slug: String(data.slug || "").trim(),
    name: data.name?.trim() || String(data.slug),
    title: data.title?.trim() ?? "",
    description: data.description?.trim() ?? "",
    keywords:
      data.keywords?.trim() ||
      (data.primaryKeyword ? data.primaryKeyword.trim() : ""),
    urlSlug: data.urlSlug?.trim() || data.slug,
    primaryKeyword: data.primaryKeyword?.trim() ?? "",
    popularSearches: Array.isArray(data.popularSearches)
      ? Array.from(new Set(data.popularSearches.map((s) => String(s).trim()).filter(Boolean)))
      : Array.from(
          new Set([
            ...(Array.isArray(data.secondaryKeywords) ? data.secondaryKeywords.map((s) => String(s).trim()) : []),
            ...(Array.isArray(data.longTailKeywords) ? data.longTailKeywords.map((s) => String(s).trim()) : []),
          ].filter(Boolean))
        ),
    secondaryKeywords: Array.isArray(data.secondaryKeywords) && data.secondaryKeywords.length > 0
      ? data.secondaryKeywords.map((s) => String(s).trim()).filter(Boolean)
      : (Array.isArray(data.popularSearches) ? data.popularSearches.map((s) => String(s).trim()).filter(Boolean) : []),
    longTailKeywords: Array.isArray(data.longTailKeywords)
      ? data.longTailKeywords.map((s) => String(s).trim()).filter(Boolean)
      : [],
    canonicalUrl: data.canonicalUrl?.trim() ?? "",
    featuredImage: data.featuredImage ?? "",
    imageAlt: data.imageAlt?.trim() ?? "",
    content: Array.isArray(data.content)
      ? data.content.map((b, i) => ({
          id: b.id || `b_${i}`,
          type: (["h1", "h2", "h3", "p"].includes(b.type) ? b.type : "p") as BlockType,
          text: String(b.text || "").trim(),
        }))
      : [],
    faqs: Array.isArray(data.faqs)
      ? data.faqs
          .map((f, i) => ({
            id: f.id || `faq_${i}`,
            question: String(f.question || "").trim(),
            answer: String(f.answer || "").trim(),
          }))
          .filter((f) => f.question || f.answer)
      : [],
    status: data.status === "published" ? "published" : "draft",
    updatedAt: new Date().toISOString(),
  };

  const db = await getDb();
  if (db) {
    try {
      await db.collection("city_seo").updateOne(
        { slug: record.slug },
        { $set: record },
        { upsert: true }
      );
    } catch (err) {
      console.error("[city-seo] upsertCitySeo mongo write failed:", err);
    }
  }

  // Dual persist to store for local dev / memory fallback
  try {
    const store = await readStore();
    const list = (store.citySeo ?? []) as unknown as CitySeo[];
    const index = list.findIndex((c) => c.slug === record.slug);
    if (index >= 0) {
      list[index] = record;
    } else {
      list.push(record);
    }
    await writeStore(store);
  } catch (err) {
    console.warn("[city-seo] store fallback write failed:", err);
  }

  invalidateStoreCache();
  invalidateCitySeoCache();
  return record;
}
