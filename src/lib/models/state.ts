import "server-only";

import { readStore, writeStore } from "../persist";
import { cityPlaces } from "../places";
import { LRUCache } from "../lru-cache";

export type StateRecord = {
  _id?: string;
  name: string;
  slug: string;
  createdAt: Date | string;
};

const statesLruCache = new LRUCache<string, StateRecord[]>(10, 5 * 60_000);

export function invalidateStatesCache(): void {
  statesLruCache.clear();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const DEFAULT_INDIAN_STATES: string[] = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export async function listStates(): Promise<StateRecord[]> {
  const cached = statesLruCache.get("all");
  if (cached) return cached;

  const store = await readStore();
  const deleted = new Set(
    (store.deletedStates ?? []).map((s: string) => s.trim().toLowerCase())
  );
  const customStates = (store.states ?? []) as unknown as StateRecord[];
  const existingNames = new Set(
    customStates.map((s) => s.name.trim().toLowerCase())
  );

  const combined: StateRecord[] = customStates.filter((s) => {
    const sName = s.name.trim().toLowerCase();
    const sSlug = (s.slug || slugify(s.name)).toLowerCase();
    return !deleted.has(sName) && !deleted.has(sSlug);
  });

  for (const name of DEFAULT_INDIAN_STATES) {
    const sName = name.trim().toLowerCase();
    const sSlug = slugify(name).toLowerCase();
    if (!deleted.has(sName) && !deleted.has(sSlug) && !existingNames.has(sName)) {
      existingNames.add(sName);
      combined.push({
        _id: `static_state_${sSlug}`,
        name,
        slug: sSlug,
        createdAt: new Date(0),
      });
    }
  }

  for (const c of cityPlaces) {
    if (c.state) {
      const stateName = c.state.trim();
      const sName = stateName.toLowerCase();
      const sSlug = slugify(stateName).toLowerCase();
      if (!deleted.has(sName) && !deleted.has(sSlug) && !existingNames.has(sName)) {
        existingNames.add(sName);
        combined.push({
          _id: `static_state_${sSlug}`,
          name: stateName,
          slug: sSlug,
          createdAt: new Date(0),
        });
      }
    }
  }

  const sorted = combined.sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );
  statesLruCache.set("all", sorted);
  return sorted;
}

export async function createState(data: {
  name: string;
}): Promise<StateRecord> {
  const store = await readStore();
  const trimmedName = data.name.trim();
  const slug = slugify(trimmedName) || `state-${Date.now()}`;

  // Un-delete state if it was in deletedStates
  const sNameLower = trimmedName.toLowerCase();
  const sSlugLower = slug.toLowerCase();
  store.deletedStates = (store.deletedStates ?? []).filter((s: string) => {
    const val = s.trim().toLowerCase();
    return val !== sNameLower && val !== sSlugLower;
  });

  const states = store.states as unknown as StateRecord[];
  const existingIndex = states.findIndex(
    (s) => s.slug === slug || s.name.trim().toLowerCase() === sNameLower
  );
  if (existingIndex >= 0) {
    const existing = states[existingIndex];
    existing.name = trimmedName;
    existing.createdAt = new Date();
    await writeStore(store);
    invalidateStatesCache();
    return existing;
  }

  const state: StateRecord = {
    _id: `mem_state_${states.length + 1}_${Date.now()}`,
    name: trimmedName,
    slug,
    createdAt: new Date(),
  };
  store.states.push(state as unknown as (typeof store.states)[number]);
  await writeStore(store);
  invalidateStatesCache();
  return state;
}

export async function deleteState(id: string): Promise<boolean> {
  const trimmed = id.trim();
  if (!trimmed) return false;

  const store = await readStore();
  store.deletedStates = store.deletedStates ?? [];
  store.deletedCities = store.deletedCities ?? [];

  const cleanSlug = trimmed.replace(/^static_state_/, "");
  const trimmedLower = trimmed.toLowerCase();
  const cleanSlugLower = cleanSlug.toLowerCase();

  // 1. Check in custom states
  const customIndex = (store.states ?? []).findIndex((s) => {
    const sName = String(s.name ?? "").trim().toLowerCase();
    const sSlug = String(s.slug ?? "").toLowerCase();
    const sId = String(s._id ?? "");
    return (
      sId === trimmed ||
      sSlug === trimmedLower ||
      sSlug === cleanSlugLower ||
      sName === trimmedLower ||
      `static_state_${sSlug}` === trimmedLower
    );
  });

  let stateName = "";
  let stateSlug = "";

  if (customIndex >= 0) {
    const found = store.states[customIndex];
    stateName = String(found.name ?? "").trim();
    stateSlug = String(found.slug ?? "").trim() || slugify(stateName);
    store.states.splice(customIndex, 1);
  } else {
    // 2. Check in static default Indian states or cityPlaces
    const matchingStatic =
      DEFAULT_INDIAN_STATES.find(
        (s) =>
          slugify(s) === cleanSlugLower ||
          slugify(s) === trimmedLower ||
          s.toLowerCase() === trimmedLower
      ) ||
      cityPlaces.find(
        (c) =>
          c.state &&
          (slugify(c.state) === cleanSlugLower ||
            slugify(c.state) === trimmedLower ||
            c.state.toLowerCase() === trimmedLower)
      )?.state;

    if (matchingStatic) {
      stateName = matchingStatic.trim();
      stateSlug = slugify(stateName);
    } else {
      // Fallback: treated as state name or slug
      stateName = cleanSlug;
      stateSlug = slugify(cleanSlug);
    }
  }

  // Record in deletedStates
  const stateKeys = [stateName.toLowerCase(), stateSlug.toLowerCase()].filter(Boolean);
  for (const k of stateKeys) {
    if (!store.deletedStates.some((s) => s.toLowerCase() === k)) {
      store.deletedStates.push(k);
    }
  }

  // Cascade delete custom cities under this state
  const cities = (store.cities ?? []) as Array<{
    _id?: string;
    name?: string;
    slug?: string;
    state?: string;
  }>;
  const removedCities = cities.filter((c) => {
    const cState = String(c.state ?? "").trim().toLowerCase();
    return cState === stateName.toLowerCase() || slugify(cState) === stateSlug;
  });
  store.cities = cities.filter((c) => {
    const cState = String(c.state ?? "").trim().toLowerCase();
    return cState !== stateName.toLowerCase() && slugify(cState) !== stateSlug;
  }) as unknown as typeof store.cities;

  // Add all removed custom city slugs and static city slugs to deletedCities
  for (const c of removedCities) {
    if (c.slug && !store.deletedCities.includes(c.slug)) {
      store.deletedCities.push(c.slug);
    }
  }
  for (const c of cityPlaces) {
    if (c.state) {
      const cState = c.state.trim().toLowerCase();
      if (cState === stateName.toLowerCase() || slugify(cState) === stateSlug) {
        if (!store.deletedCities.includes(c.slug)) {
          store.deletedCities.push(c.slug);
        }
      }
    }
  }

  // Cascade delete local areas under this state
  const localAreas = (store.localAreas ?? []) as Array<{
    _id?: string;
    stateName?: string;
    stateSlug?: string;
  }>;
  store.localAreas = localAreas.filter((a) => {
    const aState = String(a.stateName ?? "").trim().toLowerCase();
    const aSlug = String(a.stateSlug ?? "").toLowerCase();
    return aState !== stateName.toLowerCase() && aSlug !== stateSlug;
  }) as unknown as typeof store.localAreas;

  await writeStore(store);
  invalidateStatesCache();
  return true;
}

export async function deleteAllLocations(): Promise<{
  deletedStates: number;
  deletedCities: number;
  deletedLocalAreas: number;
}> {
  const store = await readStore();
  const allStates = await listStates();
  const allCities = cityPlaces.map((c) => c.slug);
  const customCitySlugs = ((store.cities ?? []) as Array<{ slug?: string }>).map(
    (c) => c.slug
  ).filter(Boolean) as string[];
  const allAreasCount = (store.localAreas ?? []).length;

  store.states = [];
  store.cities = [];
  store.localAreas = [];

  const existingDelStates = new Set(
    (store.deletedStates ?? []).map((s) => s.toLowerCase())
  );
  allStates.forEach((s) => {
    existingDelStates.add(s.name.toLowerCase());
    existingDelStates.add(s.slug.toLowerCase());
  });
  store.deletedStates = Array.from(existingDelStates);

  const existingDelCities = new Set(store.deletedCities ?? []);
  allCities.forEach((s) => existingDelCities.add(s));
  customCitySlugs.forEach((s) => existingDelCities.add(s));
  store.deletedCities = Array.from(existingDelCities);

  await writeStore(store);
  invalidateStatesCache();

  return {
    deletedStates: allStates.length,
    deletedCities: allCities.length + customCitySlugs.length,
    deletedLocalAreas: allAreasCount,
  };
}

