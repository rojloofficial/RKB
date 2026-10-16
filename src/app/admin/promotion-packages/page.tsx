"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import {
  DEFAULT_PROMO_PACKAGES,
  type PromotionPackage,
} from "@/lib/promotion-packages";
import {
  type PromoTier,
  TIER_RANK_MAP,
  normalizeTier,
  getTierRankInfo,
} from "@/lib/promo-shifts";

const emptyPackage = (): PromotionPackage => ({
  id: `promo-${Date.now().toString(36)}`,
  title: "New VIP Package",
  tier: "bronze",
  rankRange: "Top 10 - 15",
  durationDays: 0.25,
  durationHours: 6,
  coinsCost: 5,
  tag: "",
  highlight: false,
  features: [
    "Top placement in your city",
    "Runs 6 Hours for selected shift",
    "Highlighted card badge",
    "Instant activation",
  ],
});

export default function PromotionPackagesPage() {
  const router = useRouter();
  const me = useAdminContext();
  const [packages, setPackages] = useState<PromotionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/promotion-packages?_t=${Date.now()}`, {
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
          items.map((item: PromotionPackage) => {
            const tier: PromoTier = normalizeTier(item.tier, `${item.id || ""} ${item.title || ""}`);
            const defaultRank = TIER_RANK_MAP[tier]?.rankRange || "Top 10 - 15";
            const durationHours = Number(item.durationHours || (item.durationDays ? item.durationDays * 24 : 12));
            const durationDays = Number(item.durationDays || (durationHours / 24));
            return {
              _id: item._id,
              id: item.id || `promo-${Date.now()}`,
              title: item.title || "",
              tier,
              rankRange: item.rankRange || defaultRank,
              durationDays,
              durationHours,
              coinsCost: Number(item.coinsCost || 0),
              tag: item.tag || "",
              highlight: Boolean(item.highlight),
              features: Array.isArray(item.features) ? item.features : [],
            };
          })
        );
      } else {
        setPackages(DEFAULT_PROMO_PACKAGES);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load promotion packages.");
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
    field: keyof PromotionPackage,
    value: string | boolean | number | string[]
  ) {
    setPackages((prev) =>
      prev.map((pkg, i) => {
        if (i !== index) return pkg;
        if (field === "durationHours") {
          const hours = Math.max(1, Number(value) || 12);
          return { ...pkg, durationHours: hours, durationDays: hours / 24 };
        }
        if (field === "durationDays") {
          const days = Math.max(0.1, Number(value) || 1);
          return { ...pkg, durationDays: days, durationHours: Math.round(days * 24) };
        }
        if (field === "coinsCost") return { ...pkg, coinsCost: Math.max(0, Number(value) || 0) };
        if (field === "highlight") return { ...pkg, highlight: Boolean(value) };
        if (field === "features") return { ...pkg, features: value as string[] };
        return { ...pkg, [field]: value };
      })
    );
  }

  function handleFeaturesChange(index: number, text: string) {
    const list = text.split("\n").map((f) => f.trim()).filter(Boolean);
    updatePackage(index, "features", list);
  }

  function handleAddPackage() {
    setPackages((prev) => [...prev, emptyPackage()]);
  }

  async function handleDeletePackage(index: number) {
    const target = packages[index];
    if (
      !window.confirm(
        `Are you sure you want to delete "${target.title || `Package #${index + 1}`}"?`
      )
    ) {
      return;
    }

    const next = packages.filter((_, i) => i !== index);
    if (next.length === 0) {
      setError("You must have at least one promotion package.");
      return;
    }

    setPackages(next);
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/promotion-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packages: next }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to delete promotion package.");
        return;
      }

      setSuccess("Package removed and updated successfully.");
      if (Array.isArray(data.packages)) {
        setPackages(data.packages);
      }
      window.dispatchEvent(new CustomEvent("promotions:updated"));
      window.localStorage.setItem("rojlo_promo_update", "updated");
    } catch (err) {
      console.error(err);
      setError("Failed to delete package.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToDefaults() {
    if (
      !window.confirm(
        "Are you sure you want to reset to the default 4 promotion packages (Platinum, Gold, Silver, Bronze)? Any custom packages will be replaced."
      )
    ) {
      return;
    }

    setPackages(DEFAULT_PROMO_PACKAGES);
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/promotion-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packages: DEFAULT_PROMO_PACKAGES }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to reset promotion packages.");
        return;
      }

      setSuccess("Reset to default tiered promotion packages successfully.");
      if (Array.isArray(data.packages)) {
        setPackages(data.packages);
      }
      window.dispatchEvent(new CustomEvent("promotions:updated"));
      window.localStorage.setItem("rojlo_promo_update", "updated");
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
      const payload = packages.filter(
        (pkg) =>
          pkg.title.trim().length > 0 &&
          (Number(pkg.durationDays) > 0 || Number(pkg.durationHours) > 0) &&
          Number(pkg.coinsCost) >= 0
      );

      if (payload.length === 0) {
        setError("Please provide at least one valid promotion package.");
        return;
      }

      const res = await fetch("/api/admin/promotion-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packages: payload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to save promotion packages.");
        return;
      }

      setSuccess(`Successfully saved ${payload.length} promotion packages.`);
      if (Array.isArray(data.packages)) {
        setPackages(data.packages);
      }
      window.dispatchEvent(new CustomEvent("promotions:updated"));
      window.localStorage.setItem("rojlo_promo_update", "updated");
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!me?.authenticated) return null;

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Promotion Package <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Control</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Configure tiered VIP packages, placement ranks, durations, and coin costs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition cursor-pointer"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleAddPackage}
            className="rounded-xl border border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/25 px-4 py-2 text-xs font-bold text-amber-300 transition cursor-pointer"
          >
            + Add Package
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={saving || loading || packages.length === 0}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-5 py-2 text-xs font-bold text-slate-950 disabled:opacity-50 transition shadow-md cursor-pointer active:scale-[0.98]"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs sm:text-sm font-semibold text-rose-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs sm:text-sm font-semibold text-emerald-300">
          {success}
        </div>
      )}

      {/* Fair Rotation Explanatory Banner */}
      <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-start gap-3">
        <span className="text-base shrink-0">ℹ️</span>
        <div>
          <p className="font-bold text-amber-300">Multi-Day Shift &amp; 30-Minute Fair Rotation System:</p>
          <p className="text-slate-300 mt-1 leading-relaxed">
            When users select a package with 2 or more days, their ad appears on top in their paid tier during their chosen shift (Morning, Afternoon, Evening, or Night) every day. If more ads are active on a shift than tier capacity (Top 1–3, Top 4–6, Top 7–10, Top 10–15), ads rotate positions fairly every 30 minutes.
          </p>
        </div>
      </div>

      {loading && packages.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-amber-400 mb-3" />
          <p className="text-sm font-bold text-slate-400">Loading promotion packages...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 w-full">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 w-full min-w-0">
            {packages.map((pkg, index) => {
              const tierInfo = getTierRankInfo(pkg.tier, `${pkg.id} ${pkg.title}`);

              return (
                <div
                  key={pkg._id || pkg.id || index}
                  className="relative rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col justify-between w-full min-w-0 transition-all hover:border-amber-500/30"
                >
                  <div>
                    {/* Top Bar */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-800 border border-white/10 px-2.5 py-0.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Package #{index + 1}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase text-white ${tierInfo.badgeClass}`}>
                          {tierInfo.badge}
                        </span>
                        {pkg.highlight && (
                          <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-2.5 py-0.5 text-[10px] font-bold text-slate-950 uppercase">
                            Featured
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleDeletePackage(index)}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 px-3 py-1 text-xs font-semibold text-rose-300 transition disabled:opacity-50 cursor-pointer"
                        title="Remove package"
                      >
                        &times; Remove
                      </button>
                    </div>

                    {/* Form Inputs */}
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                          Package Title
                        </label>
                        <input
                          type="text"
                          value={pkg.title}
                          onChange={(e) => updatePackage(index, "title", e.target.value)}
                          placeholder="e.g. Platinum"
                          className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-3.5 py-2 text-sm text-white font-bold outline-none focus:border-amber-500 transition"
                          required
                        />
                      </div>

                      {/* Tier Selector and Rank Range */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                            Placement Tier
                          </label>
                          <select
                            value={pkg.tier || "bronze"}
                            onChange={(e) => {
                              const newTier = e.target.value as PromoTier;
                              const info = TIER_RANK_MAP[newTier] || TIER_RANK_MAP.bronze;
                              updatePackage(index, "tier", newTier);
                              updatePackage(index, "rankRange", info.rankRange);
                            }}
                            className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-3 py-2 text-sm text-white font-bold outline-none focus:border-amber-500 transition"
                          >
                            <option value="platinum">👑 Platinum VIP (Top 1 - 3)</option>
                            <option value="gold">🥇 Gold VIP (Top 4 - 6)</option>
                            <option value="silver">🥈 Silver VIP (Top 7 - 10)</option>
                            <option value="bronze">🥉 Bronze VIP (Top 10 - 15)</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                            Rank Position Label
                          </label>
                          <input
                            type="text"
                            value={pkg.rankRange || tierInfo.rankRange}
                            onChange={(e) => updatePackage(index, "rankRange", e.target.value)}
                            placeholder="e.g. Top 1 - 3"
                            className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-3.5 py-2 text-sm text-white font-bold outline-none focus:border-amber-500 transition"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                            Shift Duration
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0.5"
                              step="any"
                              value={
                                pkg.durationHours && pkg.durationHours < 24
                                  ? pkg.durationHours
                                  : pkg.durationDays || 1
                              }
                              onKeyDown={(e) => {
                                if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                              }}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 1;
                                const isHours = Boolean(pkg.durationHours && pkg.durationHours < 24);
                                if (isHours) {
                                  updatePackage(index, "durationHours", val);
                                } else {
                                  updatePackage(index, "durationDays", val);
                                }
                              }}
                              className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-3 py-2 text-sm text-white font-bold outline-none focus:border-amber-500 transition"
                              required
                            />
                            <select
                              value={pkg.durationHours && pkg.durationHours < 24 ? "hours" : "days"}
                              onChange={(e) => {
                                if (e.target.value === "hours") {
                                  updatePackage(index, "durationHours", 6);
                                } else {
                                  const days = Math.max(1, Math.round((pkg.durationHours || 24) / 24));
                                  updatePackage(index, "durationDays", days);
                                }
                              }}
                              className="rounded-xl border border-white/15 bg-slate-800/90 px-3 py-2 text-xs font-bold text-white outline-none focus:border-amber-500 shrink-0"
                            >
                              <option value="hours">Hours (6h Shift)</option>
                              <option value="days">Days</option>
                            </select>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                            {[
                              { label: "6h (Shift)", hours: 6 },
                              { label: "1 Day", days: 1 },
                              { label: "2 Days", days: 2 },
                              { label: "3 Days", days: 3 },
                              { label: "7 Days", days: 7 },
                              { label: "15 Days", days: 15 },
                              { label: "30 Days", days: 30 },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() =>
                                  preset.hours !== undefined
                                    ? updatePackage(index, "durationHours", preset.hours)
                                    : updatePackage(index, "durationDays", preset.days!)
                                }
                                className="rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 font-bold cursor-pointer transition"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                            Cost (Coins)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={pkg.coinsCost !== undefined ? pkg.coinsCost : ""}
                            onKeyDown={(e) => {
                              if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                            }}
                            onChange={(e) => updatePackage(index, "coinsCost", e.target.value)}
                            placeholder="e.g. 25"
                            className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-3.5 py-2 text-sm text-white font-bold outline-none focus:border-amber-500 transition"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Badge Tag <span className="text-slate-500 normal-case">(e.g. Popular)</span>
                          </label>
                          <input
                            type="text"
                            value={pkg.tag || ""}
                            onChange={(e) => updatePackage(index, "tag", e.target.value)}
                            placeholder="e.g. Most Popular"
                            className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-3.5 py-2 text-sm text-white outline-none focus:border-amber-500 transition"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Internal Slug
                          </label>
                          <input
                            type="text"
                            value={pkg.id || ""}
                            onChange={(e) => updatePackage(index, "id", e.target.value)}
                            placeholder="e.g. platinum-vip"
                            className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-3.5 py-2 text-sm text-white outline-none focus:border-amber-500 transition"
                            required
                          />
                        </div>
                      </div>

                      <div className="pt-1">
                        <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-slate-300">
                          <input
                            type="checkbox"
                            checked={Boolean(pkg.highlight)}
                            onChange={(e) => updatePackage(index, "highlight", e.target.checked)}
                            className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                          />
                          <span>Highlight with Gold/Amber Feature Badge</span>
                        </label>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                          Bullet Features <span className="text-slate-500 normal-case">(one per line)</span>
                        </label>
                        <textarea
                          rows={4}
                          value={(pkg.features || []).join("\n")}
                          onChange={(e) => handleFeaturesChange(index, e.target.value)}
                          placeholder="Top 1 - 3 placement in your city&#10;6h Shift priority daily boost&#10;Fair 30-min slot balancing&#10;Unlocks all ad gallery images"
                          className="w-full rounded-xl border border-white/15 bg-slate-800/90 p-3 text-xs sm:text-sm text-white outline-none focus:border-amber-500 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div className="mt-5 rounded-xl border border-dashed border-white/15 bg-slate-950/60 p-4 min-w-0">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                      Live Preview (User View):
                    </span>
                    <div className="mt-2.5 rounded-xl border border-white/10 bg-slate-900 p-4 shadow-xl relative min-w-0">
                      {pkg.tag && (
                        <span
                          className={`absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            pkg.highlight
                              ? "bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md"
                              : "bg-slate-800 text-amber-400 border border-white/10"
                          }`}
                        >
                          {pkg.tag}
                        </span>
                      )}

                      <div className="mb-1.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black ${tierInfo.badgeClass}`}>
                          {tierInfo.badge}
                        </span>
                      </div>

                      <p className="text-sm font-black text-white pr-14 break-words">
                        {pkg.title || "Untitled Package"}
                      </p>

                      <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        <span>🎯 Position: {pkg.rankRange || tierInfo.rankRange}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                          {pkg.coinsCost ?? 0}
                        </span>
                        <span className="text-xs font-bold text-slate-300">Coins</span>
                        <span className="text-xs text-slate-400 ml-1.5">
                          ({pkg.durationHours && pkg.durationHours < 24
                            ? `${pkg.durationHours} Hours (${pkg.durationHours === 6 ? "1 Shift" : `${pkg.durationHours}h`})`
                            : `${pkg.durationDays ?? 1} ${Number(pkg.durationDays) === 1 ? "Day" : "Days"} (Daily Shift)`})
                        </span>
                      </div>

                      <ul className="mt-2.5 space-y-1 text-xs text-slate-300 break-words">
                        {(pkg.features || []).map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold shrink-0">✓</span>
                            <span className="min-w-0">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action Bar */}
          <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full">
            <button
              type="submit"
              disabled={saving || loading || packages.length === 0}
              className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-6 py-3 text-sm font-bold text-slate-950 disabled:opacity-50 transition shadow-md cursor-pointer text-center active:scale-[0.98]"
            >
              {saving ? "Saving..." : `Save All ${packages.length} Packages`}
            </button>
            <button
              type="button"
              onClick={handleAddPackage}
              className="w-full sm:w-auto rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-5 py-3 text-sm font-bold text-slate-200 transition cursor-pointer text-center"
            >
              + Add Another Package
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
