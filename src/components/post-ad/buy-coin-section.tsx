"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_PACKAGES, type CoinPackage } from "@/lib/coin-packages";

const FALLBACK_PACKAGES: CoinPackage[] = DEFAULT_PACKAGES.map((pkg, idx) => ({
  _id: `coin-package-${idx + 1}`,
  ...pkg,
}));

interface EligibilityState {
  allowed: boolean;
  remainingMs: number;
  remainingFormatted: string;
  lastPurchaseAt: string | null;
  nextAllowedAt: string | null;
  reason?: string;
}

export default function BuyCoinSection() {
  const router = useRouter();
  const { user } = useAuth();
  const [packages, setPackages] = useState<CoinPackage[]>(FALLBACK_PACKAGES);
  const [navigatingPkgId, setNavigatingPkgId] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityState | null>(null);
  const [liveCountdown, setLiveCountdown] = useState<string>("");

  const loadPackages = useCallback(async () => {
    try {
      const res = await fetch(`/api/coin-packages?_t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data.packages) ? data.packages : [];
      if (list.length) {
        setPackages(list);
      }
    } catch (err) {
      console.error("Failed to load coin packages:", err);
    }
  }, []);

  const userEmail = user?.email;
  const checkEligibility = useCallback(async () => {
    let emailToUse = userEmail || user?.email;
    if (!emailToUse && typeof window !== "undefined") {
      try {
        emailToUse = JSON.parse(localStorage.getItem("rojlo_auth_user") || "{}")?.email || "";
      } catch {}
    }
    if (!emailToUse) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("rojlo_auth_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(
        `/api/payment-confirmation/eligibility?email=${encodeURIComponent(emailToUse)}&_t=${Date.now()}`,
        {
          headers,
          cache: "no-store",
          credentials: "include",
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setEligibility({
          allowed: Boolean(data.allowed),
          remainingMs: Number(data.remainingMs || 0),
          remainingFormatted: String(data.remainingFormatted || ""),
          lastPurchaseAt: data.lastPurchaseAt || null,
          nextAllowedAt: data.nextAllowedAt || null,
          reason: data.reason || "",
        });
      }
    } catch (err) {
      console.error("Failed to check coin purchase eligibility:", err);
    }
  }, [userEmail, user?.email]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPackages();
    });

    let lastLoad = Date.now();
    const handleUpdated = () => { lastLoad = Date.now(); void loadPackages(); };
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastLoad < 30_000) return;
      lastLoad = now;
      void loadPackages();
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "rojlo_coin_packages_update") {
        lastLoad = Date.now();
        void loadPackages();
      }
    };

    window.addEventListener("coin_packages:updated", handleUpdated);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("coin_packages:updated", handleUpdated);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadPackages]);

  useEffect(() => {
    queueMicrotask(() => {
      void checkEligibility();
    });

    let lastCheck = Date.now();
    const handleCoinUpdate = () => {
      lastCheck = Date.now();
      void checkEligibility();
    };
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastCheck < 10_000) return;
      lastCheck = now;
      void checkEligibility();
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "rojlo_coin_update") {
        void checkEligibility();
      }
    };

    window.addEventListener("coins:updated", handleCoinUpdate);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("coins:updated", handleCoinUpdate);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [checkEligibility]);

  useEffect(() => {
    if (!eligibility || eligibility.allowed || !eligibility.nextAllowedAt) {
      return;
    }

    const targetMs = new Date(eligibility.nextAllowedAt).getTime();
    if (isNaN(targetMs)) return;

    const updateTimer = () => {
      const remaining = targetMs - Date.now();
      if (remaining <= 0) {
        setLiveCountdown("");
        setEligibility((prev) => (prev ? { ...prev, allowed: true, remainingMs: 0, remainingFormatted: "" } : null));
        void checkEligibility();
        return;
      }
      const totalSecs = Math.floor(remaining / 1000);
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      const parts: string[] = [];
      if (h > 0) parts.push(`${h}h`);
      if (m > 0 || h > 0) parts.push(`${m}m`);
      parts.push(`${s}s`);
      setLiveCountdown(parts.join(" "));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => {
      clearInterval(interval);
      setLiveCountdown("");
    };
  }, [eligibility, checkEligibility]);

  const handleBuyClick = (pkg: CoinPackage) => {
    if (eligibility && !eligibility.allowed) {
      const timeLeft = liveCountdown || eligibility.remainingFormatted || "some time";
      alert(
        `24-Hour Purchase Limit Active!\n\nYou can only purchase coins once every 24 hours on this email address.\n\nPlease wait ${timeLeft} before making another purchase.`
      );
      return;
    }

    setNavigatingPkgId(pkg._id || String(pkg.coins));
    router.push(
      `/post-ad/payment?coins=${pkg.coins}&price=${encodeURIComponent(
        `₹${Number(pkg.price).toFixed(2)}`
      )}`
    );
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-7 shadow-xl w-full max-w-full overflow-hidden box-border">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Recharge Coin Wallet</h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
            Coins empower you to boost your listings to the top VIP ranks across major Indian cities.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0 pt-1 sm:pt-0">
          <span className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-bold text-amber-300">
            🪙 Balance: <strong>{user?.coins ?? 0} coins</strong>
          </span>
          <span className="text-white/20">•</span>
          <Link
            href="/post-ad/payment-history"
            className="font-bold text-slate-300 hover:text-amber-400 transition"
          >
            History &rarr;
          </Link>
        </div>
      </div>

      {/* 24h Cooldown Alert Banner */}
      {eligibility && !eligibility.allowed && (
        <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-full bg-amber-500/20 p-2 text-amber-300">
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  24-Hour Purchase Cooldown Active
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-300 w-fit">
                  <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                  Next purchase in: {liveCountdown || eligibility.remainingFormatted}
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-200/80 leading-relaxed">
                To prevent duplicate orders, accounts may purchase coins once every 24 hours. Your last transaction was recorded on{" "}
                <strong className="text-white">
                  {eligibility.lastPurchaseAt
                    ? new Date(eligibility.lastPurchaseAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "recently"}
                </strong>
                . Packages will unlock automatically when the cooldown finishes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Coin Packages: 1 col on phone, 2-3 cols on tab, 5 cols on desktop */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {packages.map((pkg) => {
          const hasDiscount =
            pkg.originalPrice && Number(pkg.originalPrice) > Number(pkg.price);

          return (
            <div
              key={pkg._id || `${pkg.coins}-${pkg.price}`}
              className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 sm:p-5 transition-all duration-300 overflow-hidden w-full max-w-full box-border ${
                pkg.popular
                  ? "border-amber-500/50 bg-gradient-to-b from-amber-500/15 via-slate-950/80 to-slate-950 shadow-xl shadow-amber-500/5 ring-1 ring-amber-500/30"
                  : "border-white/10 bg-slate-950/70 hover:border-amber-500/30 hover:bg-slate-950"
              }`}
            >
              <div className="min-w-0 w-full">
                {/* Badges row: Popular / Label / Discount */}
                <div className="flex items-center justify-between gap-1.5 mb-2.5 min-h-[22px] flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {pkg.popular && (
                      <span className="inline-block rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-xs">
                        Popular
                      </span>
                    )}
                    {pkg.label && (
                      <span className="inline-block rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold text-slate-300">
                        {pkg.label}
                      </span>
                    )}
                  </div>

                  {pkg.discount && pkg.discount.trim() !== "—" && pkg.discount.trim() !== "-" && (
                    <span className="inline-block rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                      {pkg.discount}
                    </span>
                  )}
                </div>

                {/* Coins Number */}
                <p className="text-2xl sm:text-xl lg:text-2xl font-black text-white leading-tight">
                  {pkg.coins}
                  <span className="ml-1.5 text-xs font-semibold text-amber-400">
                    coins
                  </span>
                </p>

                {/* Breakdown / Bonus text (e.g. 28 + 2 Free) */}
                {pkg.breakdown && (
                  <p className="mt-1 text-xs font-bold text-amber-300 break-words">
                    {pkg.breakdown}
                  </p>
                )}

                {/* Price Display */}
                <div className="mt-2 leading-snug">
                  {hasDiscount && (
                    <span className="block text-xs text-slate-500 line-through">
                      ₹{Number(pkg.originalPrice).toFixed(2)}
                    </span>
                  )}
                  <span className="text-base sm:text-sm lg:text-base font-bold text-white break-words">
                    ₹{Number(pkg.price).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Buy Button */}
              <Button
                type="button"
                variant={pkg.popular ? "solid" : "outline"}
                size="sm"
                className={`w-full py-2 text-xs font-bold mt-auto shrink-0 shadow-md ${
                  eligibility && !eligibility.allowed
                    ? "!border-amber-500/30 !text-amber-300 bg-amber-500/10 opacity-70 cursor-not-allowed"
                    : "!text-white"
                }`}
                loading={navigatingPkgId === (pkg._id || String(pkg.coins))}
                loadingText="Redirecting..."
                onClick={() => handleBuyClick(pkg)}
              >
                {eligibility && !eligibility.allowed
                  ? `Wait: ${liveCountdown || eligibility.remainingFormatted}`
                  : "Purchase Pack"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
