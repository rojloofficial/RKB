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

type FilterMode = "all" | "city" | "state";

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

// Memory-optimized Damerau-Levenshtein calculation
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
  uniqueStates: string[];
  cityPrefixTrie: PrefixTrie<PlaceCityItem>;
}

function buildExplorerIndex(cities: PlaceCityItem[]): ExplorerIndex {
  const exactCityMap = new Map<string, PlaceCityItem>();
  const stateAdjacencyMap = new Map<string, PlaceCityItem[]>();
  const statesSet = new Set<string>();
  const cityPrefixTrie = new PrefixTrie<PlaceCityItem>();

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

  return {
    exactCityMap,
    stateAdjacencyMap,
    uniqueStates: Array.from(statesSet),
    cityPrefixTrie,
  };
}

interface FilterResult {
  filteredCities: PlaceCityItem[];
  mode: FilterMode;
  matchedTarget?: string;
}

function filterPlaces(
  cities: PlaceCityItem[],
  query: string,
  index?: ExplorerIndex
): FilterResult {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      filteredCities: cities,
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
          mode: "city",
          matchedTarget: alias.name,
        };
      }
    } else if (alias.type === "state" && index) {
      const stateCities = index.stateAdjacencyMap.get(aliasLower);
      if (stateCities && stateCities.length > 0) {
        return {
          filteredCities: stateCities,
          mode: "state",
          matchedTarget: alias.name,
        };
      }
    }
  }

  // 2. Exact state match
  if (index) {
    for (const [stKey, cityList] of index.stateAdjacencyMap.entries()) {
      if (stKey === q || stKey.startsWith(q)) {
        return {
          filteredCities: cityList,
          mode: "state",
          matchedTarget: cityList[0]?.state ?? q,
        };
      }
    }
  }

  // 3. Exact city match
  if (index && index.exactCityMap.has(q)) {
    const exactCity = index.exactCityMap.get(q)!;
    return {
      filteredCities: [exactCity],
      mode: "city",
      matchedTarget: exactCity.name,
    };
  }

  // 4. Prefix Trie Search
  if (index && q.length >= 2) {
    const trieCities = index.cityPrefixTrie.searchPrefix(q);
    if (trieCities.length > 0) {
      const cityMap = new Map<string, PlaceCityItem>();
      for (const c of trieCities) cityMap.set(c.slug, c);
      return {
        filteredCities: Array.from(cityMap.values()),
        mode: "city",
        matchedTarget: q,
      };
    }
  }

  // 5. Fuzzy matching with ranking
  const matchedCities: { item: PlaceCityItem; score: number }[] = [];

  for (const city of cities) {
    let bestScore = 0;
    const nameScore = getFuzzyScore(q, city.name);
    if (nameScore > bestScore) bestScore = nameScore;

    const slugScore = getFuzzyScore(q, city.slug);
    if (slugScore > bestScore) bestScore = slugScore;

    if (city.state) {
      const stateScore = getFuzzyScore(q, city.state);
      if (stateScore > bestScore) bestScore = stateScore;
    }

    if (bestScore >= 0.5) {
      matchedCities.push({ item: city, score: bestScore });
    }
  }

  matchedCities.sort((a, b) => b.score - a.score);

  return {
    filteredCities: matchedCities.map((m) => m.item),
    mode: "city",
    matchedTarget: q,
  };
}

export default function PlacesExplorer({
  initialCities = [],
  initialQuery = "",
}: {
  initialCities: PlaceCityItem[];
  initialQuery?: string;
}) {
  const [search, setSearch] = useState(initialQuery);

  const explorerIndex = useMemo(
    () => buildExplorerIndex(initialCities),
    [initialCities]
  );

  const { filteredCities, mode, matchedTarget } = useMemo(() => {
    return filterPlaces(initialCities, search, explorerIndex);
  }, [initialCities, search, explorerIndex]);

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
    <div className="mt-6 space-y-6">
      {/* Search Input Bar */}
      <div className="relative w-full max-w-2xl">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-amber-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
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
          placeholder="Search city (e.g. Mumbai, Bengaluru) or state (e.g. Maharashtra)..."
          className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-11 pr-11 text-base text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 sm:text-sm transition-all"
        />

        {search && (
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 cursor-pointer"
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
          <span className="font-bold text-slate-700">Popular Searches:</span>
          {SUGGESTED_SEARCHES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSearchChange(item)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700 transition hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900 cursor-pointer"
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Filter Status Summary */}
      {search.trim() && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
          {mode === "state" && matchedTarget ? (
            <p>
              Showing all <strong className="text-slate-900">{filteredCities.length}</strong>{" "}
              {filteredCities.length === 1 ? "city" : "cities"} in{" "}
              <span className="font-bold text-amber-700">{matchedTarget}</span>
            </p>
          ) : mode === "city" && matchedTarget ? (
            <p>
              Showing <strong className="text-slate-900">{filteredCities.length}</strong>{" "}
              {filteredCities.length === 1 ? "city" : "cities"} matching &ldquo;
              <span className="font-bold text-amber-700">{matchedTarget}</span>&rdquo;
            </p>
          ) : (
            <p>
              Found <strong className="text-slate-900">{filteredCities.length}</strong> cities matching &ldquo;
              <span className="font-bold text-amber-700">{search.trim()}</span>&rdquo;
            </p>
          )}

          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="font-semibold text-amber-600 hover:text-amber-700 underline cursor-pointer text-xs"
          >
            Reset filter
          </button>
        </div>
      )}

      {/* CITIES GRID */}
      {filteredCities.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-200/60 flex items-center justify-center text-2xl mb-3">
            🔍
          </div>
          <p className="text-base font-bold text-slate-900">
            No cities found matching &ldquo;{search.trim()}&rdquo;
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Try searching for another Indian state or city name.
          </p>
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="mt-4 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-semibold hover:bg-slate-800 transition"
          >
            View All Cities
          </button>
        </div>
      ) : (
        <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCities.map((city, idx) => (
            <Link
              key={`city-${city.slug}-${city.state ?? ""}-${idx}`}
              href={`/places/${city.slug}`}
              className="group flex w-full min-w-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer text-left block"
            >
              <div className="flex w-full min-w-0 items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-amber-500">📍</span>
                    <h3 className="text-base font-bold text-slate-900 transition-colors group-hover:text-amber-700 break-words">
                      {city.name}
                    </h3>
                  </div>
                  {city.state && (
                    <p className="mt-1 pl-4 text-xs font-medium text-slate-500 truncate">
                      {city.state}
                    </p>
                  )}
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 text-xs font-bold text-slate-700 transition-colors group-hover:bg-amber-100 group-hover:text-amber-900 group-hover:border-amber-200 whitespace-nowrap">
                  {city.adCount} {city.adCount === 1 ? "ad" : "ads"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
