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
    void loadAds();

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
    <main className="p-4 sm:p-6 lg:p-10 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-red-950">Ads</h1>
          <p className="mt-2 text-red-900">Manage all posted ads.</p>
        </div>

        <div className="relative w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full sm:w-60 items-center justify-between gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-950 outline-none hover:border-red-400"
          >
            <span>{selectedCity ? selectedCity.name : "All Cities"}</span>
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 text-red-500 transition-transform ${
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
              <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlug("");
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-pink-50 ${
                    selectedSlug === "" ? "bg-pink-50" : ""
                  }`}
                >
                  <span className="font-semibold text-red-950">All Cities</span>
                  <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {ads.length}
                  </span>
                </button>
                <div className="max-h-72 overflow-y-auto">
                  {cities.map((c, idx) => (
                    <button
                      key={`${c.slug}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSelectedSlug(c.slug);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-pink-50 ${
                        c.slug === selectedSlug ? "bg-pink-50" : ""
                      }`}
                    >
                      <span className="text-red-950">{c.name}</span>
                      <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-semibold text-red-700">
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
        <p className="mt-6 text-red-900">
          {selectedSlug && ads.length > 0
            ? `No ads found in ${selectedCity?.name ?? "this city"}.`
            : "No ads found."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-red-100 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-pink-50 text-red-950">
              <tr>
                <th className="px-4 py-3 font-semibold">Ad</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAds.map((ad) => (
                <tr key={ad._id} className="border-t border-red-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {ad.images?.[0] ? (
                        <Image
                          src={ad.images[0]}
                          alt={ad.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-pink-100" />
                      )}
                      <span className="font-medium text-red-950">{ad.name}</span>
                      {ad.age ? (
                        <span className="text-sm text-red-500">
                          Age: {ad.age}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-red-900">{ad.category}</td>
                  <td className="px-4 py-3 text-red-900">{ad.city}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        ad.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {ad.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStatus(ad)}
                        className="rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700"
                      >
                        {ad.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(ad._id)}
                        className="rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
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
