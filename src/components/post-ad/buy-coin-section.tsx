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
    <section className="rounded-2xl bg-white p-4 sm:p-6 w-full max-w-full overflow-hidden box-border">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-200 pb-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900">Buy Coins</h2>
          <p className="mt-0.5 text-xs sm:text-sm text-neutral-600">
            Coins let you promote your ads and unlock premium features. Choose a pack to get started.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0 pt-1 sm:pt-0">
          <span className="font-medium text-neutral-600">
            Available: <strong className="font-black text-neutral-900">{user?.coins ?? 0} coins</strong>
          </span>
          <span className="text-neutral-300">•</span>
          <Link
            href="/post-ad/payment-history"
            className="font-bold text-neutral-900 hover:text-neutral-700 hover:underline transition"
          >
            Transactions &rarr;
          </Link>
        </div>
      </div>

      {/* 24h Cooldown Alert Banner */}
      {eligibility && !eligibility.allowed && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-full bg-amber-200 p-2 text-amber-800">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <h3 className="text-sm sm:text-base font-bold text-amber-950">
                  24-Hour Coin Purchase Limit Active
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/90 border border-amber-300 px-2.5 py-0.5 text-xs font-black text-amber-950 w-fit">
                  <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
                  Next purchase in: {liveCountdown || eligibility.remainingFormatted}
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-amber-900 leading-relaxed">
                You can only buy coins once in 24 hours per email address. Your last purchase was recorded on{" "}
                <strong className="font-semibold text-amber-950">
                  {eligibility.lastPurchaseAt
                    ? new Date(eligibility.lastPurchaseAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "recently"}
                </strong>
                . You will be able to buy coins again automatically once the countdown finishes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Coin Packages: 1 col on phone, 2-3 cols on tab, 5 cols on desktop */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {packages.map((pkg) => {
          const hasDiscount =
            pkg.originalPrice && Number(pkg.originalPrice) > Number(pkg.price);

          return (
            <div
              key={pkg._id || `${pkg.coins}-${pkg.price}`}
              className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:p-3.5 transition-all overflow-hidden w-full max-w-full box-border ${
                pkg.popular
                  ? "border-neutral-900 bg-neutral-50 shadow-xs"
                  : "border-neutral-200 bg-white hover:bg-neutral-50"
              }`}
            >
              <div className="min-w-0 w-full">
                {/* Badges row: Popular / Label / Discount */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5 min-h-[22px] flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {pkg.popular && (
                      <span className="inline-block rounded-full bg-neutral-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shrink-0">
                        Popular
                      </span>
                    )}
                    {pkg.label && (
                      <span className="inline-block rounded-full bg-neutral-100 border border-neutral-200 px-2 py-0.5 text-[9px] font-semibold text-neutral-800 shrink-0">
                        {pkg.label}
                      </span>
                    )}
                  </div>

                  {pkg.discount && pkg.discount.trim() !== "—" && pkg.discount.trim() !== "-" && (
                    <span className="inline-block rounded bg-neutral-100 border border-neutral-300 px-1.5 py-0.5 text-[9px] font-bold text-neutral-800 shrink-0">
                      {pkg.discount}
                    </span>
                  )}
                </div>

                {/* Coins Number */}
                <p className="text-xl sm:text-lg lg:text-xl font-black text-neutral-900 leading-tight">
                  {pkg.coins}
                  <span className="ml-1.5 text-xs sm:text-[11px] font-semibold text-neutral-500">
                    coins
                  </span>
                </p>

                {/* Breakdown / Bonus text (e.g. 28 + 2 Free) */}
                {pkg.breakdown && (
                  <p className="mt-1 text-xs sm:text-[10px] font-bold text-neutral-800 break-words">
                    {pkg.breakdown}
                  </p>
                )}

                {/* Price Display */}
                <div className="mt-1.5 leading-snug">
                  {hasDiscount && (
                    <span className="block text-xs sm:text-[10px] text-gray-400 line-through">
                      ₹{Number(pkg.originalPrice).toFixed(2)}
                    </span>
                  )}
                  <span className="text-sm sm:text-xs lg:text-[13px] font-bold text-neutral-900 break-words">
                    for ₹{Number(pkg.price).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Buy Button */}
              <Button
                type="button"
                variant={eligibility && !eligibility.allowed ? "outline" : "solid"}
                size="sm"
                className={`w-full py-1.5 text-xs font-bold mt-auto shrink-0 shadow-xs ${
                  eligibility && !eligibility.allowed
                    ? "!border-amber-400 !text-amber-900 bg-amber-50/80 hover:bg-amber-100"
                    : "!text-white"
                }`}
                loading={navigatingPkgId === (pkg._id || String(pkg.coins))}
                loadingText="Redirecting..."
                onClick={() => handleBuyClick(pkg)}
              >
                {eligibility && !eligibility.allowed
                  ? `Cooldown: ${liveCountdown || eligibility.remainingFormatted}`
                  : "Buy"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
