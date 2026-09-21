"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDisplayDate } from "@/lib/date";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";
import { useAdminContext } from "@/components/admin/use-admin-context";

type SeoInfo = {
  hasSeo: boolean;
  updatedAt?: string;
};

export type AdminLocation = {
  id: string;
  type: "city" | "local_area";
  name: string;
  slug: string;
  state?: string;
  cityName?: string;
  citySlug?: string;
  country?: string;
  source: "Custom" | "Static" | "Default";
  seo?: SeoInfo;
  createdAt?: string | Date;
};

/**
 * Dependency-free fuzzy matching:
 * Supports direct substring, multi-token match, character-order subsequence,
 * and edit-distance typo tolerance.
 */
function fuzzyMatch(target: string, query: string): boolean {
  if (!query) return true;
  if (!target) return false;
  const t = target.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  // 1. Direct substring
  if (t.includes(q)) return true;

  // 2. Token / word-level match (all words in query must be in target)
  const tokens = q.split(/[\s\-_,]+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => t.includes(token))) {
    return true;
  }

  // 3. Subsequence matching (letters in query appear in order in target)
  let tIdx = 0;
  let qIdx = 0;
  while (tIdx < t.length && qIdx < q.length) {
    if (t[tIdx] === q[qIdx]) {
      qIdx++;
    }
    tIdx++;
  }
  if (qIdx === q.length) return true;

  // 4. Levenshtein edit distance for typo tolerance
  function lev(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  const maxDistance = q.length <= 3 ? 0 : q.length <= 5 ? 1 : 2;
  if (lev(t.slice(0, q.length), q) <= maxDistance) return true;

  const targetWords = t.split(/[\s\-_,]+/).filter(Boolean);
  for (const word of targetWords) {
    if (lev(word.slice(0, q.length), q) <= maxDistance) return true;
    if (lev(word, q) <= maxDistance) return true;
  }

  return false;
}

export default function AdminCities() {
  const router = useRouter();
  const me = useAdminContext();
  const [allLocations, setAllLocations] = useState<AdminLocation[]>([]);
  const [seoMap, setSeoMap] = useState<Record<string, SeoInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "city" | "local_area">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [citiesWithCustomSeo, setCitiesWithCustomSeo] = useState<Set<string>>(new Set());
  const loadRef = useRef(0);

  // 300ms Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Counts
  const citiesCount = useMemo(
    () => allLocations.filter((loc) => loc.type === "city").length,
    [allLocations]
  );
  const localAreasCount = useMemo(
    () => allLocations.filter((loc) => loc.type === "local_area").length,
    [allLocations]
  );

  // Debounced Fuzzy Filtered Locations
  const filteredLocations = useMemo(() => {
    let list = allLocations;
    if (filterType !== "all") {
      list = list.filter((loc) => loc.type === filterType);
    }
    const q = debouncedSearch.trim();
    if (!q) return list;
    return list.filter(
      (loc) =>
        fuzzyMatch(loc.name, q) ||
        (loc.state && fuzzyMatch(loc.state, q)) ||
        (loc.cityName && fuzzyMatch(loc.cityName, q)) ||
        (loc.slug && fuzzyMatch(loc.slug, q)) ||
        (loc.type === "city" ? fuzzyMatch("city", q) : fuzzyMatch("local area", q))
    );
  }, [allLocations, filterType, debouncedSearch]);

  const selectableIds = useMemo(
    () => filteredLocations.map((loc) => loc.id).filter(Boolean),
    [filteredLocations]
  );

  const allFilteredSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const load = useCallback(async () => {
    const loadId = ++loadRef.current;
    setLoading(true);
    try {
      const [citiesRes, areasRes, seoRes, areaSeoRes] = await Promise.all([
        fetch("/api/admin/cities", { credentials: "include" }),
        fetch("/api/admin/local-areas", { credentials: "include" }),
        fetch("/api/admin/city-seo", { credentials: "include" }),
        fetch("/api/admin/local-area-seo", { credentials: "include" }),
      ]);

      if (loadId !== loadRef.current) return;

      if (areaSeoRes.ok) {
        const areaSeoData = await areaSeoRes.json();
        const customSet = new Set<string>(
          (areaSeoData.citiesWithCustomSeo ?? []).map((s: string) =>
            s.toLowerCase().trim()
          )
        );
        setCitiesWithCustomSeo(customSet);
      }

      const map: Record<string, SeoInfo> = {};
      if (seoRes.ok) {
        const seoData = await seoRes.json();
        (seoData.seo ?? []).forEach(
          (s: { slug: string; updatedAt?: string }) => {
            map[s.slug] = { hasSeo: true, updatedAt: s.updatedAt };
          }
        );
        setSeoMap(map);
      }

      const locations: AdminLocation[] = [];

      if (citiesRes.ok) {
        const citiesData = await citiesRes.json();
        const cities = citiesData.cities ?? [];
        for (const c of cities) {
          const id = String(c._id || c.slug);
          locations.push({
            id,
            type: "city",
            name: c.name,
            slug: c.slug,
            state: c.state,
            country: c.country || "India",
            source: c.source || "Static",
            seo: map[c.slug],
          });
        }
      }

      if (areasRes.ok) {
        const areasData = await areasRes.json();
        const localAreas = areasData.localAreas ?? [];
        for (const a of localAreas) {
          const id = String(a._id || `${a.citySlug}::${a.slug}`);
          locations.push({
            id,
            type: "local_area",
            name: a.name,
            slug: a.slug,
            cityName: a.cityName,
            citySlug: a.citySlug,
            state: a.stateName,
            country: "India",
            source: String(a._id || "").startsWith("def_") ? "Default" : "Custom",
            createdAt: a.createdAt,
          });
        }
      }

      // Deduplicate combined list
      const seen = new Set<string>();
      const deduped = locations.filter((loc) => {
        const key = `${loc.type}-${loc.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setAllLocations(deduped);
      setSelectedIds(new Set());
      if (citiesRes.status === 401 || areasRes.status === 401) {
        router.replace("/admin/login");
        return;
      }
    } finally {
      if (loadRef.current === loadId) setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [load, me, router]);

  async function remove(item: AdminLocation) {
    if (!item.id) return;
    const label = item.type === "city" ? "city" : "local area";
    if (!confirm(`Delete this ${label} (${item.name})?`)) return;

    setAllLocations((prev) => prev.filter((loc) => loc.id !== item.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });

    try {
      const endpoint =
        item.type === "city" ? "/api/admin/cities" : "/api/admin/local-areas";
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: item.id }),
      });
      if (!res.ok) {
        alert(`Failed to delete ${label}.`);
        await load();
      }
    } catch {
      alert(`Failed to delete ${label}.`);
      await load();
    }
  }

  function toggleLocation(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function removeSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected location${ids.length === 1 ? "" : "s"}?`)) {
      return;
    }

    const selectedItems = allLocations.filter((loc) => selectedIds.has(loc.id));
    const cityIds = selectedItems
      .filter((loc) => loc.type === "city")
      .map((loc) => loc.id);
    const areaIds = selectedItems
      .filter((loc) => loc.type === "local_area")
      .map((loc) => loc.id);

    const idSet = new Set(ids);
    setAllLocations((prev) => prev.filter((loc) => !idSet.has(loc.id)));
    setSelectedIds(new Set());

    try {
      const requests = [];
      if (cityIds.length > 0) {
        requests.push(
          fetch("/api/admin/cities", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ids: cityIds }),
          })
        );
      }
      if (areaIds.length > 0) {
        requests.push(
          fetch("/api/admin/local-areas", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ids: areaIds }),
          })
        );
      }

      const responses = await Promise.all(requests);
      if (responses.some((r) => !r.ok)) {
        alert("Some locations could not be deleted.");
        await load();
      }
    } catch {
      alert("Failed to delete selected locations.");
      await load();
    }
  }

  async function deleteAll() {
    if (allLocations.length === 0) return;
    if (
      !confirm(
        `Delete ALL ${allLocations.length} locations (cities and local areas)? This cannot be undone.`
      )
    ) {
      return;
    }

    const cityIds = allLocations
      .filter((loc) => loc.type === "city")
      .map((loc) => loc.id);
    const areaIds = allLocations
      .filter((loc) => loc.type === "local_area")
      .map((loc) => loc.id);

    setAllLocations([]);
    setSelectedIds(new Set());

    try {
      const requests = [];
      if (cityIds.length > 0) {
        requests.push(
          fetch("/api/admin/cities", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ids: cityIds }),
          })
        );
      }
      if (areaIds.length > 0) {
        requests.push(
          fetch("/api/admin/local-areas", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ids: areaIds }),
          })
        );
      }

      const responses = await Promise.all(requests);
      if (responses.some((r) => !r.ok)) {
        alert("Some locations could not be deleted.");
        await load();
      }
    } catch {
      alert("Failed to delete all locations.");
      await load();
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-red-950">Locations</h1>
          <p className="mt-2 text-red-900">
            Manage cities and local areas available on the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/dynamic-seo"
            className="rounded-full bg-red-950 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-neutral-800 transition flex items-center gap-1.5 shadow-xs"
          >
            <span>⚡</span> Dynamic SEO
          </Link>
          <span className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white">
            Total Locations: {allLocations.length}
          </span>
          <span className="rounded-full bg-pink-100 px-3 py-1.5 text-xs font-semibold text-red-950">
            {citiesCount} Cities &bull; {localAreasCount} Local Areas
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        {/* Type Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filterType === "all"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-pink-50 text-red-950 hover:bg-pink-100 border border-pink-200"
            }`}
          >
            All ({allLocations.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("city")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filterType === "city"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-pink-50 text-red-950 hover:bg-pink-100 border border-pink-200"
            }`}
          >
            Cities ({citiesCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("local_area")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filterType === "local_area"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-pink-50 text-red-950 hover:bg-pink-100 border border-pink-200"
            }`}
          >
            Local Areas ({localAreasCount})
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={removeSelected}
              className="rounded-full bg-neutral-950 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-neutral-800 transition"
            >
              Delete selected ({selectedIds.size})
            </button>
          )}
          {allLocations.length > 0 && (
            <button
              type="button"
              onClick={deleteAll}
              className="rounded-full bg-neutral-800 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-neutral-900 transition"
            >
              Delete All ({allLocations.length})
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <input
          className="w-full rounded-xl border border-pink-200 bg-pink-50 px-3 py-2.5 text-red-950 outline-none focus:border-red-500 sm:w-80"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, city, state, or slug..."
        />
      </div>

      {loading ? (
        <AdminTableSkeleton
          headers={[
            "Select",
            "Name",
            "Type",
            "Parent City",
            "State",
            "Status",
            "Actions",
          ]}
          minWidth="min-w-[720px]"
        />
      ) : filteredLocations.length === 0 ? (
        <p className="mt-6 text-red-900">No locations found.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-red-100 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-pink-50 text-red-950">
              <tr>
                <th className="w-12 px-4 py-3 font-semibold">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    aria-label="Select all visible locations"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Parent City</th>
                <th className="px-4 py-3 font-semibold">State</th>
                <th className="px-4 py-3 font-semibold">Status / Date</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocations.map((item) => {
                return (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className="border-t border-red-50 hover:bg-pink-50/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleLocation(item.id)}
                        aria-label={`Select ${item.name}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {item.type === "city" ? (
                        <div className="flex items-center gap-1.5">
                          {citiesWithCustomSeo.has(item.slug.toLowerCase().trim()) && (
                            <span
                              title="City contains local areas with individual custom SEO"
                              className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs shrink-0"
                            />
                          )}
                          <Link
                            href={`/admin/city-seo?city=${encodeURIComponent(
                              item.slug
                            )}`}
                            className="text-red-950 underline-offset-2 hover:underline font-semibold"
                          >
                            {item.name}
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href={`/places/${item.citySlug}/${item.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-950 underline-offset-2 hover:underline font-semibold"
                        >
                          {item.name}{item.cityName ? `, ${item.cityName}` : ""}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.type === "city" ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                          City
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                          Local Area
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-red-900">
                      {item.type === "local_area" && item.cityName ? (
                        <Link
                          href={`/places/${item.citySlug}`}
                          className="font-medium text-neutral-800 hover:underline"
                        >
                          {item.cityName}
                        </Link>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-red-900">
                      {item.state || "—"}
                    </td>
                    <td className="px-4 py-3 text-red-900">
                      {item.type === "city" ? (
                        item.seo?.hasSeo ? (
                          <span className="text-xs text-emerald-700 font-medium">
                            SEO Set{" "}
                            {item.seo.updatedAt
                              ? `(${formatDisplayDate(item.seo.updatedAt)})`
                              : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">Not set</span>
                        )
                      ) : item.createdAt ? (
                        <span className="text-xs text-neutral-500">
                          {formatDisplayDate(item.createdAt)}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">Standard</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              item.type === "city"
                                ? `/places/${item.slug}`
                                : `/places/${item.citySlug}/${item.slug}`
                            )
                          }
                          className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-emerald-700 transition"
                        >
                          View
                        </button>
                        {item.type === "city" ? (
                          <Link
                            href={`/admin/city-seo?city=${encodeURIComponent(
                              item.slug
                            )}`}
                            className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-red-700 transition"
                          >
                            Edit SEO
                          </Link>
                        ) : (
                          <Link
                            href={`/admin/city-seo?city=${encodeURIComponent(
                              item.citySlug || ""
                            )}&area=${encodeURIComponent(item.slug)}`}
                            className="rounded-full bg-purple-600 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-purple-700 transition"
                          >
                            Edit SEO
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          className="rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition"
                        >
                          {item.type === "city" ? "Delete City" : "Delete Area"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
