"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDisplayDate } from "@/lib/date";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";
import { useAdminContext } from "@/components/admin/use-admin-context";

export type SeoStatus = "published" | "draft" | "not_done";

export type CitySeoInfo = {
  hasSeo: boolean;
  status: SeoStatus;
  updatedAt?: string;
};

export type AdminCity = {
  id: string;
  name: string;
  slug: string;
  state?: string;
  country?: string;
  source: "Custom" | "Static" | "Default";
  seo: CitySeoInfo;
};

/**
 * Dependency-free fuzzy matching for city names, slugs, states
 */
function fuzzyMatch(target: string, query: string): boolean {
  if (!query) return true;
  if (!target) return false;
  const t = target.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  // 1. Direct substring
  if (t.includes(q)) return true;

  // 2. Token / word-level match
  const tokens = q.split(/[\s\-_,]+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => t.includes(token))) {
    return true;
  }

  // 3. Subsequence matching
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
  const [cities, setCities] = useState<AdminCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "not_done">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const loadRef = useRef(0);

  // 300ms Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Counts by SEO status
  const publishedCount = useMemo(
    () => cities.filter((c) => c.seo.status === "published").length,
    [cities]
  );
  const draftCount = useMemo(
    () => cities.filter((c) => c.seo.status === "draft").length,
    [cities]
  );
  const notDoneCount = useMemo(
    () => cities.filter((c) => c.seo.status === "not_done").length,
    [cities]
  );

  // Filtered cities based on status and search query
  const filteredCities = useMemo(() => {
    let list = cities;
    if (statusFilter !== "all") {
      list = list.filter((c) => c.seo.status === statusFilter);
    }
    const q = debouncedSearch.trim();
    if (!q) return list;
    return list.filter(
      (c) =>
        fuzzyMatch(c.name, q) ||
        (c.state && fuzzyMatch(c.state, q)) ||
        fuzzyMatch(c.slug, q)
    );
  }, [cities, statusFilter, debouncedSearch]);

  const selectableIds = useMemo(
    () => filteredCities.map((c) => c.id).filter(Boolean),
    [filteredCities]
  );

  const allFilteredSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const load = useCallback(async () => {
    const loadId = ++loadRef.current;
    setLoading(true);
    try {
      const [citiesRes, seoRes] = await Promise.all([
        fetch("/api/admin/cities", { credentials: "include" }),
        fetch("/api/admin/city-seo", { credentials: "include" }),
      ]);

      if (loadId !== loadRef.current) return;

      const seoMap: Record<string, { status: SeoStatus; updatedAt?: string }> = {};
      if (seoRes.ok) {
        const seoData = await seoRes.json();
        (seoData.seo ?? []).forEach(
          (s: { slug: string; status?: "published" | "draft"; updatedAt?: string }) => {
            const key = String(s.slug || "").toLowerCase().trim();
            seoMap[key] = {
              status: s.status === "published" ? "published" : "draft",
              updatedAt: s.updatedAt,
            };
          }
        );
      }

      const list: AdminCity[] = [];
      if (citiesRes.ok) {
        const citiesData = await citiesRes.json();
        const rawCities = citiesData.cities ?? [];
        for (const c of rawCities) {
          const id = String(c._id || c.slug);
          const slugKey = String(c.slug || "").toLowerCase().trim();
          const seoItem = seoMap[slugKey];
          const hasSeo = Boolean(seoItem);
          const status: SeoStatus = seoItem ? seoItem.status : "not_done";

          list.push({
            id,
            name: c.name,
            slug: c.slug,
            state: c.state,
            country: c.country || "India",
            source: c.source || "Static",
            seo: {
              hasSeo,
              status,
              updatedAt: seoItem?.updatedAt,
            },
          });
        }
      }

      // Deduplicate by city id/slug
      const seen = new Set<string>();
      const deduped = list.filter((c) => {
        if (seen.has(c.slug)) return false;
        seen.add(c.slug);
        return true;
      });

      setCities(deduped);
      setSelectedIds(new Set());
      if (citiesRes.status === 401) {
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

  async function removeCity(item: AdminCity) {
    if (!item.id) return;
    if (!confirm(`Delete city "${item.name}"?`)) return;

    setCities((prev) => prev.filter((c) => c.id !== item.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });

    try {
      const res = await fetch("/api/admin/cities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: item.id }),
      });
      if (!res.ok) {
        alert("Failed to delete city.");
        await load();
      }
    } catch {
      alert("Failed to delete city.");
      await load();
    }
  }

  function toggleCity(id: string) {
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
    if (!confirm(`Delete ${ids.length} selected cit${ids.length === 1 ? "y" : "ies"}?`)) {
      return;
    }

    const idSet = new Set(ids);
    setCities((prev) => prev.filter((c) => !idSet.has(c.id)));
    setSelectedIds(new Set());

    try {
      const res = await fetch("/api/admin/cities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        alert("Some cities could not be deleted.");
        await load();
      }
    } catch {
      alert("Failed to delete selected cities.");
      await load();
    }
  }

  async function deleteAll() {
    if (cities.length === 0) return;
    if (!confirm(`Delete ALL ${cities.length} cities? This action cannot be undone.`)) {
      return;
    }

    const ids = cities.map((c) => c.id);
    setCities([]);
    setSelectedIds(new Set());

    try {
      const res = await fetch("/api/admin/cities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        alert("Some cities could not be deleted.");
        await load();
      }
    } catch {
      alert("Failed to delete all cities.");
      await load();
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Cities <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Directory</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Manage city pages and view SEO setup status with live indicator dots.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/city-seo"
            className="rounded-xl border border-amber-500/30 bg-amber-500/15 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition flex items-center gap-1.5 shadow-xs"
          >
            <span>📝</span> City SEO Editor
          </Link>
          <span className="rounded-xl border border-white/10 bg-slate-800/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs">
            Total: {cities.length} Cities
          </span>
        </div>
      </div>

      {/* SEO Status Legend Banner */}
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-xs">
        <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
          SEO Status Legend:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] shrink-0" />
          <span className="text-slate-200 font-semibold">Green: SEO Done (Published)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)] shrink-0" />
          <span className="text-slate-200 font-semibold">Yellow: In Draft</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)] shrink-0" />
          <span className="text-slate-200 font-semibold">Red: SEO Not Done</span>
        </div>
      </div>

      {/* Filter Tabs & Bulk Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              statusFilter === "all"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md"
                : "bg-slate-800/70 border border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            All Cities ({cities.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("published")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "published"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "bg-slate-800/70 border border-emerald-500/20 text-emerald-300 hover:bg-slate-800 hover:text-emerald-200"
            }`}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
            SEO Done ({publishedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("draft")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "draft"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-800/70 border border-amber-500/20 text-amber-300 hover:bg-slate-800 hover:text-amber-200"
            }`}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
            In Draft ({draftCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("not_done")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "not_done"
                ? "bg-rose-500 text-white shadow-md"
                : "bg-slate-800/70 border border-rose-500/20 text-rose-300 hover:bg-slate-800 hover:text-rose-200"
            }`}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />
            SEO Not Done ({notDoneCount})
          </button>
        </div>

        {/* Bulk Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={removeSelected}
              className="rounded-xl border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 px-4 py-2 text-xs font-semibold text-rose-300 transition"
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
          {cities.length > 0 && (
            <button
              type="button"
              onClick={deleteAll}
              className="rounded-xl border border-rose-500/40 bg-rose-500/20 hover:bg-rose-500/30 px-4 py-2 text-xs font-bold text-rose-300 transition"
            >
              Delete All ({cities.length})
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mt-4">
        <input
          className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 sm:w-80 transition"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by city name, state, or slug..."
        />
      </div>

      {/* Table */}
      {loading ? (
        <AdminTableSkeleton
          headers={[
            "Select",
            "City Name",
            "State",
            "Country",
            "SEO Status",
            "Actions",
          ]}
          minWidth="min-w-[720px]"
        />
      ) : filteredCities.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center">
          <p className="text-sm font-semibold text-slate-400">No cities found.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-md">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-800/80 text-amber-400 font-bold uppercase tracking-wider text-xs border-b border-white/10">
              <tr>
                <th className="w-12 px-4 py-3.5 font-semibold">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    className="accent-amber-500 rounded cursor-pointer"
                    aria-label="Select all visible cities"
                  />
                </th>
                <th className="px-4 py-3.5 font-semibold">City Name</th>
                <th className="px-4 py-3.5 font-semibold">State</th>
                <th className="px-4 py-3.5 font-semibold">Country</th>
                <th className="px-4 py-3.5 font-semibold">SEO Status</th>
                <th className="px-4 py-3.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCities.map((item) => {
                const seoStatus = item.seo.status;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleCity(item.id)}
                        className="accent-amber-500 rounded cursor-pointer"
                        aria-label={`Select ${item.name}`}
                      />
                    </td>

                    {/* City Name with Status Dot */}
                    <td className="px-4 py-3.5 font-semibold">
                      <div className="flex items-center gap-2.5">
                        {/* Red, Yellow, Green status dot */}
                        {seoStatus === "published" ? (
                          <span
                            title="SEO Done (Published)"
                            className="inline-block h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] shrink-0"
                          />
                        ) : seoStatus === "draft" ? (
                          <span
                            title="SEO Saved in Draft"
                            className="inline-block h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)] shrink-0"
                          />
                        ) : (
                          <span
                            title="SEO Not Done"
                            className="inline-block h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)] shrink-0"
                          />
                        )}

                        <Link
                          href={`/admin/city-seo?city=${encodeURIComponent(item.slug)}`}
                          className="text-white hover:text-amber-400 transition"
                        >
                          {item.name}
                        </Link>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      {item.state || "—"}
                    </td>

                    <td className="px-4 py-3.5 text-slate-300">
                      {item.country || "India"}
                    </td>

                    {/* Status Badge & Timestamp */}
                    <td className="px-4 py-3.5">
                      {seoStatus === "published" ? (
                        <div className="flex flex-col">
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            SEO Done
                          </span>
                          {item.seo.updatedAt && (
                            <span className="mt-0.5 text-[11px] text-slate-500">
                              {formatDisplayDate(item.seo.updatedAt)}
                            </span>
                          )}
                        </div>
                      ) : seoStatus === "draft" ? (
                        <div className="flex flex-col">
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            In Draft
                          </span>
                          {item.seo.updatedAt && (
                            <span className="mt-0.5 text-[11px] text-slate-500">
                              {formatDisplayDate(item.seo.updatedAt)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Not Done
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/places/${item.slug}`)}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition"
                        >
                          View
                        </button>
                        <Link
                          href={`/admin/city-seo?city=${encodeURIComponent(item.slug)}`}
                          className="rounded-xl border border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 text-xs font-semibold text-amber-300 transition"
                        >
                          Edit SEO
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeCity(item)}
                          className="rounded-xl border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-300 transition"
                        >
                          Delete
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
