"use client";

import { useEffect, useState } from "react";
import { useVipContext } from "@/components/vip/use-vip-context";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";

type CityItem = {
  name: string;
  slug: string;
  state?: string;
  adCount?: number;
};

export default function VipCityPage() {
  const me = useVipContext();
  const [cities, setCities] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (me && !me.authenticated) {
      if (typeof window !== "undefined") {
        window.location.replace("/vip/login");
      }
    }
  }, [me]);

  useEffect(() => {
    if (!me || !me.authenticated) return;

    fetch("/api/vip/cities", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setCities(Array.isArray(data.cities) ? data.cities : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [me]);

  if (!me || !me.authenticated) return null;

  const filteredCities = cities.filter((c) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.state && c.state.toLowerCase().includes(q))
    );
  });

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-red-950">Assigned Cities</h1>
          <p className="mt-2 text-red-900">
            Cities under your VIP control jurisdiction (Read-Only Access).
          </p>
        </div>
        <span className="rounded-full bg-pink-100 px-3.5 py-1.5 text-xs font-bold text-red-900 border border-red-200">
          {cities.length} {cities.length === 1 ? "City" : "Cities"}
        </span>
      </div>

      {/* Search Filter */}
      <div className="mt-6 max-w-md">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter cities by name or state..."
          className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-red-950 outline-none focus:border-red-400"
        />
      </div>

      {loading ? (
        <div className="mt-6">
          <AdminTableSkeleton
            headers={["City Name", "State", "Active Ads", "Access Status"]}
            rowCount={8}
            minWidth="min-w-[500px]"
          />
        </div>
      ) : filteredCities.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-white p-8 text-center text-red-900">
          {searchTerm ? "No cities match your search." : "No cities assigned to your account."}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-red-100 bg-white">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="bg-pink-50 text-red-950">
              <tr>
                <th className="px-5 py-4 font-semibold">City Name</th>
                <th className="px-5 py-4 font-semibold">State</th>
                <th className="px-5 py-4 font-semibold">Active Ads</th>
                <th className="px-5 py-4 text-right font-semibold">Access Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCities.map((city) => (
                <tr key={city.slug || city.name} className="border-t border-red-50">
                  <td className="px-5 py-4 font-bold text-red-950">{city.name}</td>
                  <td className="px-5 py-4 text-red-900">{city.state || "—"}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-pink-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                      {city.adCount ?? 0} ads
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-900">
                      Controlled
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
