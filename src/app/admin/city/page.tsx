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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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

export type CitySortOption =
  | "updated-seo-last"
  | "status-draft"
  | "status-not-done"
  | "status-published"
  | "name-asc"
  | "name-desc"
  | "state"
  | "updated";

export default function AdminCities() {
  const router = useRouter();
  const me = useAdminContext();
  const [cities, setCities] = useState<AdminCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "not_done">("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [sortBy, setSortBy] = useState<CitySortOption>("updated-seo-last");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const loadRef = useRef(0);

  // 300ms Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
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

  // Unique states for state filter dropdown
  const uniqueStates = useMemo(() => {
    const statesMap = new Map<string, number>();
    for (const c of cities) {
      if (c.state && c.state.trim()) {
        const s = c.state.trim();
        statesMap.set(s, (statesMap.get(s) || 0) + 1);
      }
    }
    return Array.from(statesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [cities]);

  // Filtered and sorted cities
  const filteredAndSortedCities = useMemo(() => {
    let list = cities;

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((c) => c.seo.status === statusFilter);
    }

    // State filter
    if (selectedState !== "all") {
      list = list.filter((c) => c.state?.trim().toLowerCase() === selectedState.toLowerCase());
    }

    // Search query filter
    const q = debouncedSearch.trim();
    if (q) {
      list = list.filter(
        (c) =>
          fuzzyMatch(c.name, q) ||
          (c.state && fuzzyMatch(c.state, q)) ||
          fuzzyMatch(c.slug, q)
      );
    }

    // Sorting
    const sorted = [...list];
    switch (sortBy) {
      case "updated-seo-last":
        sorted.sort((a, b) => {
          // 1. Move Updated SEO (Published) to the very last of the list
          const aUpdated = a.seo.status === "published" ? 1 : 0;
          const bUpdated = b.seo.status === "published" ? 1 : 0;
          if (aUpdated !== bUpdated) {
            return aUpdated - bUpdated; // 0 (pending) comes first, 1 (updated) comes last
          }

          // 2. Among pending cities, show in-progress drafts first, then not done
          if (a.seo.status === "draft" && b.seo.status === "not_done") return -1;
          if (b.seo.status === "draft" && a.seo.status === "not_done") return 1;

          // 3. Alphabetical by city name
          return a.name.localeCompare(b.name);
        });
        break;
      case "status-not-done":
        sorted.sort((a, b) => {
          if (a.seo.status === "not_done" && b.seo.status !== "not_done") return -1;
          if (b.seo.status === "not_done" && a.seo.status !== "not_done") return 1;
          return a.name.localeCompare(b.name);
        });
        break;
      case "status-draft":
        sorted.sort((a, b) => {
          if (a.seo.status === "draft" && b.seo.status !== "draft") return -1;
          if (b.seo.status === "draft" && a.seo.status !== "draft") return 1;
          return a.name.localeCompare(b.name);
        });
        break;
      case "status-published":
        sorted.sort((a, b) => {
          if (a.seo.status === "published" && b.seo.status !== "published") return -1;
          if (b.seo.status === "published" && a.seo.status !== "published") return 1;
          return a.name.localeCompare(b.name);
        });
        break;
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "state":
        sorted.sort((a, b) => (a.state || "").localeCompare(b.state || ""));
        break;
      case "updated":
        sorted.sort((a, b) => {
          const dateA = a.seo.updatedAt ? new Date(a.seo.updatedAt).getTime() : 0;
          const dateB = b.seo.updatedAt ? new Date(b.seo.updatedAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
    }

    return sorted;
  }, [cities, statusFilter, selectedState, debouncedSearch, sortBy]);

  // Pagination calculation
  const totalItems = filteredAndSortedCities.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedCities = useMemo(() => {
    if (pageSize === -1) return filteredAndSortedCities;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedCities.slice(start, start + pageSize);
  }, [filteredAndSortedCities, currentPage, pageSize]);

  const selectableIds = useMemo(
    () => paginatedCities.map((c) => c.id).filter(Boolean),
    [paginatedCities]
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
          (s: { slug: string; name?: string; urlSlug?: string; status?: "published" | "draft"; updatedAt?: string }) => {
            const status: SeoStatus = s.status === "published" ? "published" : "draft";
            const info = { status, updatedAt: s.updatedAt };

            if (s.slug) seoMap[String(s.slug).toLowerCase().trim()] = info;
            if (s.urlSlug) seoMap[String(s.urlSlug).toLowerCase().trim()] = info;
            if (s.name) {
              seoMap[slugify(s.name)] = info;
              seoMap[String(s.name).toLowerCase().trim()] = info;
            }
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
          const nameKey = String(c.name || "").toLowerCase().trim();
          const slugifiedName = slugify(c.name || "");

          const seoItem = seoMap[slugKey] || seoMap[slugifiedName] || seoMap[nameKey];
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
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 shadow-inner">
              <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
            <span>
              Cities <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Directory</span>
            </span>
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
            Manage Indian city pages, inspect SEO status, resume saved drafts, or publish live metadata.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/city-seo"
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-4 py-2 text-xs font-bold text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <span>✨</span> Create New City SEO
          </Link>
          <button
            type="button"
            onClick={() => load()}
            className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-300 transition flex items-center gap-1.5"
            title="Refresh cities"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* KPI Stat Cards (Interactive Filter Triggers) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Cities */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setCurrentPage(1);
          }}
          className={`rounded-2xl border p-4 text-left transition cursor-pointer backdrop-blur-md ${
            statusFilter === "all"
              ? "border-amber-500/50 bg-slate-800/90 shadow-lg ring-2 ring-amber-500/30"
              : "border-white/10 bg-slate-900/60 hover:bg-slate-800/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Cities</span>
            <span className="text-lg">🏙️</span>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-white">{cities.length}</p>
          <span className="mt-1 block text-[11px] text-slate-400">All registered cities</span>
        </button>

        {/* 🔴 SEO Not Done */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("not_done");
            setCurrentPage(1);
          }}
          className={`rounded-2xl border p-4 text-left transition cursor-pointer backdrop-blur-md ${
            statusFilter === "not_done"
              ? "border-rose-500/50 bg-rose-950/30 shadow-lg ring-2 ring-rose-500/30"
              : "border-white/10 bg-slate-900/60 hover:bg-slate-800/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">SEO Not Done</span>
            <span className="inline-block h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-rose-300">{notDoneCount}</p>
          <span className="mt-1 block text-[11px] text-rose-400/80">Needs SEO setup</span>
        </button>

        {/* 🟡 In Draft */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("draft");
            setCurrentPage(1);
          }}
          className={`rounded-2xl border p-4 text-left transition cursor-pointer backdrop-blur-md ${
            statusFilter === "draft"
              ? "border-amber-500/50 bg-amber-950/30 shadow-lg ring-2 ring-amber-500/30"
              : "border-white/10 bg-slate-900/60 hover:bg-slate-800/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">In Draft</span>
            <span className="inline-block h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-amber-300">{draftCount}</p>
          <span className="mt-1 block text-[11px] text-amber-400/80">Saved drafts ready to edit</span>
        </button>

        {/* 🟢 SEO Published Live (Placed Last) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("published");
            setCurrentPage(1);
          }}
          className={`rounded-2xl border p-4 text-left transition cursor-pointer backdrop-blur-md ${
            statusFilter === "published"
              ? "border-emerald-500/50 bg-emerald-950/30 shadow-lg ring-2 ring-emerald-500/30"
              : "border-white/10 bg-slate-900/60 hover:bg-slate-800/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">SEO Published</span>
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-300">{publishedCount}</p>
          <span className="mt-1 block text-[11px] text-emerald-400/80">Live on public site</span>
        </button>
      </div>

      {/* SEO Status Legend Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-xs backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
            SEO Indicator Dots:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] shrink-0" />
            <span className="text-slate-200 font-semibold">Red: SEO Not Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] shrink-0" />
            <span className="text-slate-200 font-semibold">Yellow: In Draft (Saved content, opens where you left off)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0" />
            <span className="text-slate-200 font-semibold">Green: SEO Done (Published live &mdash; placed in the last)</span>
          </div>
        </div>

        <div className="text-slate-400 text-[11px]">
          Showing <strong className="text-white">{filteredAndSortedCities.length}</strong> matching cities
        </div>
      </div>

      {/* Multi-Filter & Search Toolbar */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl backdrop-blur-md space-y-4">
        {/* Top row: Search Bar, State Selector, Sort Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px] sm:max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="w-full rounded-xl border border-white/15 bg-slate-800/90 pl-10 pr-9 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city name, state, or slug..."
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          {/* State Filter & Sort By Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter by State */}
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-white/15 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-amber-500"
            >
              <option value="all">All States ({uniqueStates.length})</option>
              {uniqueStates.map(([st, cnt]) => (
                <option key={st} value={st} className="bg-slate-900">
                  {st} ({cnt})
                </option>
              ))}
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CitySortOption)}
              className="rounded-xl border border-white/15 bg-slate-800/90 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-amber-500"
            >
              <option value="updated-seo-last" className="bg-slate-900">
                Sort: Updated SEO at End (Pending First)
              </option>
              <option value="status-draft" className="bg-slate-900">Sort: Drafts First</option>
              <option value="status-not-done" className="bg-slate-900">Sort: SEO Not Done First</option>
              <option value="status-published" className="bg-slate-900">Sort: Updated SEO First</option>
              <option value="name-asc" className="bg-slate-900">Sort: Name (A &rarr; Z)</option>
              <option value="name-desc" className="bg-slate-900">Sort: Name (Z &rarr; A)</option>
              <option value="state" className="bg-slate-900">Sort: By State</option>
              <option value="updated" className="bg-slate-900">Sort: Recently Updated</option>
            </select>
          </div>
        </div>

        {/* Bottom row: Status Filter Tabs & Bulk Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                statusFilter === "all"
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md"
                  : "bg-slate-800/70 border border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              All ({cities.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("not_done");
                setCurrentPage(1);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "not_done"
                  ? "bg-rose-500 text-white shadow-md font-extrabold"
                  : "bg-slate-800/70 border border-rose-500/20 text-rose-300 hover:bg-slate-800 hover:text-rose-200"
              }`}
            >
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
              Not Done ({notDoneCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("draft");
                setCurrentPage(1);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "draft"
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "bg-slate-800/70 border border-amber-500/20 text-amber-300 hover:bg-slate-800 hover:text-amber-200"
              }`}
            >
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              In Draft ({draftCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("published");
                setCurrentPage(1);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "published"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-extrabold"
                  : "bg-slate-800/70 border border-emerald-500/20 text-emerald-300 hover:bg-slate-800 hover:text-emerald-200"
              }`}
            >
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              SEO Done ({publishedCount})
            </button>
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={removeSelected}
                className="rounded-xl border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 px-3.5 py-1.5 text-xs font-semibold text-rose-300 transition cursor-pointer"
              >
                Delete Selected ({selectedIds.size})
              </button>
            )}
            {cities.length > 0 && (
              <button
                type="button"
                onClick={deleteAll}
                className="rounded-xl border border-rose-500/40 bg-rose-500/20 hover:bg-rose-500/30 px-3.5 py-1.5 text-xs font-bold text-rose-300 transition cursor-pointer"
              >
                Delete All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table View */}
      {loading ? (
        <AdminTableSkeleton
          headers={[
            "Select",
            "City Name",
            "State",
            "Country",
            "Last update",
            "Actions",
          ]}
          minWidth="min-w-[760px]"
        />
      ) : filteredAndSortedCities.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center backdrop-blur-md">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl mb-3">
            🔍
          </div>
          <p className="text-base font-bold text-white">No cities match your filters.</p>
          <p className="mt-1 text-xs text-slate-400">
            Try adjusting your search query, state dropdown, or status filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setSelectedState("all");
              setCurrentPage(1);
            }}
            className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-amber-400 hover:bg-slate-700 transition cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-800/90 text-amber-400 font-bold uppercase tracking-wider text-xs border-b border-white/10">
                <tr>
                  <th className="w-12 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAllFiltered}
                      className="accent-amber-500 rounded cursor-pointer"
                      aria-label="Select all visible cities"
                    />
                  </th>
                  <th className="px-4 py-3.5">City Name &amp; SEO Dot</th>
                  <th className="px-4 py-3.5">State</th>
                  <th className="px-4 py-3.5">Country</th>
                  <th className="px-4 py-3.5">Last update</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedCities.map((item) => {
                  const seoStatus = item.seo.status;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Checkbox */}
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
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {/* 🟢 Green / 🟡 Yellow / 🔴 Red Dot */}
                          {seoStatus === "published" ? (
                            <span
                              title="SEO Done (Published Live)"
                              className="inline-block h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0"
                            />
                          ) : seoStatus === "draft" ? (
                            <span
                              title="SEO Saved in Draft (Opens exactly where saved)"
                              className="inline-block h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] shrink-0"
                            />
                          ) : (
                            <span
                              title="SEO Not Done"
                              className="inline-block h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] shrink-0"
                            />
                          )}

                          <div>
                            <Link
                              href={`/admin/city-seo?city=${encodeURIComponent(item.slug)}`}
                              className="font-bold text-white hover:text-amber-400 transition flex items-center gap-1.5"
                            >
                              <span>{item.name}</span>
                            </Link>
                            <span className="text-[11px] font-mono text-slate-500 block">
                              /{item.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* State */}
                      <td className="px-4 py-3.5">
                        {item.state ? (
                          <span className="inline-flex items-center rounded-lg bg-slate-800 border border-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
                            {item.state}
                          </span>
                        ) : (
                          <span className="text-slate-500">&mdash;</span>
                        )}
                      </td>

                      {/* Country */}
                      <td className="px-4 py-3.5 text-slate-400 text-xs">
                        {item.country || "India"}
                      </td>

                      {/* Last update */}
                      <td className="px-4 py-3.5 text-slate-300 text-xs">
                        {item.seo.updatedAt ? (
                          formatDisplayDate(item.seo.updatedAt)
                        ) : (
                          <span className="text-slate-500">&mdash;</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit SEO Button (Opens Draft or Fresh SEO form) */}
                          <Link
                            href={`/admin/city-seo?city=${encodeURIComponent(item.slug)}`}
                            className="rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 text-xs font-bold text-amber-300 transition flex items-center gap-1 shadow-xs cursor-pointer"
                            title={`Edit SEO for ${item.name}`}
                          >
                            <span>✏️</span>
                            <span>Edit SEO</span>
                          </Link>

                          {/* View Public Page */}
                          <a
                            href={`/places/${item.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition flex items-center gap-1"
                            title={`View ${item.name} public page`}
                          >
                            <span>👁️</span>
                            <span className="hidden sm:inline">View</span>
                          </a>

                          {/* Delete City */}
                          <button
                            type="button"
                            onClick={() => removeCity(item)}
                            className="rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition cursor-pointer"
                            title={`Delete ${item.name}`}
                          >
                            <span>🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                );
              })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-4 py-3.5 text-xs text-slate-400 bg-slate-900/80">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-white">{(currentPage - 1) * (pageSize === -1 ? totalItems : pageSize) + 1}</strong> &ndash;{" "}
                <strong className="text-white">
                  {pageSize === -1 ? totalItems : Math.min(currentPage * pageSize, totalItems)}
                </strong>{" "}
                of <strong className="text-white">{totalItems}</strong> cities
              </span>

              {/* Rows per page selector */}
              <div className="flex items-center gap-1.5 pl-3 border-l border-white/10">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-white/15 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-amber-500"
                >
                  <option value={25} className="bg-slate-900">25</option>
                  <option value={50} className="bg-slate-900">50</option>
                  <option value={100} className="bg-slate-900">100</option>
                  <option value={-1} className="bg-slate-900">All</option>
                </select>
              </div>
            </div>

            {/* Pagination page switcher */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-white/15 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer"
                >
                  &larr; Prev
                </button>
                <span className="px-2 text-xs font-bold text-white">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-white/15 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
