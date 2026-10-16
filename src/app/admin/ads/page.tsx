"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";
import { useAdminContext } from "@/components/admin/use-admin-context";

type Ad = {
  _id?: string;
  name: string;
  age?: string;
  category: string;
  city: string;
  phone: string;
  status: string;
  images: string[];
  createdAt: string | Date;
};

type CityOption = {
  name: string;
  slug: string;
};

export default function AdminAds() {
  const router = useRouter();
  const me = useAdminContext();
  const [ads, setAds] = useState<Ad[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAds = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ads", { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      setAds(data.ads ?? []);
    } catch (err) {
      console.error("Failed to load ads:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }

    let active = true;
    queueMicrotask(() => {
      if (active) void loadAds();
    });

    fetch("/api/admin/cities", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (active) setCities(data.cities ?? []);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [loadAds, me, router]);

  function matchesCity(ad: Ad, city: CityOption): boolean {
    const ac = (ad.city || "").toLowerCase().trim();
    return (
      ac === city.name.toLowerCase().trim() ||
      ac === city.slug.toLowerCase().trim()
    );
  }

  const cityCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cities) {
      map[c.slug] = ads.filter((a) => matchesCity(a, c)).length;
    }
    return map;
  }, [cities, ads]);

  const filteredAds = useMemo(() => {
    if (!selectedSlug) return ads;
    const city = cities.find((c) => c.slug === selectedSlug);
    if (!city) return ads;
    return ads.filter((a) => matchesCity(a, city));
  }, [selectedSlug, cities, ads]);

  const selectedCity = cities.find((c) => c.slug === selectedSlug);

  async function toggleStatus(ad: Ad) {
    const next = ad.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch("/api/admin/ads", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ad._id, status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to update ad status.");
        return;
      }
      void loadAds();
    } catch {
      alert("Network error updating ad status.");
    }
  }

  async function remove(id?: string) {
    if (!id) return;
    if (!confirm("Delete this ad?")) return;
    try {
      const res = await fetch("/api/admin/ads", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete ad.");
        return;
      }
      void loadAds();
    } catch {
      alert("Network error deleting ad.");
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ads <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Management</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            View, filter, activate, deactivate, or delete classified ads.
          </p>
        </div>

        <div className="relative w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full sm:w-64 items-center justify-between gap-2 rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm font-semibold text-white outline-none hover:border-amber-500/50 hover:bg-slate-800 shadow-md transition"
          >
            <span>{selectedCity ? selectedCity.name : "All Cities"}</span>
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 text-amber-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlug("");
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    selectedSlug === ""
                      ? "bg-amber-500/20 text-amber-400"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <span>All Cities</span>
                  <span className="rounded-full bg-slate-800 border border-white/10 px-2 py-0.5 text-xs font-bold text-amber-400">
                    {ads.length}
                  </span>
                </button>
                <div className="mt-1 max-h-72 overflow-y-auto space-y-0.5">
                  {cities.map((c, idx) => (
                    <button
                      key={`${c.slug}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSelectedSlug(c.slug);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        c.slug === selectedSlug
                          ? "bg-amber-500/20 text-amber-400"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="rounded-full bg-slate-800 border border-white/10 px-2 py-0.5 text-xs font-bold text-amber-400">
                        {cityCounts[c.slug] ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <AdminTableSkeleton
          headers={["Ad", "Category", "City", "Status", "Actions"]}
        />
      ) : filteredAds.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center">
          <p className="text-sm font-semibold text-slate-400">
            {selectedSlug && ads.length > 0
              ? `No ads found in ${selectedCity?.name ?? "this city"}.`
              : "No ads found."}
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-md">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-800/80 text-amber-400 font-bold uppercase tracking-wider text-xs border-b border-white/10">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Ad</th>
                <th className="px-4 py-3.5 font-semibold">Category</th>
                <th className="px-4 py-3.5 font-semibold">City</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAds.map((ad) => (
                <tr key={ad._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {ad.images?.[0] ? (
                        <Image
                          src={ad.images[0]}
                          alt={ad.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-xl object-cover border border-white/10 shadow-sm"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 text-xs font-bold">
                          RKB
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-white">{ad.name}</div>
                        {ad.age ? (
                          <div className="text-xs text-amber-400/80 font-medium">
                            Age: {ad.age}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300 font-medium">{ad.category}</td>
                  <td className="px-4 py-3.5 text-slate-300 font-medium">{ad.city}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        ad.status === "Active"
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {ad.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStatus(ad)}
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 hover:border-amber-500/40"
                      >
                        {ad.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(ad._id)}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
