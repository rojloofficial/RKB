import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config/site";
import { listAllCities } from "@/lib/models/city";
import { listAllAds, filterVisibleCityAds } from "@/lib/models/ad";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/+$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/places`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/services`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/privacy-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/refund-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/return-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/disclaimer`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const citySlugMap = new Map<string, string>();
  const cityRoutes: MetadataRoute.Sitemap = [];
  const seenCitySlugs = new Set<string>();

  try {
    const cities = await listAllCities();

    for (const city of cities) {
      if (!city) continue;
      const rawSlug = String(city.slug ?? "").trim().toLowerCase();
      const slug = rawSlug
        .replace(/[^a-z0-9-]+/g, "")
        .replace(/^-+|-+$/g, "");

      if (!slug || seenCitySlugs.has(slug)) continue;
      seenCitySlugs.add(slug);

      if (city.name) {
        citySlugMap.set(
          String(city.name).trim().toLowerCase(),
          slug
        );
      }
      citySlugMap.set(slug, slug);

      cityRoutes.push({
        url: `${base}/places/${slug}`,
        lastModified: getValidDate(city.createdAt, now),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error("[sitemap] Failed to load cities:", error);
  }

  const adRoutes: MetadataRoute.Sitemap = [];
  const seenAdUrls = new Set<string>();

  try {
    const allAds = await listAllAds(1000);
    const activeAds = allAds.filter(
      (ad) => String(ad.status ?? "active").toLowerCase() === "active"
    );
    const visibleAds = await filterVisibleCityAds(activeAds);

    for (const ad of visibleAds) {
      const id = String(ad._id ?? "").trim();
      if (!id) continue;

      const rawCity = String(ad.city ?? "")
        .trim()
        .toLowerCase();
      if (!rawCity) continue;

      // Only include ads where the city is recognized in the official city list
      const citySlug = citySlugMap.get(rawCity);
      if (!citySlug) continue;

      const adUrl = `${base}/places/${citySlug}/${encodeURIComponent(id)}`;
      if (seenAdUrls.has(adUrl.toLowerCase())) continue;
      seenAdUrls.add(adUrl.toLowerCase());

      adRoutes.push({
        url: adUrl,
        lastModified: getValidDate(
          ad.updatedAt ?? ad.createdAt,
          now
        ),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error("[sitemap] Failed to load ads:", error);
  }

  // Combine and deduplicate all routes by normalized lowercase URL
  const allRoutes = [
    ...staticRoutes,
    ...cityRoutes,
    ...adRoutes,
  ];

  const uniqueRoutesMap = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const route of allRoutes) {
    const key = route.url.trim().toLowerCase();
    if (!uniqueRoutesMap.has(key)) {
      uniqueRoutesMap.set(key, route);
    }
  }

  return Array.from(uniqueRoutesMap.values());
}

function getValidDate(
  value: unknown,
  fallback: Date
): Date {
  if (!value) return fallback;

  const date = new Date(String(value));
  const time = date.getTime();

  // Reject invalid timestamps and Unix epoch dates (1970-01-01)
  if (Number.isNaN(time) || time <= 86400000) {
    return fallback;
  }

  return date;
}