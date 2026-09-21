"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PrefixTrie } from "@/lib/trie";

export type PlaceCityItem = {
  name: string;
  slug: string;
  state?: string;
  adCount: number;
};

export type PlaceLocalAreaItem = {
  name: string;
  slug: string;
  cityName: string;
  citySlug: string;
};

type FilterMode = "all" | "city" | "state" | "area";

// Common aliases for Indian cities and states
const LOCATION_ALIASES: Record<string, { type: "city" | "state"; name: string }> = {
  bangalore: { type: "city", name: "Bengaluru" },
  bombay: { type: "city", name: "Mumbai" },
  calcutta: { type: "city", name: "Kolkata" },
  madras: { type: "city", name: "Chennai" },
  poona: { type: "city", name: "Pune" },
  trivandrum: { type: "city", name: "Thiruvananthapuram" },
  cochin: { type: "city", name: "Kochi" },
  benaras: { type: "city", name: "Varanasi" },
  banaras: { type: "city", name: "Varanasi" },
  kashi: { type: "city", name: "Varanasi" },
  baroda: { type: "city", name: "Vadodara" },
  gurgaon: { type: "city", name: "Gurugram" },
  orissa: { type: "state", name: "Odisha" },
  pondicherry: { type: "city", name: "Puducherry" },
};

const SUGGESTED_SEARCHES = [
  "Maharashtra",
  "Gujarat",
  "Delhi",
  "Mumbai",
  "Rajasthan",
  "Bengaluru",
  "Kolkata",
  "Chennai",
  "Hyderabad",
  "Pune",
];

// Memory-optimized Damerau-Levenshtein calculation using 3 sliding row buffers (O(min(N, M)) space)
function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  if (al < bl) return damerauLevenshtein(b, a);

  let r0 = new Int32Array(bl + 1);
  let r1 = new Int32Array(bl + 1);
  let r2 = new Int32Array(bl + 1);

  for (let j = 0; j <= bl; j++) {
    r1[j] = j;
  }

  for (let i = 1; i <= al; i++) {
    r2[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let min = Math.min(
        r1[j] + 1,
        r2[j - 1] + 1,
        r1[j - 1] + cost
      );

      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        min = Math.min(min, r0[j - 2] + 1);
      }
      r2[j] = min;
    }

    const temp = r0;
    r0 = r1;
    r1 = r2;
    r2 = temp;
  }

  return r1[bl];
}

function getFuzzyScore(query: string, target: string): number {
  const q = query.trim().toLowerCase();
  const t = target.trim().toLowerCase();

  if (!q || !t) return 0;
  if (q === t) return 1.0;

  if (t.startsWith(q)) {
    return 0.92 + Math.min(0.07, (q.length / t.length) * 0.07);
  }

  const idx = t.indexOf(q);
  if (idx !== -1) {
    return Math.max(0.75, 0.85 - idx * 0.02 + (q.length / t.length) * 0.05);
  }

  const words = t.split(/[\s-]+/);
  for (const word of words) {
    if (word === q) return 0.93;
    if (word.startsWith(q)) return 0.88;
  }

  const dist = damerauLevenshtein(q, t);
  const maxLen = Math.max(q.length, t.length);

  let maxAllowedDist = 1;
  if (q.length >= 8) maxAllowedDist = 3;
  else if (q.length >= 5) maxAllowedDist = 2;
  else if (q.length <= 2) maxAllowedDist = 0;

  if (dist <= maxAllowedDist) {
    return Math.max(0.6, 0.85 * (1 - dist / maxLen));
  }

  for (const word of words) {
    const wDist = damerauLevenshtein(q, word);
    const wMax = Math.max(q.length, word.length);
    let wAllowed = 1;
    if (q.length >= 7) wAllowed = 2;
    else if (q.length <= 2) wAllowed = 0;

    if (wDist <= wAllowed) {
      return Math.max(0.55, 0.80 * (1 - wDist / wMax));
    }
  }

  return 0;
}

interface ExplorerIndex {
  exactCityMap: Map<string, PlaceCityItem>;
  stateAdjacencyMap: Map<string, PlaceCityItem[]>;
  localAreaByCityMap: Map<string, PlaceLocalAreaItem[]>;
  uniqueStates: string[];
  cityPrefixTrie: PrefixTrie<PlaceCityItem>;
  areaPrefixTrie: PrefixTrie<PlaceLocalAreaItem>;
}

function buildExplorerIndex(
  cities: PlaceCityItem[],
  localAreas: PlaceLocalAreaItem[]
): ExplorerIndex {
  const exactCityMap = new Map<string, PlaceCityItem>();
  const stateAdjacencyMap = new Map<string, PlaceCityItem[]>();
  const localAreaByCityMap = new Map<string, PlaceLocalAreaItem[]>();
  const statesSet = new Set<string>();
  const cityPrefixTrie = new PrefixTrie<PlaceCityItem>();
  const areaPrefixTrie = new PrefixTrie<PlaceLocalAreaItem>();

  for (const c of cities) {
    const sName = c.name.toLowerCase().trim();
    const sSlug = c.slug.toLowerCase().trim();
    exactCityMap.set(sName, c);
    exactCityMap.set(sSlug, c);

    cityPrefixTrie.insert(c.name, c);
    cityPrefixTrie.insert(c.slug, c);

    if (c.state) {
      const st = c.state.trim();
      statesSet.add(st);
      const stKey = st.toLowerCase();
      let list = stateAdjacencyMap.get(stKey);
      if (!list) {
        list = [];
        stateAdjacencyMap.set(stKey, list);
      }
      list.push(c);
      cityPrefixTrie.insert(st, c);
    }
  }

  for (const a of localAreas) {
    const cSlug = a.citySlug.toLowerCase().trim();
    let cityAreaList = localAreaByCityMap.get(cSlug);
    if (!cityAreaList) {
      cityAreaList = [];
      localAreaByCityMap.set(cSlug, cityAreaList);
    }
    cityAreaList.push(a);

    areaPrefixTrie.insert(a.name, a);
    areaPrefixTrie.insert(a.slug, a);
    areaPrefixTrie.insert(`${a.cityName} ${a.name}`, a);
  }

  return {
    exactCityMap,
    stateAdjacencyMap,
    localAreaByCityMap,
    uniqueStates: Array.from(statesSet),
    cityPrefixTrie,
    areaPrefixTrie,
  };
}

interface FilterResult {
  filteredCities: PlaceCityItem[];
  filteredAreas: PlaceLocalAreaItem[];
  mode: FilterMode;
  matchedTarget?: string;
}

function filterPlaces(
  cities: PlaceCityItem[],
  localAreas: PlaceLocalAreaItem[],
  query: string,
  index?: ExplorerIndex
): FilterResult {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      filteredCities: cities,
      filteredAreas: localAreas,
      mode: "all",
    };
  }

  // 1. Alias lookup
  const alias = LOCATION_ALIASES[q];
  if (alias) {
    const aliasLower = alias.name.toLowerCase();
    if (alias.type === "city") {
      const matched = index
        ? index.exactCityMap.has(aliasLower)
          ? [index.exactCityMap.get(aliasLower)!]
          : []
        : cities.filter((c) => c.name.toLowerCase() === aliasLower);
      if (matched.length > 0) {
        return {
          filteredCities: matched,
          filteredAreas: index?.localAreaByCityMap.get(matched[0].slug.toLowerCase()) ?? [],
          mode: "city",
          matchedTarget: alias.name,
        };
      }
    } else if (alias.type === "state") {
      const stateCities = index
        ? index.stateAdjacencyMap.get(aliasLower) ?? []
        : cities.filter((c) => c.state && c.state.toLowerCase() === aliasLower);
      if (stateCities.length > 0) {
        return {
          filteredCities: stateCities,
          filteredAreas: [],
          mode: "state",
          matchedTarget: alias.name,
        };
      }
    }
  }

  // 2. Exact city match
  if (index) {
    const exactCity = index.exactCityMap.get(q);
    if (exactCity) {
      return {
        filteredCities: [exactCity],
        filteredAreas: index.localAreaByCityMap.get(exactCity.slug.toLowerCase()) ?? [],
        mode: "city",
        matchedTarget: exactCity.name,
      };
    }

    const exactStateCities = index.stateAdjacencyMap.get(q);
    if (exactStateCities && exactStateCities.length > 0) {
      return {
        filteredCities: exactStateCities,
        filteredAreas: [],
        mode: "state",
        matchedTarget: exactStateCities[0]?.state,
      };
    }
  }

  // 3. Local area search match
  const matchedAreas: PlaceLocalAreaItem[] = [];
  for (const area of localAreas) {
    const nameScore = getFuzzyScore(q, area.name);
    const slugScore = getFuzzyScore(q, area.slug);
    const combinedScore = getFuzzyScore(q, `${area.cityName} ${area.name}`);
    if (Math.max(nameScore, slugScore, combinedScore) >= 0.55) {
      matchedAreas.push(area);
    }
  }

  // 4. City scores calculation
  const scoredCities: Array<{ city: PlaceCityItem; score: number }> = [];
  let bestCityScore = 0;

  for (const city of cities) {
    const nameScore = getFuzzyScore(q, city.name);
    const slugScore = getFuzzyScore(q, city.slug);
    const maxScore = Math.max(nameScore, slugScore);
    if (maxScore >= 0.5) {
      scoredCities.push({ city, score: maxScore });
    }
    if (maxScore > bestCityScore) {
      bestCityScore = maxScore;
    }
  }

  scoredCities.sort((a, b) => b.score - a.score);

  // 5. State match calculation
  const uniqueStates = index
    ? index.uniqueStates
    : (Array.from(new Set(cities.map((c) => c.state).filter(Boolean))) as string[]);

  let bestState = "";
  let bestStateScore = 0;
  for (const st of uniqueStates) {
    const score = getFuzzyScore(q, st);
    if (score > bestStateScore) {
      bestStateScore = score;
      bestState = st;
    }
  }

  if (bestStateScore >= 0.65 && bestStateScore > bestCityScore) {
    const stateCities = cities.filter(
      (c) => c.state && c.state.trim().toLowerCase() === bestState.toLowerCase()
    );
    return {
      filteredCities: stateCities,
      filteredAreas: matchedAreas,
      mode: "state",
      matchedTarget: bestState,
    };
  }

  if (matchedAreas.length > 0 && bestCityScore < 0.7) {
    const areaCitySlugs = new Set(matchedAreas.map((a) => a.citySlug.toLowerCase()));
    const relatedCities = cities.filter((c) => areaCitySlugs.has(c.slug.toLowerCase()));

    return {
      filteredCities: relatedCities.length > 0 ? relatedCities : scoredCities.map((sc) => sc.city),
      filteredAreas: matchedAreas,
      mode: "area",
      matchedTarget: matchedAreas[0].name,
    };
  }

  const resultCities = scoredCities.map((sc) => sc.city);
  return {
    filteredCities: resultCities,
    filteredAreas: matchedAreas,
    mode: scoredCities.length > 0 ? "city" : "all",
    matchedTarget: scoredCities[0]?.city.name,
  };
}

export default function PlacesExplorer({
  initialCities,
  initialLocalAreas = [],
  initialQuery = "",
}: {
  initialCities: PlaceCityItem[];
  initialLocalAreas?: PlaceLocalAreaItem[];
  initialQuery?: string;
}) {
  const [search, setSearch] = useState(initialQuery);

  const explorerIndex = useMemo(
    () => buildExplorerIndex(initialCities, initialLocalAreas),
    [initialCities, initialLocalAreas]
  );

  const { filteredCities, filteredAreas, mode, matchedTarget } = useMemo(() => {
    return filterPlaces(initialCities, initialLocalAreas, search, explorerIndex);
  }, [initialCities, initialLocalAreas, search, explorerIndex]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (val.trim()) {
        url.searchParams.set("q", val.trim());
      } else {
        url.searchParams.delete("q");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }

  return (
    <div className="mt-4 space-y-6">
      {/* Search Bar */}
      <div className="relative w-full max-w-2xl">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search city (e.g. Mumbai) or local area (e.g. Andheri, Koramangala)..."
          className="w-full rounded-2xl border border-neutral-300 bg-white py-3.5 pl-11 pr-11 text-base text-neutral-900 shadow-xs placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 sm:text-sm"
        />

        {search && (
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-neutral-900 cursor-pointer"
            aria-label="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggested Quick Filters */}
      {!search.trim() && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-bold text-neutral-900">Popular Searches:</span>
          {SUGGESTED_SEARCHES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSearchChange(item)}
              className="rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 font-medium text-neutral-800 transition hover:bg-neutral-900 hover:text-white"
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Filter Status Summary */}
      {search.trim() && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
          {mode === "state" && matchedTarget ? (
            <p>
              Showing all {filteredCities.length}{" "}
              {filteredCities.length === 1 ? "city" : "cities"} in{" "}
              <span className="font-bold text-neutral-900">{matchedTarget}</span>
            </p>
          ) : mode === "area" && matchedTarget ? (
            <p>
              Found {filteredAreas.length} local areas matching &ldquo;
              <span className="font-bold text-neutral-900">{search.trim()}</span>&rdquo;
            </p>
          ) : mode === "city" && matchedTarget ? (
            <p>
              Showing {filteredCities.length}{" "}
              {filteredCities.length === 1 ? "city" : "cities"} matching &ldquo;
              <span className="font-bold text-neutral-900">{matchedTarget}</span>&rdquo;
            </p>
          ) : (
            <p>
              Found {filteredCities.length} cities and {filteredAreas.length} local areas
            </p>
          )}

          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="font-medium text-neutral-900 underline hover:text-black"
          >
            Reset filter
          </button>
        </div>
      )}

      {/* ALL LOCATIONS (CITIES & LOCAL AREAS TOGETHER IN ONE GRID) */}
      {filteredCities.length === 0 && filteredAreas.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
          <p className="text-base font-semibold text-neutral-900">
            No locations found matching &ldquo;{search.trim()}&rdquo;
          </p>
        </div>
      ) : (
        <div className="grid w-full min-w-0 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCities.map((city, idx) => (
            <Link
              key={`city-${city.slug}-${city.state ?? ""}-${idx}`}
              href={`/places/${city.slug}`}
              className="group flex w-full min-w-0 flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-4 transition-all hover:bg-neutral-950 hover:border-neutral-950 hover:shadow-md cursor-pointer text-left block"
            >
              <div className="flex w-full min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-neutral-900 transition-colors group-hover:text-white break-words">
                    {city.name}
                  </h3>
                  {city.state && (
                    <p className="mt-0.5 text-xs font-medium text-neutral-500 transition-colors group-hover:text-neutral-300 truncate">
                      {city.state}
                    </p>
                  )}
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 transition-colors group-hover:bg-neutral-800 group-hover:border-neutral-700 group-hover:text-white whitespace-nowrap">
                  {city.adCount} {city.adCount === 1 ? "ad" : "ads"}
                </span>
              </div>
            </Link>
          ))}

          {filteredAreas.map((area, idx) => {
            const parentCity = explorerIndex.exactCityMap.get(area.citySlug.toLowerCase());

            return (
              <Link
                key={`area-${area.citySlug}-${area.slug}-${idx}`}
                href={`/places/${area.citySlug}/${area.slug}`}
                className="group flex w-full min-w-0 flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-4 transition-all hover:bg-neutral-950 hover:border-neutral-950 hover:shadow-md cursor-pointer text-left block"
              >
                <div className="flex w-full min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-neutral-900 transition-colors group-hover:text-white break-words">
                      {area.name}
                    </h3>
                    <p className="mt-0.5 text-xs font-medium text-neutral-500 transition-colors group-hover:text-neutral-300 truncate">
                      {area.cityName}
                      {parentCity?.state ? `, ${parentCity.state}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 transition-colors group-hover:bg-neutral-800 group-hover:border-neutral-700 group-hover:text-white whitespace-nowrap">
                    Local Area
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
