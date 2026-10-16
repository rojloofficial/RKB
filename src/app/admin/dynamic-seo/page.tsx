"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";

type CityItem = {
  name: string;
  slug: string;
  state?: string;
};

type LocalAreaItem = {
  _id?: string;
  name: string;
  slug: string;
  cityName: string;
  citySlug: string;
  stateName?: string;
};

type SeoMode = "inherit" | "individual";

type LocalAreaSeoRecord = {
  citySlug: string;
  areaSlug: string;
  cityName: string;
  areaName: string;
  mode: SeoMode;
  title?: string;
  description?: string;
  status?: string;
  updatedAt?: string;
};

export default function DynamicSeoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [cities, setCities] = useState<CityItem[]>([]);
  const [allLocalAreas, setAllLocalAreas] = useState<LocalAreaItem[]>([]);
  const [seoMap, setSeoMap] = useState<Record<string, LocalAreaSeoRecord>>({});

  // Local pending mode updates: key = `${citySlug}::${areaSlug}` -> mode
  const [pendingModes, setPendingModes] = useState<Record<string, SeoMode>>({});

  // UI Filter states
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "custom_only" | "inherit_only">("all");
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [citiesRes, areasRes, seoRes] = await Promise.all([
        fetch("/api/admin/cities", { credentials: "include" }),
        fetch("/api/admin/local-areas", { credentials: "include" }),
        fetch("/api/admin/local-area-seo", { credentials: "include" }),
      ]);

      if (!citiesRes.ok || !areasRes.ok) {
        setError("Failed to load cities or local areas.");
        return;
      }

      const citiesData = await citiesRes.json();
      const areasData = await areasRes.json();
      const seoData = seoRes.ok ? await seoRes.json() : { seoList: [], citiesWithCustomSeo: [] };

      const fetchedCities: CityItem[] = citiesData.cities ?? [];
      const fetchedAreas: LocalAreaItem[] = areasData.localAreas ?? [];

      setCities(fetchedCities);
      setAllLocalAreas(fetchedAreas);

      const map: Record<string, LocalAreaSeoRecord> = {};
      (seoData.seoList ?? []).forEach((item: LocalAreaSeoRecord) => {
        const key = `${item.citySlug.toLowerCase()}::${item.areaSlug.toLowerCase()}`;
        map[key] = item;
      });
      setSeoMap(map);

      // Expand all cities by default if fewer than 20, or expand first 5
      const initialExpanded = new Set<string>();
      fetchedCities.slice(0, 15).forEach((c) => initialExpanded.add(c.slug.toLowerCase()));
      setExpandedCities(initialExpanded);

      setPendingModes({});
    } catch {
      setError("An unexpected error occurred while loading data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  // Group local areas by citySlug
  const areasByCity = useMemo(() => {
    const map = new Map<string, LocalAreaItem[]>();
    for (const area of allLocalAreas) {
      const cSlug = (area.citySlug || "").toLowerCase().trim();
      if (!map.has(cSlug)) map.set(cSlug, []);
      map.get(cSlug)!.push(area);
    }
    return map;
  }, [allLocalAreas]);

  // Effective mode of an area (pending changes take priority)
  const getAreaMode = useCallback(
    (citySlug: string, areaSlug: string): SeoMode => {
      const key = `${citySlug.toLowerCase()}::${areaSlug.toLowerCase()}`;
      if (pendingModes[key]) return pendingModes[key];
      return seoMap[key]?.mode ?? "inherit";
    },
    [pendingModes, seoMap]
  );

  // Check if a city has any area with individual mode (computed dynamically including pending changes)
  const cityHasIndividualSeo = useCallback(
    (citySlug: string): boolean => {
      const cSlug = citySlug.toLowerCase().trim();
      const areas = areasByCity.get(cSlug) ?? [];
      return areas.some((a) => getAreaMode(cSlug, a.slug) === "individual");
    },
    [areasByCity, getAreaMode]
  );

  // Set mode for a specific local area
  function setAreaMode(citySlug: string, areaSlug: string, mode: SeoMode) {
    const key = `${citySlug.toLowerCase()}::${areaSlug.toLowerCase()}`;
    setPendingModes((prev) => ({ ...prev, [key]: mode }));
  }

  // Bulk set all local areas in a city
  function setAllCityAreasMode(citySlug: string, mode: SeoMode) {
    const cSlug = citySlug.toLowerCase().trim();
    const areas = areasByCity.get(cSlug) ?? [];
    setPendingModes((prev) => {
      const next = { ...prev };
      for (const a of areas) {
        const key = `${cSlug}::${a.slug.toLowerCase()}`;
        next[key] = mode;
      }
      return next;
    });
  }

  // Toggle city accordion expansion
  function toggleCityExpand(citySlug: string) {
    const c = citySlug.toLowerCase();
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  // Has unsaved pending changes
  const hasPendingChanges = Object.keys(pendingModes).length > 0;

  // Save all pending modes
  async function handleSaveChanges() {
    if (!hasPendingChanges) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updates = Object.entries(pendingModes).map(([key, mode]) => {
        const [citySlug, areaSlug] = key.split("::");
        const area = allLocalAreas.find(
          (a) =>
            a.citySlug.toLowerCase() === citySlug &&
            a.slug.toLowerCase() === areaSlug
        );
        return {
          citySlug,
          areaSlug,
          mode,
          cityName: area?.cityName,
          areaName: area?.name,
        };
      });

      const res = await fetch("/api/admin/local-area-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "batch_modes",
          updates,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save Dynamic SEO changes.");
        return;
      }

      setSuccess(`Successfully updated ${updates.length} local area SEO settings.`);
      await load();
    } catch {
      setError("An error occurred while saving changes.");
    } finally {
      setSaving(false);
    }
  }

  // Filtered cities
  const filteredCities = useMemo(() => {
    const q = search.toLowerCase().trim();
    return cities.filter((city) => {
      const cSlug = city.slug.toLowerCase().trim();
      const areas = areasByCity.get(cSlug) ?? [];

      // Custom SEO filter
      const hasCustom = cityHasIndividualSeo(cSlug);
      if (filterType === "custom_only" && !hasCustom) return false;
      if (filterType === "inherit_only" && hasCustom) return false;

      // Text query match
      if (!q) return true;
      if (city.name.toLowerCase().includes(q)) return true;
      if (city.state && city.state.toLowerCase().includes(q)) return true;
      if (city.slug.toLowerCase().includes(q)) return true;

      // Match any local area in this city
      return areas.some(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q)
      );
    });
  }, [cities, areasByCity, cityHasIndividualSeo, filterType, search]);

  // Overall Statistics
  const totalAreasCount = allLocalAreas.length;
  const individualAreasCount = useMemo(() => {
    return allLocalAreas.filter(
      (a) => getAreaMode(a.citySlug, a.slug) === "individual"
    ).length;
  }, [allLocalAreas, getAreaMode]);

  const customCitiesCount = useMemo(() => {
    return cities.filter((c) => cityHasIndividualSeo(c.slug)).length;
  }, [cities, cityHasIndividualSeo]);

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl pb-28">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 shadow-inner">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              <span>Dynamic SEO</span>
            </h1>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-500/30">
              Parent-Child Architecture
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
            Manage whether Local Areas inherit their parent city&apos;s SEO content or have
            custom individual SEO. Cities with local areas having individual SEO are
            marked with a <span className="inline-flex items-center font-bold text-emerald-400">🟢 green dot</span>.
          </p>
        </div>

        {/* Status Metrics */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-xl bg-slate-900 border border-white/15 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-200 shadow-md">
            <span className="text-amber-400 font-bold">{cities.length}</span> Cities &bull; <span className="text-white font-bold">{totalAreasCount}</span> Local Areas
          </span>
          <span className="rounded-xl bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 border border-emerald-500/30 flex items-center gap-2 shadow-md">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            {customCitiesCount} Cities with Custom SEO
          </span>
          <span className="rounded-xl bg-purple-500/10 px-3.5 py-2 text-xs font-semibold text-purple-300 border border-purple-500/30 shadow-md">
            {individualAreasCount} Individual Local Areas
          </span>
        </div>
      </div>

      {/* Concept Explanation Card */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md shadow-xl">
        <div className="grid gap-4 sm:grid-cols-3 text-xs sm:text-sm">
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-white/5 bg-slate-800/40">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold text-xs">
              1
            </span>
            <div>
              <strong className="block text-sky-300 font-bold">Same Content as City (Inherit)</strong>
              <p className="mt-1 text-slate-400 leading-relaxed text-xs">
                The local area automatically inherits the parent city&apos;s SEO title, description, content blocks, and FAQs contextualized with its name.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-white/5 bg-slate-800/40">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold text-xs">
              2
            </span>
            <div>
              <strong className="block text-purple-300 font-bold">Individual SEO Content</strong>
              <p className="mt-1 text-slate-400 leading-relaxed text-xs">
                The local area has its own custom-crafted meta tags, custom content blocks, and FAQs written by the admin.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-white/5 bg-slate-800/40">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
              3
            </span>
            <div>
              <strong className="block text-emerald-300 font-bold">🟢 Green Dot Indicator</strong>
              <p className="mt-1 text-slate-400 leading-relaxed text-xs">
                Instantly shows which cities have local areas configured with custom/individual SEO content.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm font-semibold text-rose-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm font-semibold text-emerald-300">
          {success}
        </div>
      )}

      {/* Filters & Controls */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              filterType === "all"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/15"
            }`}
          >
            All Cities ({cities.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("custom_only")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              filterType === "custom_only"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                : "bg-white/5 text-emerald-300 hover:bg-white/10 border border-white/15"
            }`}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            Cities with Custom SEO ({customCitiesCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("inherit_only")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              filterType === "inherit_only"
                ? "bg-slate-800 text-white border border-white/30 shadow-md"
                : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/15"
            }`}
          >
            Pure Inherited Cities ({cities.length - customCitiesCount})
          </button>
        </div>

        <div className="w-full sm:w-80">
          <input
            className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by city or local area name..."
          />
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="mt-6">
          <AdminTableSkeleton
            headers={["City", "Local Areas", "SEO Status", "Quick Actions"]}
            minWidth="min-w-[640px]"
          />
        </div>
      ) : filteredCities.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-slate-400">
          No cities found matching your search or filter.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredCities.map((city) => {
            const cSlug = city.slug.toLowerCase().trim();
            const cityAreas = areasByCity.get(cSlug) ?? [];
            const hasCustom = cityHasIndividualSeo(cSlug);
            const isExpanded = expandedCities.has(cSlug);

            const customAreaCount = cityAreas.filter(
              (a) => getAreaMode(cSlug, a.slug) === "individual"
            ).length;

            return (
              <div
                key={city.slug}
                className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-md transition hover:border-white/20"
              >
                {/* City Card Header */}
                <div
                  onClick={() => toggleCityExpand(city.slug)}
                  className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/80 px-4 py-3.5 sm:px-6 cursor-pointer hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-3">
                    {/* Green Dot Indicator for City */}
                    <div
                      title={
                        hasCustom
                          ? "City contains local areas with individual custom SEO"
                          : "All local areas in this city inherit parent city SEO"
                      }
                      className="flex items-center"
                    >
                      {hasCustom ? (
                        <span className="relative flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-sm" />
                        </span>
                      ) : (
                        <span className="inline-block h-3 w-3 rounded-full bg-slate-600" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">
                          {city.name}
                        </h2>
                        {city.state && (
                          <span className="text-xs font-semibold text-slate-400">
                            ({city.state})
                          </span>
                        )}
                        {hasCustom && (
                          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                            🟢 Custom Local SEO Active
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {cityAreas.length} Local Areas ({customAreaCount} Individual &bull; {cityAreas.length - customAreaCount} Inherited)
                      </p>
                    </div>
                  </div>

                  {/* Bulk City Actions */}
                  <div
                    className="flex flex-wrap items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setAllCityAreasMode(city.slug, "inherit")}
                      className="rounded-lg border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/25 transition cursor-pointer"
                      title="Set all local areas in this city to inherit parent SEO"
                    >
                      Set All Inherit
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllCityAreasMode(city.slug, "individual")}
                      className="rounded-lg border border-purple-500/30 bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-300 hover:bg-purple-500/25 transition cursor-pointer"
                      title="Set all local areas in this city to individual SEO mode"
                    >
                      Set All Individual
                    </button>
                    <Link
                      href={`/admin/city-seo?city=${encodeURIComponent(city.slug)}`}
                      className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-3 py-1 text-xs font-bold text-slate-950 transition active:scale-[0.98]"
                    >
                      City SEO
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleCityExpand(city.slug)}
                      className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-white/10"
                    >
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {/* Local Areas List (Accordion Body) */}
                {isExpanded && (
                  <div className="p-4 sm:p-5">
                    {cityAreas.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">
                        No local areas recorded under {city.name} yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/80">
                        <table className="w-full text-left text-sm min-w-[620px] text-slate-300">
                          <thead className="bg-slate-800/80 text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-white/10">
                            <tr>
                              <th className="px-4 py-2.5">Local Area & City</th>
                              <th className="px-4 py-2.5">Inheritance Mode</th>
                              <th className="px-4 py-2.5">SEO Details</th>
                              <th className="px-4 py-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {cityAreas.map((area) => {
                              const areaMode = getAreaMode(city.slug, area.slug);
                              const seoKey = `${cSlug}::${area.slug.toLowerCase()}`;
                              const record = seoMap[seoKey];
                              const isIndividual = areaMode === "individual";

                              return (
                                <tr
                                  key={area.slug}
                                  className={`transition hover:bg-slate-800/40 ${
                                    isIndividual ? "bg-purple-500/5" : ""
                                  }`}
                                >
                                  {/* Formatted Area & City Name */}
                                  <td className="px-4 py-3 font-medium">
                                    <div className="flex items-center gap-2.5">
                                      {isIndividual ? (
                                        <span
                                          title="Individual Custom SEO active"
                                          className="h-2 w-2 rounded-full bg-purple-400 shrink-0"
                                        />
                                      ) : (
                                        <span
                                          title="Inheriting from Parent City"
                                          className="h-2 w-2 rounded-full bg-sky-400 shrink-0"
                                        />
                                      )}
                                      <div>
                                        <span className="font-bold text-white">
                                          {area.name}, {city.name}
                                        </span>
                                        <span className="block text-xs text-slate-500 font-mono">
                                          /places/{city.slug}/{area.slug}
                                        </span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Mode Selector */}
                                  <td className="px-4 py-3">
                                    <div className="inline-flex rounded-xl border border-white/10 bg-slate-900/90 p-0.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAreaMode(city.slug, area.slug, "inherit")
                                        }
                                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                                          !isIndividual
                                            ? "bg-sky-600 text-white shadow-sm"
                                            : "text-slate-400 hover:text-white"
                                        }`}
                                      >
                                        Same as City (Inherit)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAreaMode(city.slug, area.slug, "individual")
                                        }
                                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                                          isIndividual
                                            ? "bg-purple-600 text-white shadow-sm"
                                            : "text-slate-400 hover:text-white"
                                        }`}
                                      >
                                        Individual SEO
                                      </button>
                                    </div>
                                  </td>

                                  {/* Status Details */}
                                  <td className="px-4 py-3 text-xs">
                                    {isIndividual ? (
                                      record?.title ? (
                                        <span className="font-medium text-purple-300">
                                          &ldquo;{record.title.slice(0, 35)}...&rdquo;
                                        </span>
                                      ) : (
                                        <span className="text-amber-400 font-medium">
                                          Set to Individual (Ready to edit)
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-slate-500">
                                        Dynamically inherits {city.name} SEO content
                                      </span>
                                    )}
                                  </td>

                                  {/* Action Buttons */}
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          router.push(
                                            `/places/${city.slug}/${area.slug}`
                                          )
                                        }
                                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 transition"
                                      >
                                        View
                                      </button>
                                      <Link
                                        href={`/admin/city-seo?city=${encodeURIComponent(
                                          city.slug
                                        )}&area=${encodeURIComponent(area.slug)}`}
                                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 transition"
                                      >
                                        Edit SEO
                                      </Link>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Save Bar when pending changes exist */}
      {hasPendingChanges && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-72 sm:right-8 z-40 rounded-2xl border border-amber-500/40 bg-slate-900/95 backdrop-blur-md p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div>
            <p className="text-sm font-bold text-white">
              Unsaved SEO Inheritance Changes
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              You have modified inheritance modes for {Object.keys(pendingModes).length} local areas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPendingModes({})}
              disabled={saving}
              className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-bold text-slate-300 transition cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-5 py-2 text-xs sm:text-sm font-bold text-slate-950 transition shadow-lg shadow-amber-500/20 disabled:opacity-60 cursor-pointer active:scale-[0.98]"
            >
              {saving ? "Saving Changes..." : "Save Configuration"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
