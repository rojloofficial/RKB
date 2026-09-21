import { cache } from "react";
import { readStore, writeStore } from "../persist";
import { cityPlaces, getCityBySlug as getStaticCityBySlug } from "../places";
import { LRUCache } from "../lru-cache";

export type CityRecord = {
  _id?: string;
  name: string;
  slug: string;
  state?: string;
  region: string;
  country?: string;
  famousFood: string;
  seoDescription: string;
  createdAt: Date | string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function listCities(): Promise<CityRecord[]> {
  const store = await readStore();
  const deleted = new Set(
    (store.deletedCities ?? []).map((s: string) => s.trim().toLowerCase())
  );
  const deletedStates = new Set(
    (store.deletedStates ?? []).map((s: string) => s.trim().toLowerCase())
  );
  const cities = (store.cities ?? []) as unknown as CityRecord[];

  const result: CityRecord[] = [];
  const seen = new Set<string>();

  for (const c of cities) {
    if (!c.name) continue;
    const slug = c.slug || slugify(c.name);
    const stateName = (c.state ?? "").trim().toLowerCase();
    const stateSlug = slugify(c.state ?? "");

    // Skip if city slug is deleted
    if (deleted.has(slug.toLowerCase())) continue;
    // Skip if state is deleted
    if (stateName && (deletedStates.has(stateName) || deletedStates.has(stateSlug))) {
      continue;
    }

    // Deduplicate by composite key: state + slug
    const uniqueKey = `${stateSlug}:${slug.toLowerCase()}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    result.push({
      ...c,
      _id: c._id || `mem_city_${slug}`,
      slug,
    });
  }

  return result.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });
}

export async function isCityDeleted(slug: string): Promise<boolean> {
  const store = await readStore();
  const sLower = slug.trim().toLowerCase();
  return (store.deletedCities ?? []).some(
    (del: string) => del.trim().toLowerCase() === sLower
  );
}

const cityLruCache = new LRUCache<string, CityRecord | null>(300, 5 * 60_000);

export const getCityBySlug = cache(async function (
  slug: string
): Promise<CityRecord | null> {
  if (!slug) return null;
  const sLower = slug.trim().toLowerCase();

  const cached = cityLruCache.get(sLower);
  if (cached !== null) return cached;

  const store = await readStore();
  const deletedStates = new Set(
    (store.deletedStates ?? []).map((s: string) => s.trim().toLowerCase())
  );

  if (await isCityDeleted(slug)) {
    cityLruCache.set(sLower, null);
    return null;
  }

  // O(1) Static City Lookup
  const staticCity = getStaticCityBySlug(sLower);
  if (staticCity) {
    if (
      staticCity.state &&
      (deletedStates.has(staticCity.state.trim().toLowerCase()) ||
        deletedStates.has(slugify(staticCity.state)))
    ) {
      cityLruCache.set(sLower, null);
      return null;
    }
    const record: CityRecord = {
      _id: staticCity.slug,
      name: staticCity.name,
      slug: staticCity.slug,
      state: staticCity.state,
      region: staticCity.region,
      famousFood: staticCity.famousFood,
      seoDescription: staticCity.seoDescription,
      createdAt: new Date(0),
    };
    cityLruCache.set(sLower, record);
    return record;
  }

  const custom = (await listCities()).find(
    (c) => c.slug.toLowerCase() === sLower
  );
  const found = custom ?? null;
  cityLruCache.set(sLower, found);
  return found;
});

export async function getCustomCityBySlug(
  slug: string
): Promise<CityRecord | null> {
  if (!slug) return null;
  const sLower = slug.trim().toLowerCase();
  return (
    (await listCities()).find(
      (c) => c.slug.toLowerCase() === sLower
    ) ?? null
  );
}

export type CombinedCity = CityRecord & { source: "Static" | "Custom" };

let cachedCombinedCities: CombinedCity[] | null = null;
let cachedCombinedCitiesExpiresAt = 0;
const COMBINED_CITIES_CACHE_TTL_MS = 5 * 60_000; // 5 minutes

export function invalidateCityCache(): void {
  cachedCombinedCities = null;
  cachedCombinedCitiesExpiresAt = 0;
  cityLruCache.clear();
}

let inFlightListAllCitiesPromise: Promise<CombinedCity[]> | null = null;

export async function listAllCities(): Promise<CombinedCity[]> {
  const now = Date.now();
  if (cachedCombinedCities && now < cachedCombinedCitiesExpiresAt) {
    return cachedCombinedCities;
  }

  if (inFlightListAllCitiesPromise) {
    return inFlightListAllCitiesPromise;
  }

  inFlightListAllCitiesPromise = (async () => {
    try {
      const store = await readStore();
  const deleted = new Set(
    (store.deletedCities ?? []).map((s: string) => s.trim().toLowerCase())
  );
  const deletedStates = new Set(
    (store.deletedStates ?? []).map((s: string) => s.trim().toLowerCase())
  );

  const customCities: CombinedCity[] = (await listCities()).map((c) => ({
    ...c,
    source: "Custom" as const,
  }));
  const customCityKeys = new Set(
    customCities.map(
      (c) => `${slugify(c.state ?? "")}:${c.slug.toLowerCase()}`
    )
  );
  const customCitySlugs = new Set(
    customCities.map((c) => c.slug.toLowerCase())
  );

  const staticCities: CombinedCity[] = cityPlaces
    .filter((c) => {
      const slug = c.slug.toLowerCase();
      const stateName = (c.state ?? "").trim().toLowerCase();
      const stateSlug = slugify(c.state ?? "");
      if (deleted.has(slug)) return false;
      if (
        stateName &&
        (deletedStates.has(stateName) || deletedStates.has(stateSlug))
      ) {
        return false;
      }
      const key = `${stateSlug}:${slug}`;
      if (customCityKeys.has(key) || customCitySlugs.has(slug)) return false;
      return true;
    })
    .map((c) => ({
      _id: c.slug,
      name: c.name,
      slug: c.slug,
      state: c.state,
      region: c.region,
      famousFood: c.famousFood,
      seoDescription: c.seoDescription,
      createdAt: new Date(0),
      source: "Static" as const,
    }));

  const seenSlugs = new Set<string>();
  const deduped: CombinedCity[] = [];
  for (const c of [...customCities, ...staticCities]) {
    const slug = c.slug.toLowerCase().trim();
    if (!slug || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    deduped.push(c);
  }

    cachedCombinedCities = deduped;
    cachedCombinedCitiesExpiresAt = Date.now() + COMBINED_CITIES_CACHE_TTL_MS;
    return deduped;
  } finally {
    inFlightListAllCitiesPromise = null;
  }
})();

  return inFlightListAllCitiesPromise;
}

export async function createCity(data: {
  name: string;
  state?: string;
  region: string;
  country?: string;
  famousFood: string;
  seoDescription: string;
}): Promise<CityRecord> {
  const store = await readStore();
  const trimmedName = data.name.trim();
  const trimmedState = data.state?.trim() ?? "";
  const baseSlug = slugify(trimmedName) || `city-${Date.now()}`;

  // If city in another state already took baseSlug, disambiguate with state slug
  const slugTakenByOtherState =
    (store.cities as unknown as CityRecord[]).some(
      (c) =>
        c.slug === baseSlug &&
        c.state?.trim().toLowerCase() !== trimmedState.toLowerCase()
    ) ||
    cityPlaces.some(
      (c) =>
        c.slug === baseSlug &&
        c.state?.trim().toLowerCase() !== trimmedState.toLowerCase()
    );

  const slug =
    slugTakenByOtherState && trimmedState
      ? `${baseSlug}-${slugify(trimmedState)}`
      : baseSlug;

  // Un-delete city from deletedCities if it was deleted
  const slugLower = slug.toLowerCase();
  const baseLower = baseSlug.toLowerCase();
  store.deletedCities = (store.deletedCities ?? []).filter((s: string) => {
    const val = s.trim().toLowerCase();
    return val !== slugLower && val !== baseLower;
  });

  // Un-delete state if it was deleted
  if (trimmedState) {
    const sNameLower = trimmedState.toLowerCase();
    const sSlugLower = slugify(trimmedState);
    store.deletedStates = (store.deletedStates ?? []).filter((s: string) => {
      const val = s.trim().toLowerCase();
      return val !== sNameLower && val !== sSlugLower;
    });
  }

  const cities = store.cities as unknown as CityRecord[];

  // Check if same city already exists under the same state -> update in place
  const existingSameStateIndex = cities.findIndex(
    (c) =>
      c.state?.trim().toLowerCase() === trimmedState.toLowerCase() &&
      (c.slug === slug ||
        c.slug === baseSlug ||
        c.name.trim().toLowerCase() === trimmedName.toLowerCase())
  );

  if (existingSameStateIndex >= 0) {
    const existing = cities[existingSameStateIndex];
    existing.name = trimmedName;
    existing.slug = slug;
    existing.state = trimmedState;
    existing.region = data.region.trim() || trimmedState || "India";
    existing.country = data.country?.trim() ?? "India";
    existing.famousFood = data.famousFood.trim();
    existing.seoDescription = data.seoDescription.trim();
    existing.createdAt = new Date();
    await writeStore(store);
    invalidateCityCache();
    return existing;
  }

  const city: CityRecord = {
    _id: `mem_city_${store.cities.length + 1}_${Date.now()}`,
    name: trimmedName,
    slug,
    state: trimmedState,
    region: data.region.trim() || trimmedState || "India",
    country: data.country?.trim() || "India",
    famousFood: data.famousFood.trim(),
    seoDescription: data.seoDescription.trim(),
    createdAt: new Date(),
  };
  store.cities.push(city as unknown as (typeof store.cities)[number]);
  await writeStore(store);
  invalidateCityCache();

  return city;
}

export async function deleteCity(id: string): Promise<boolean> {
  const trimmed = id.trim();
  if (!trimmed) return false;

  const store = await readStore();
  store.deletedCities = store.deletedCities ?? [];

  const trimmedLower = trimmed.toLowerCase();
  const slugified = slugify(trimmed);

  // 1. Check in custom cities
  const customIndex = store.cities.findIndex((c) => {
    const cId = String(c._id ?? "");
    const cSlug = String(c.slug ?? "").toLowerCase();
    const cName = String(c.name ?? "").trim().toLowerCase();
    return (
      cId === trimmed ||
      cSlug === trimmedLower ||
      cSlug === slugified ||
      cName === trimmedLower
    );
  });

  let deletedSlug = "";
  let deletedName = "";

  if (customIndex >= 0) {
    const found = store.cities[customIndex] as CityRecord;
    deletedSlug = found.slug;
    deletedName = found.name;
    store.cities.splice(customIndex, 1);
  }

  // 2. Check in static cities
  const staticCity = cityPlaces.find((c) => {
    const sSlug = c.slug.toLowerCase();
    const sName = c.name.trim().toLowerCase();
    return (
      sSlug === trimmedLower ||
      sSlug === slugified ||
      sName === trimmedLower ||
      c.slug === trimmed
    );
  });

  if (staticCity) {
    deletedSlug = deletedSlug || staticCity.slug;
    deletedName = deletedName || staticCity.name;
  }

  if (!deletedSlug && !deletedName && customIndex < 0 && !staticCity) {
    return false;
  }

  // Record deleted slug in deletedCities
  const slugToRecord = (deletedSlug || slugified).toLowerCase();
  if (
    slugToRecord &&
    !store.deletedCities.some((s) => s.toLowerCase() === slugToRecord)
  ) {
    store.deletedCities.push(slugToRecord);
  }

  // Clean up local areas for this city
  if (deletedName || deletedSlug) {
    const localAreas = (store.localAreas ?? []) as Array<{
      _id?: string;
      cityName?: string;
      citySlug?: string;
    }>;
    store.localAreas = localAreas.filter((a) => {
      const aSlug = String(a.citySlug ?? "").toLowerCase();
      const aName = String(a.cityName ?? "").trim().toLowerCase();
      return (
        (!deletedSlug || aSlug !== deletedSlug.toLowerCase()) &&
        (!deletedName || aName !== deletedName.toLowerCase())
      );
    }) as unknown as typeof store.localAreas;
  }

  await writeStore(store);
  invalidateCityCache();
  return true;
}

export async function deleteCities(ids: string[]): Promise<number> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return 0;

  let count = 0;
  for (const id of uniqueIds) {
    const ok = await deleteCity(id);
    if (ok) count++;
  }
  return count;
}
