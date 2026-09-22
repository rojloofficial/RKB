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
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 pb-28">
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-red-950">Dynamic SEO</h1>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-900 border border-red-200">
              Parent-Child Architecture
            </span>
          </div>
          <p className="mt-2 text-sm text-red-900 max-w-3xl leading-relaxed">
            Manage whether Local Areas inherit their parent city&apos;s SEO content or have
            custom individual SEO. Cities with local areas having individual SEO are
            marked with a <span className="inline-flex items-center font-bold text-emerald-700">🟢 green dot</span>.
          </p>
        </div>

        {/* Status Metrics */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-red-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs">
            {cities.length} Cities &bull; {totalAreasCount} Local Areas
          </span>
          <span className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            {customCitiesCount} Cities with Custom SEO
          </span>
          <span className="rounded-full bg-purple-50 px-3.5 py-1.5 text-xs font-semibold text-purple-800 border border-purple-200 shadow-xs">
            {individualAreasCount} Individual Local Areas
          </span>
        </div>
      </div>

      {/* Concept Explanation Card */}
      <div className="mt-6 rounded-2xl border border-red-100 bg-linear-to-r from-pink-50/80 via-white to-pink-50/50 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-3 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-xs">
              1
            </span>
            <div>
              <strong className="block text-sky-950 font-bold">Same Content as City (Inherit)</strong>
              <p className="mt-0.5 text-neutral-600">
                The local area automatically inherits the parent city&apos;s SEO title, description, content blocks, and FAQs contextualized with its name.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-xs">
              2
            </span>
            <div>
              <strong className="block text-purple-950 font-bold">Individual SEO Content</strong>
              <p className="mt-0.5 text-neutral-600">
                The local area has its own custom-crafted meta tags, custom content blocks, and FAQs written by the admin.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
              3
            </span>
            <div>
              <strong className="block text-emerald-950 font-bold">🟢 Green Dot Indicator</strong>
              <p className="mt-0.5 text-neutral-600">
                Instantly shows which cities have local areas configured with custom/individual SEO content.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          {success}
        </div>
      )}

      {/* Filters & Controls */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              filterType === "all"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-pink-50 text-red-950 hover:bg-pink-100 border border-pink-200"
            }`}
          >
            All Cities ({cities.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("custom_only")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              filterType === "custom_only"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200"
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
                ? "bg-neutral-800 text-white shadow-xs"
                : "bg-pink-50 text-red-950 hover:bg-pink-100 border border-pink-200"
            }`}
          >
            Pure Inherited Cities ({cities.length - customCitiesCount})
          </button>
        </div>

        <div className="w-full sm:w-80">
          <input
            className="w-full rounded-xl border border-pink-200 bg-pink-50 px-3.5 py-2.5 text-sm text-red-950 outline-none focus:border-red-500 shadow-2xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by city or local area name..."
          />
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <AdminTableSkeleton
          headers={["City", "Local Areas", "SEO Status", "Quick Actions"]}
          minWidth="min-w-[640px]"
        />
      ) : filteredCities.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-red-100 bg-white p-8 text-center text-red-900">
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
                className="overflow-hidden rounded-2xl border border-red-100 bg-white shadow-xs transition-shadow hover:shadow-sm"
              >
                {/* City Card Header */}
                <div
                  onClick={() => toggleCityExpand(city.slug)}
                  className="flex flex-wrap items-center justify-between gap-3 bg-pink-50/70 px-4 py-3.5 sm:px-6 cursor-pointer hover:bg-pink-100/60 transition"
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
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-xs" />
                        </span>
                      ) : (
                        <span className="inline-block h-3 w-3 rounded-full bg-neutral-300" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-red-950">
                          {city.name}
                        </h2>
                        {city.state && (
                          <span className="text-xs font-semibold text-red-800">
                            ({city.state})
                          </span>
                        )}
                        {hasCustom && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                            🟢 Custom Local SEO Active
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500">
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
                      className="rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition cursor-pointer"
                      title="Set all local areas in this city to inherit parent SEO"
                    >
                      Set All Inherit
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllCityAreasMode(city.slug, "individual")}
                      className="rounded-lg border border-purple-300 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-800 hover:bg-purple-100 transition cursor-pointer"
                      title="Set all local areas in this city to individual SEO mode"
                    >
                      Set All Individual
                    </button>
                    <Link
                      href={`/admin/city-seo?city=${encodeURIComponent(city.slug)}`}
                      className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold !text-white hover:bg-red-700 hover:!text-white transition"
                      style={{ color: "#ffffff" }}
                    >
                      City SEO
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleCityExpand(city.slug)}
                      className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-red-900 border border-pink-200"
                    >
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {/* Local Areas List (Accordion Body) */}
                {isExpanded && (
                  <div className="p-4 sm:p-5">
                    {cityAreas.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic">
                        No local areas recorded under {city.name} yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-neutral-100 bg-white">
                        <table className="w-full text-left text-sm min-w-[620px]">
                          <thead className="bg-pink-50/40 text-xs font-semibold text-red-950 uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Local Area & City</th>
                              <th className="px-4 py-2.5">Inheritance Mode</th>
                              <th className="px-4 py-2.5">SEO Details</th>
                              <th className="px-4 py-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {cityAreas.map((area) => {
                              const areaMode = getAreaMode(city.slug, area.slug);
                              const seoKey = `${cSlug}::${area.slug.toLowerCase()}`;
                              const record = seoMap[seoKey];
                              const isIndividual = areaMode === "individual";

                              return (
                                <tr
                                  key={area.slug}
                                  className={`transition hover:bg-pink-50/30 ${
                                    isIndividual ? "bg-purple-50/20" : ""
                                  }`}
                                >
                                  {/* Formatted Area & City Name */}
                                  <td className="px-4 py-3 font-medium text-neutral-900">
                                    <div className="flex items-center gap-2">
                                      {isIndividual ? (
                                        <span
                                          title="Individual Custom SEO active"
                                          className="h-2 w-2 rounded-full bg-purple-600 shrink-0"
                                        />
                                      ) : (
                                        <span
                                          title="Inheriting from Parent City"
                                          className="h-2 w-2 rounded-full bg-sky-400 shrink-0"
                                        />
                                      )}
                                      <div>
                                        <span className="font-bold text-red-950">
                                          {area.name}, {city.name}
                                        </span>
                                        <span className="block text-xs text-neutral-400">
                                          /places/{city.slug}/{area.slug}
                                        </span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Mode Selector */}
                                  <td className="px-4 py-3">
                                    <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-0.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAreaMode(city.slug, area.slug, "inherit")
                                        }
                                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                                          !isIndividual
                                            ? "bg-sky-600 text-white shadow-2xs"
                                            : "text-neutral-600 hover:text-neutral-900"
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
                                            ? "bg-purple-600 !text-white shadow-2xs"
                                            : "text-neutral-600 hover:text-neutral-900"
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
                                        <span className="font-medium text-purple-900">
                                          &ldquo;{record.title.slice(0, 35)}...&rdquo;
                                        </span>
                                      ) : (
                                        <span className="text-amber-700 font-medium">
                                          Set to Individual (Ready to edit)
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-neutral-500">
                                        Dynamically inherits {city.name} SEO content
                                      </span>
                                    )}
                                  </td>

                                  {/* Action Buttons */}
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          router.push(
                                            `/places/${city.slug}/${area.slug}`
                                          )
                                        }
                                        className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold !text-white hover:bg-emerald-700 transition"
                                      >
                                        View
                                      </button>
                                      <Link
                                        href={`/admin/city-seo?city=${encodeURIComponent(
                                          city.slug
                                        )}&area=${encodeURIComponent(area.slug)}`}
                                        className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold !text-white hover:bg-red-700 transition shadow-2xs"
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
        <div className="fixed bottom-4 left-4 right-4 sm:left-72 sm:right-8 z-40 rounded-2xl border border-red-200 bg-white/95 backdrop-blur-md p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div>
            <p className="text-sm font-bold text-red-950">
              Unsaved SEO Inheritance Changes
            </p>
            <p className="text-xs text-neutral-600">
              You have modified inheritance modes for {Object.keys(pendingModes).length} local areas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPendingModes({})}
              disabled={saving}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saving}
              className="rounded-xl bg-red-600 px-5 py-2 text-xs sm:text-sm font-bold text-white hover:bg-red-700 transition shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving Changes..." : "Save Configuration"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
