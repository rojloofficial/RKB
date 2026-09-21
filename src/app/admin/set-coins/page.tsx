"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { DEFAULT_PACKAGES, type CoinPackage } from "@/lib/coin-packages";

const emptyPackage = (): CoinPackage => ({
  coins: 0,
  price: 0,
  originalPrice: 0,
  breakdown: "",
  discount: "",
  label: "",
  popular: false,
});

export default function SetCoinsPage() {
  const router = useRouter();
  const me = useAdminContext();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [allPackagesCoins, setAllPackagesCoins] = useState<number>(55);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/set-coins?_t=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const data = await res.json();
      const items = Array.isArray(data.packages) ? data.packages : [];

      if (items.length > 0) {
        setPackages(
          items.map((item: CoinPackage) => ({
            _id: item._id,
            coins: Number(item.coins || 0),
            price: Number(item.price || 0),
            originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
            breakdown: item.breakdown || "",
            discount: item.discount || "",
            label: item.label || "",
            popular: Boolean(item.popular),
          }))
        );
      } else {
        setPackages([]);
      }

      if (data.allPackagesCoins && !isNaN(Number(data.allPackagesCoins))) {
        setAllPackagesCoins(Math.round(Number(data.allPackagesCoins)));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load coin packages.");
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

    queueMicrotask(() => {
      void loadPackages();
    });
  }, [loadPackages, me, router]);

  function updatePackage(
    index: number,
    field: keyof CoinPackage,
    value: string | boolean | number
  ) {
    setPackages((prev) =>
      prev.map((pkg, i) => {
        if (i !== index) return pkg;
        if (field === "coins") return { ...pkg, coins: Number(value) || 0 };
        if (field === "price") return { ...pkg, price: Number(value) || 0 };
        if (field === "originalPrice") return { ...pkg, originalPrice: Number(value) || undefined };
        if (field === "popular") return { ...pkg, popular: Boolean(value) };
        return { ...pkg, [field]: String(value) };
      })
    );
  }

  function handleAddPackage() {
    setPackages((prev) => [...prev, emptyPackage()]);
  }

  async function handleDeletePackage(index: number) {
    const target = packages[index];
    const confirmMsg = target?.coins
      ? `Are you sure you want to remove the ${target.coins} coins package? This will be removed from the Buy Coins page immediately.`
      : "Are you sure you want to remove this package? This will be removed from the Buy Coins page immediately.";
    if (!window.confirm(confirmMsg)) return;

    const remaining = packages.filter((_, i) => i !== index);
    setPackages(remaining);
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload = remaining.filter((pkg) => Number(pkg.coins) > 0 && Number(pkg.price) >= 0);
      const res = await fetch("/api/admin/set-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packages: payload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to remove package from server.");
        setPackages(packages); // rollback
        return;
      }

      setSuccess("Package removed successfully and changes saved to database.");
      if (Array.isArray(data.packages)) {
        setPackages(data.packages);
      }
      window.dispatchEvent(new CustomEvent("coin_packages:updated"));
      window.localStorage.setItem("rojlo_coin_packages_update", "updated");
    } catch (err) {
      console.error(err);
      setError("Network error while removing package.");
      setPackages(packages); // rollback
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToDefaults() {
    if (
      !window.confirm(
        "Reset coin packages to the standard 5 packages and save to the Buy Coins page?"
      )
    ) {
      return;
    }

    const seeded = DEFAULT_PACKAGES.map((pkg, idx) => ({ _id: `pkg-${idx + 1}`, ...pkg }));
    setPackages(seeded);
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/set-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packages: seeded }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to reset coin packages.");
        return;
      }

      setSuccess("Reset to standard 5 coin packages and saved successfully.");
      if (Array.isArray(data.packages)) {
        setPackages(data.packages);
      }
      window.dispatchEvent(new CustomEvent("coin_packages:updated"));
      window.localStorage.setItem("rojlo_coin_packages_update", "updated");
    } catch (err) {
      console.error(err);
      setError("Failed to save default packages.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload = packages.filter((pkg) => Number(pkg.coins) > 0 && Number(pkg.price) >= 0);

      if (payload.length === 0) {
        setError("Please add at least one valid coin package.");
        return;
      }

      const res = await fetch("/api/admin/set-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          packages: payload,
          allPackagesCoins,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to save coin packages.");
        return;
      }

      setSuccess(`Successfully saved ${payload.length} coin packages and settings.`);
      if (Array.isArray(data.packages)) {
        setPackages(data.packages);
      }
      if (data.allPackagesCoins) {
        setAllPackagesCoins(Number(data.allPackagesCoins));
      }
      window.dispatchEvent(new CustomEvent("coin_packages:updated"));
      window.localStorage.setItem("rojlo_coin_packages_update", "updated");
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!me?.authenticated) return null;

  return (
    <main className="min-h-screen bg-red-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 min-w-0">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-red-200 pb-4">
          <div>
            <h1 className="text-3xl font-black text-red-950">Set Coin Packages</h1>
            <p className="mt-1 text-sm text-red-900">
              Manage the coin packages shown on the public Buy Coins page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-900 hover:bg-red-50 transition shadow-xs cursor-pointer"
            >
              Reset to Default 5 Packages
            </button>
            <button
              type="button"
              onClick={handleAddPackage}
              className="rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-950 hover:bg-red-50 transition shadow-xs"
            >
              + Add Package
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
              disabled={saving || loading || packages.length === 0}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50 transition shadow-xs"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Standard Packages Reference Table */}
        <div className="mt-4 rounded-2xl border border-red-200 bg-white p-4 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-red-950">
              Standard Package Pricing Reference
            </h3>
            <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              Base: ₹8.00 / Coin
            </span>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-red-100 text-gray-500 font-bold">
                <th className="pb-1.5 pr-3">Package</th>
                <th className="pb-1.5 pr-3">Coins</th>
                <th className="pb-1.5 pr-3">Original Price</th>
                <th className="pb-1.5 pr-3">Discount</th>
                <th className="pb-1.5 pr-3">Final Price</th>
                <th className="pb-1.5">Discount Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-50 font-medium text-red-950">
              <tr>
                <td className="py-1.5 pr-3 font-black text-red-900">#1</td>
                <td className="py-1.5 pr-3 font-bold">99</td>
                <td className="py-1.5 pr-3">₹792</td>
                <td className="py-1.5 pr-3">0%</td>
                <td className="py-1.5 pr-3 font-black text-emerald-800">₹792</td>
                <td className="py-1.5 text-gray-400">—</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 font-black text-red-900">#2</td>
                <td className="py-1.5 pr-3 font-bold">145</td>
                <td className="py-1.5 pr-3">₹1,160</td>
                <td className="py-1.5 pr-3">3%</td>
                <td className="py-1.5 pr-3 font-black text-emerald-800">₹1,125</td>
                <td className="py-1.5"><span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-black text-amber-900">3% DISCOUNT</span></td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 font-black text-red-900">#3</td>
                <td className="py-1.5 pr-3 font-bold">200</td>
                <td className="py-1.5 pr-3">₹1,600</td>
                <td className="py-1.5 pr-3">6%</td>
                <td className="py-1.5 pr-3 font-black text-emerald-800">₹1,504</td>
                <td className="py-1.5"><span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-black text-amber-900">6% DISCOUNT</span></td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 font-black text-red-900">#4</td>
                <td className="py-1.5 pr-3 font-bold">350</td>
                <td className="py-1.5 pr-3">₹2,800</td>
                <td className="py-1.5 pr-3">9%</td>
                <td className="py-1.5 pr-3 font-black text-emerald-800">₹2,548</td>
                <td className="py-1.5"><span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-black text-amber-900">9% DISCOUNT</span></td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3 font-black text-red-900">#5</td>
                <td className="py-1.5 pr-3 font-bold">870</td>
                <td className="py-1.5 pr-3">₹6,960</td>
                <td className="py-1.5 pr-3">12%</td>
                <td className="py-1.5 pr-3 font-black text-emerald-800">₹6,125</td>
                <td className="py-1.5"><span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-black text-amber-900">12% DISCOUNT</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* All Packages Combo Configuration Box */}
        <div className="mt-4 rounded-2xl border border-red-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">👑</span>
              <h3 className="text-sm font-black text-red-950">
                All Packages Combo Coin Price
              </h3>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-900 uppercase">
                Ad Promotion Setting
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-600">
              When an advertiser toggles <strong>&quot;Select All Packages Once&quot;</strong> on the ad promotion page, charge this amount of coins per shift slot.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <input
                type="number"
                min="1"
                max="10000"
                value={allPackagesCoins}
                onKeyDown={(e) => {
                  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                }}
                onChange={(e) => setAllPackagesCoins(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-32 rounded-xl border border-red-300 bg-pink-50/40 px-3 py-2 text-center text-sm font-black text-red-950 outline-none focus:border-red-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                coins
              </span>
            </div>
            <span className="text-xs text-gray-500 font-semibold">(Default: 55 coins)</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-100 border border-red-200 p-3 text-sm text-red-900 font-semibold">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-xl bg-green-100 border border-green-200 p-3 text-sm text-green-900 font-semibold">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {packages.map((pkg, index) => (
              <div
                key={pkg._id || index}
                className="relative rounded-2xl border border-red-200 bg-white p-4 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2 border-b border-red-100 pb-2">
                    <span className="text-xs font-black text-red-950 uppercase tracking-wider">
                      Package #{index + 1}
                    </span>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleDeletePackage(index)}
                      className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 hover:bg-red-600 hover:text-white transition disabled:opacity-50"
                      title="Remove package and save changes"
                    >
                      &times; Remove
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="block font-bold text-red-950">Total Coins</label>
                      <input
                        type="number"
                        min="1"
                        value={pkg.coins || ""}
                        onKeyDown={(e) => {
                          if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                        }}
                        onChange={(e) => updatePackage(index, "coins", e.target.value)}
                        placeholder="e.g. 99"
                        className="mt-0.5 w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-red-950 font-bold outline-none focus:border-red-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-red-950">Final Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pkg.price || ""}
                        onKeyDown={(e) => {
                          if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                        }}
                        onChange={(e) => updatePackage(index, "price", e.target.value)}
                        placeholder="e.g. 792"
                        className="mt-0.5 w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-red-950 font-bold outline-none focus:border-red-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-red-800">
                        Original Price (₹) <span className="text-gray-400 font-normal">(strikethrough)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pkg.originalPrice || ""}
                        onKeyDown={(e) => {
                          if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                        }}
                        onChange={(e) => updatePackage(index, "originalPrice", e.target.value)}
                        placeholder="e.g. 792"
                        className="mt-0.5 w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-red-950 outline-none focus:border-red-400"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-red-800">Discount Tag</label>
                      <input
                        type="text"
                        value={pkg.discount || ""}
                        onChange={(e) => updatePackage(index, "discount", e.target.value)}
                        placeholder="e.g. 3% DISCOUNT"
                        className="mt-0.5 w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-red-950 outline-none focus:border-red-400"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-red-800">Breakdown / Bonus</label>
                      <input
                        type="text"
                        value={pkg.breakdown || ""}
                        onChange={(e) => updatePackage(index, "breakdown", e.target.value)}
                        placeholder="e.g. Optional note"
                        className="mt-0.5 w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-red-950 outline-none focus:border-red-400"
                      />
                    </div>

                    <div className="pt-1">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-red-950">
                        <input
                          type="checkbox"
                          checked={Boolean(pkg.popular)}
                          onChange={(e) => updatePackage(index, "popular", e.target.checked)}
                          className="h-4 w-4 rounded accent-red-700"
                        />
                        Mark as Popular
                      </label>
                    </div>
                  </div>
                </div>

                {/* Card Preview Footnote */}
                <div className="mt-3 border-t border-red-100 pt-2 text-[11px] text-red-700">
                  Preview: <strong>{pkg.coins || 0} Coins</strong> for{" "}
                  <strong>₹{Number(pkg.price || 0).toFixed(2)}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || loading || packages.length === 0}
              className="rounded-xl bg-neutral-950 px-6 py-3 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50 transition shadow-sm"
            >
              {saving ? "Saving..." : `Save All ${packages.length} Packages`}
            </button>
            <button
              type="button"
              onClick={handleAddPackage}
              className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-950 hover:bg-pink-50 transition"
            >
              + Add Another Package
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
