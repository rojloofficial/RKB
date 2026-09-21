"use client";

import { useEffect, useState } from "react";
import { useVipContext } from "@/components/vip/use-vip-context";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";

type AdItem = {
  _id: string;
  name: string;
  title: string;
  category: string;
  city: string;
  state?: string;
  phone: string;
  status: string;
};

export default function VipAdsPage() {
  const me = useVipContext();
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (me && !me.authenticated) {
      if (typeof window !== "undefined") {
        window.location.replace("/vip/login");
      }
    }
  }, [me]);

  useEffect(() => {
    if (!me || !me.authenticated) return;

    fetch("/api/vip/ads", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setAds(Array.isArray(data.ads) ? data.ads : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [me]);

  if (!me || !me.authenticated) return null;

  const filteredAds = ads.filter((ad) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (ad.title && ad.title.toLowerCase().includes(q)) ||
      (ad.name && ad.name.toLowerCase().includes(q)) ||
      (ad.city && ad.city.toLowerCase().includes(q)) ||
      (ad.category && ad.category.toLowerCase().includes(q)) ||
      (ad.phone && ad.phone.includes(q))
    );
  });

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-red-950">Ads</h1>
          <p className="mt-2 text-red-900">
            Advertisements listed in your assigned areas (Read-Only Access).
          </p>
        </div>
        <span className="rounded-full bg-pink-100 px-3.5 py-1.5 text-xs font-bold text-red-900 border border-red-200">
          {ads.length} {ads.length === 1 ? "Ad" : "Ads"}
        </span>
      </div>

      {/* Search Bar */}
      <div className="mt-6 max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter ads by title, category, city, or phone..."
          className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-red-950 outline-none focus:border-red-400"
        />
      </div>

      {loading ? (
        <div className="mt-6">
          <AdminTableSkeleton
            headers={["Ad Title", "Category", "City", "State", "Phone", "Status"]}
            rowCount={8}
            minWidth="min-w-[650px]"
          />
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-white p-8 text-center text-red-900">
          {search ? "No ads match your filter." : "No ads found in your assigned areas."}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-red-100 bg-white">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-pink-50 text-red-950">
              <tr>
                <th className="px-5 py-4 font-semibold">Title</th>
                <th className="px-5 py-4 font-semibold">Category</th>
                <th className="px-5 py-4 font-semibold">City</th>
                <th className="px-5 py-4 font-semibold">State</th>
                <th className="px-5 py-4 font-semibold">Phone</th>
                <th className="px-5 py-4 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAds.map((ad) => (
                <tr key={ad._id} className="border-t border-red-50">
                  <td className="px-5 py-4 font-bold text-red-950 max-w-[200px] truncate">
                    {ad.title || ad.name}
                  </td>
                  <td className="px-5 py-4 text-red-900 capitalize">{ad.category || "General"}</td>
                  <td className="px-5 py-4 text-red-950 font-medium">{ad.city}</td>
                  <td className="px-5 py-4 text-red-900">{ad.state || "—"}</td>
                  <td className="px-5 py-4 text-red-900 font-mono text-xs">{ad.phone || "—"}</td>
                  <td className="px-5 py-4 text-right">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ad.status === "active"
                          ? "bg-green-100 text-green-900"
                          : "bg-yellow-100 text-yellow-900"
                      }`}
                    >
                      {ad.status === "active" ? "Active" : ad.status || "Pending"}
                    </span>
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
