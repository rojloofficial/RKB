"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import { useAuthGuard } from "./use-auth-guard";
import { useAuth } from "@/lib/auth-context";
import { authenticatedFetch } from "@/lib/auth-fetch";
import type { Ad } from "./types";

import {
  DEFAULT_PROMO_PACKAGES,
  type PromotionPackage,
} from "@/lib/promotion-packages";

import {
  getCurrentShift,
  getShiftLabel,
  getShiftShortLabel,
  getTierRankInfo,
  calculateShiftTiming,
  formatDateTime,
  formatDetailedTimeRemaining,
  type PromoShift,
} from "@/lib/promo-shifts";

interface ShiftBoxItem {
  id: PromoShift;
  name: string;
  timeRange: string;
}

const SHIFT_BOXES: ShiftBoxItem[] = [
  {
    id: "morning",
    name: "Morning",
    timeRange: "06:00 AM – 12:00 PM",
  },
  {
    id: "afternoon",
    name: "Afternoon",
    timeRange: "12:00 PM – 06:00 PM",
  },
  {
    id: "evening",
    name: "Evening",
    timeRange: "06:00 PM – 12:00 AM",
  },
  {
    id: "night",
    name: "Night",
    timeRange: "12:00 AM – 06:00 AM",
  },
];

interface PromoModalData {
  adTitle: string;
  rankRange: string;
  shiftName: string;
  promotedFrom: Date;
  promotedUntil: Date;
  isCurrentShift: boolean;
  isNextDay: boolean;
  isAllShifts?: boolean;
  isAllPackages?: boolean;
  totalCoins?: number;
}

export default function PromotedAdView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adIdParam = searchParams.get("adId") || "";

  const ready = useAuthGuard();
  const { user, refreshAuth } = useAuth();

  const [ads, setAds] = useState<Ad[]>([]);
  const [promoPackages, setPromoPackages] = useState<PromotionPackage[]>(DEFAULT_PROMO_PACKAGES);
  const [allPackagesCoins, setAllPackagesCoins] = useState<number>(55);
  const [selectedAdId, setSelectedAdId] = useState<string>(adIdParam);

  // Shift selection states
  const [selectedShift, setSelectedShift] = useState<PromoShift | null>(null);
  const [allShifts, setAllShifts] = useState<boolean>(false);

  // Package selection states
  const [allPackages, setAllPackages] = useState<boolean>(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("platinum-vip");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalData, setModalData] = useState<PromoModalData | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active current IST shift
  const [activeISTShift, setActiveISTShift] = useState<string>("morning");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setActiveISTShift(getCurrentShift());
      } catch {
        setActiveISTShift("morning");
      }
    });
  }, []);

  useEffect(() => {
    if (!modalData) return;
    const update = () => {
      setCountdown(formatDetailedTimeRemaining(modalData.promotedUntil));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [modalData]);

  const loadAds = useCallback(() => {
    setLoading(true);
    authenticatedFetch("/api/ads")
      .then((r) => r.json())
      .then((data) => {
        const list: Ad[] = (data.ads ?? []).filter(
          (a: Ad) => (a.status ?? "active") !== "deleted"
        );
        setAds(list);
        if (adIdParam && list.some((a) => a._id === adIdParam)) {
          setSelectedAdId(adIdParam);
        } else if (list.length > 0) {
          setSelectedAdId((prev) => prev || list[0]._id || "");
        }
      })
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }, [adIdParam]);

  const loadPromotionPackages = useCallback(() => {
    fetch(`/api/promotion-packages?_t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.packages) && data.packages.length > 0) {
          setPromoPackages(data.packages);
          setSelectedPackageId((prevId) => {
            if (data.packages.some((p: PromotionPackage) => p.id === prevId)) {
              return prevId;
            }
            const defaultPick =
              data.packages.find((p: PromotionPackage) => p.highlight) ||
              data.packages[0];
            return defaultPick ? defaultPick.id : prevId;
          });
        }
        if (typeof data?.allPackagesCoins === "number" && data.allPackagesCoins > 0) {
          setAllPackagesCoins(data.allPackagesCoins);
        }
      })
      .catch((err) => {
        console.error("Failed to load promotion packages:", err);
      });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      loadPromotionPackages();
    });

    const handlePromotionsUpdated = () => loadPromotionPackages();
    const handleFocus = () => loadPromotionPackages();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "rojlo_promo_update") {
        loadPromotionPackages();
      }
    };

    window.addEventListener("promotions:updated", handlePromotionsUpdated);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("promotions:updated", handlePromotionsUpdated);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadPromotionPackages]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    authenticatedFetch("/api/ads")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const list: Ad[] = (data.ads ?? []).filter(
          (a: Ad) => (a.status ?? "active") !== "deleted"
        );
        setAds(list);
        if (adIdParam && list.some((a) => a._id === adIdParam)) {
          setSelectedAdId(adIdParam);
        } else if (list.length > 0) {
          setSelectedAdId((prev) => prev || list[0]._id || "");
        }
      })
      .catch(() => {
        if (active) setAds([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ready, adIdParam]);

  if (!ready) return null;

  const selectedAd = ads.find((a) => a._id === selectedAdId);
  const selectedPkg =
    promoPackages.find((p) => p.id === selectedPackageId) ||
    promoPackages[0] ||
    DEFAULT_PROMO_PACKAGES[0];

  const selectedTierInfo = getTierRankInfo(selectedPkg.tier, `${selectedPkg.id} ${selectedPkg.title}`);
  const selectedRankRange = selectedPkg.rankRange || selectedTierInfo.rankRange;

  const userCoins = Number(user?.coins ?? 0);

  // Determine whether shift selection has been made (either a single shift or all shifts)
  const isShiftSelected = Boolean(allShifts || selectedShift);

  // Shift multiplier: 4 for all 4 slots, 1 for single slot
  const slotMultiplier = allShifts ? 4 : 1;

  // Base coins: all-packages combo vs individual package
  const baseCoins = allPackages
    ? allPackagesCoins
    : Math.max(1, Math.round(Number(selectedPkg.coinsCost || 5)));

  // Total coins cost: baseCoins * slotMultiplier
  const totalCoinsCost = baseCoins * slotMultiplier;
  const hasEnoughCoins = userCoins >= totalCoinsCost;

  // Shift timing calculation
  const previewShift = allShifts ? "all" : (selectedShift || "morning");
  const currentShiftTiming = calculateShiftTiming(previewShift);

  const isAdPromoted = (ad: Ad) => {
    const raw = ad as unknown as Record<string, unknown>;
    return Boolean(raw.promoted || raw.isPromoted || raw.promotedUntil || raw.isVip);
  };

  const handleSelectSingleShift = (shiftId: PromoShift) => {
    setSelectedShift(shiftId);
    setAllShifts(false);
    setErrorMessage(null);
  };

  const handleToggleAllShifts = () => {
    setAllShifts((prev) => {
      const next = !prev;
      if (next) {
        setSelectedShift(null);
      } else {
        setSelectedShift("morning");
      }
      return next;
    });
    setErrorMessage(null);
  };

  const handleToggleAllPackages = () => {
    setAllPackages((prev) => !prev);
    setErrorMessage(null);
  };

  const handlePromote = async () => {
    if (!selectedAd || !selectedAd._id) {
      setErrorMessage("Please select an ad to promote.");
      return;
    }

    if (!isShiftSelected) {
      setErrorMessage("Please select a time slot or turn ON all slots.");
      return;
    }

    if (!hasEnoughCoins) {
      setErrorMessage(
        `You need ${totalCoinsCost} coins for this promotion, but you only have ${userCoins} coins.`
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const shiftPayload = allShifts ? "all" : (selectedShift || "morning");
    const packageIdPayload = allPackages ? "all-packages" : selectedPkg.id;
    const titlePayload = allPackages ? "👑 All Packages VIP Combo" : selectedPkg.title;

    try {
      const res = await authenticatedFetch(`/api/ads/${selectedAd._id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: packageIdPayload,
          title: titlePayload,
          coinsCost: totalCoinsCost,
          shift: shiftPayload,
          allShifts,
          allPackages,
          tier: allPackages ? "platinum" : selectedTierInfo.tier,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to promote ad.");
      }

      const expiry = new Date(data.promotedUntil || currentShiftTiming.promotedUntil);
      const start = new Date(data.promotedFrom || currentShiftTiming.promotedFrom);

      setModalData({
        adTitle: selectedAd.name || selectedAd.title || "Your Ad",
        rankRange: allPackages ? "Top Rank #1" : (data.rankRange || selectedRankRange),
        shiftName: allShifts ? "All 4 Shifts (24h Full Day)" : getShiftShortLabel(selectedShift || "morning"),
        promotedFrom: start,
        promotedUntil: expiry,
        isCurrentShift: Boolean(data.isCurrentShift ?? currentShiftTiming.isCurrentShift),
        isNextDay: Boolean(data.isNextDay ?? currentShiftTiming.isNextDay),
        isAllShifts: allShifts,
        isAllPackages: allPackages,
        totalCoins: totalCoinsCost,
      });

      await refreshAuth();
      loadAds();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to promote ad.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="px-2.5 py-6 sm:px-6 sm:py-10 lg:px-8 max-w-full overflow-hidden">
      <SectionPanel className="p-3.5 sm:p-6 md:p-8 w-full max-w-5xl mx-auto overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-red-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-red-950">
                Promote The Ad
              </h1>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-black text-red-900 uppercase">
                6-Hour Shift Rotation
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 font-medium">
              Boost your ad with guaranteed top position ranking during your chosen shift or 24/7 full day.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="soft"
              onClick={() => router.push("/post-ad/your-ads")}
              className="!text-black text-xs sm:text-sm font-bold"
            >
              &larr; Back
            </Button>
          </div>
        </div>

        {/* Promotion Required Notice */}
        {searchParams.get("required") === "1" && (
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm font-semibold text-amber-950 flex items-start gap-3 shadow-xs">
            <span className="text-xl shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="font-bold text-sm sm:text-base text-red-950">
                Promotion Required to Publish on City Page
              </p>
              <p className="text-xs sm:text-sm text-amber-900 mt-0.5 leading-relaxed font-medium">
                You have already used your account&apos;s 1 free ad allowance. To make this ad visible to clients in city search listings, select a time slot and promotion package below and activate it.
              </p>
            </div>
          </div>
        )}

        {/* Notifications */}
        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs sm:text-sm font-semibold text-emerald-900">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs sm:text-sm font-semibold text-rose-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>{errorMessage}</span>
            {!hasEnoughCoins && (
              <Link
                href="/post-ad/buy-coin"
                className="underline font-bold text-red-700 hover:text-red-950"
              >
                Buy Coins Now &rarr;
              </Link>
            )}
          </div>
        )}

        {/* 1. Ad Selector Section */}
        <div className="mt-6 rounded-2xl bg-white border border-red-200/90 p-4 sm:p-6 shadow-xs">
          <h2 className="text-sm sm:text-base font-black text-red-950 uppercase tracking-wide">
            1. Select the Ad to Promote
          </h2>

          {loading ? (
            <p className="mt-3 text-xs text-gray-500">Loading your ads...</p>
          ) : ads.length === 0 ? (
            <div className="mt-3 rounded-xl bg-pink-50/60 p-4 text-center">
              <p className="text-xs sm:text-sm text-neutral-800">You do not have any ads yet.</p>
              <Link
                href="/post-ad/new"
                className="mt-3 inline-block rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800"
              >
                + Post an Ad First
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <div className="max-w-md">
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Choose an ad:
                </label>
                <select
                  value={selectedAdId}
                  onChange={(e) => {
                    setSelectedAdId(e.target.value);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="w-full rounded-xl border border-red-200 bg-pink-50/30 p-2.5 text-xs sm:text-sm font-medium text-red-950 focus:border-red-600 focus:outline-none"
                >
                  {ads.map((ad) => (
                    <option key={ad._id} value={ad._id}>
                      {ad.name || ad.title} {ad.city ? `(${ad.city})` : ""} {isAdPromoted(ad) ? "⭐ [Promoted]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAd && (
                <div className="mt-4 rounded-xl border border-red-100 bg-pink-50/25 p-3 sm:p-4 flex flex-col sm:flex-row gap-3.5 sm:gap-4 overflow-hidden">
                  <div className="relative shrink-0 w-full sm:w-36 h-40 sm:h-28 rounded-xl overflow-hidden bg-pink-100 flex items-center justify-center border border-red-200/60">
                    {selectedAd.images?.[0] ? (
                      <Image
                        src={selectedAd.images[0]}
                        alt={selectedAd.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 144px"
                      />
                    ) : (
                      <div className="text-xs text-gray-500 font-medium">No Image</div>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {selectedAd.images?.length || 1}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                          {selectedAd.category || "Classified"}
                        </span>
                        {isAdPromoted(selectedAd) ? (
                          <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            ⭐ Already Promoted
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Free Ad
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 text-sm sm:text-base font-black text-red-600 truncate">
                        {selectedAd.city ? `[${selectedAd.city.toUpperCase()}] • ` : ""}
                        {selectedAd.title || selectedAd.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-700 line-clamp-2">
                        {selectedAd.about}
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 font-semibold">
                      {selectedAd.age && <span>📅 {selectedAd.age} Years</span>}
                      {selectedAd.city && <span>📍 {selectedAd.city}</span>}
                      <span>🌐 Indian</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Select Your Shift Section (4 Interactive Boxes + All Slots ON/OFF Button) */}
        <div className="mt-6 rounded-2xl bg-white border border-red-200/90 p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-red-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-red-950 uppercase tracking-wide">
                  2. Select Your Shift (6-Hour Daily Slot)
                </h2>
                {allShifts && (
                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-black text-emerald-900 uppercase tracking-wider">
                    24h Full Day (4 Slots)
                  </span>
                )}
              </div>
            </div>

            {/* ON/OFF Switch for All Slots */}
            <div className="flex items-center gap-3 self-start md:self-auto bg-pink-50/80 border border-red-200/80 rounded-2xl px-3.5 py-2">
              <div className="text-left">
                <div className="text-xs font-black text-red-950 flex items-center gap-1.5">
                  <span>All Time Slots</span>
                  <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-800 uppercase">
                    24 Hours
                  </span>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={allShifts}
                onClick={handleToggleAllShifts}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  allShifts ? "bg-neutral-900" : "bg-neutral-300"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    allShifts ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 4 Shift Slot Boxes */}
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {SHIFT_BOXES.map((shift) => {
              const isBoxActiveNow = activeISTShift === shift.id;
              const isSelected = allShifts || selectedShift === shift.id;

              return (
                <div
                  key={shift.id}
                  onClick={() => handleSelectSingleShift(shift.id)}
                  className={`relative cursor-pointer rounded-2xl p-4 text-center transition-all select-none border ${
                    allShifts
                      ? "border-emerald-500 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20"
                      : isSelected
                      ? "border-red-600 bg-pink-50 shadow-md ring-2 ring-red-500/30 scale-[1.01]"
                      : "border-red-200/80 bg-white hover:border-red-300 hover:bg-pink-50/20"
                  }`}
                >
                  <h3 className="text-sm sm:text-base font-black text-red-950">
                    {shift.name}
                  </h3>
                  <p className="mt-1 text-xs font-bold text-red-700">
                    {shift.timeRange}
                  </p>
                  {isBoxActiveNow && (
                    <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Live Now
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Schedule Timing Banner */}
          {isShiftSelected && (
            <div className="mt-4 rounded-xl border border-red-100 bg-pink-50/40 p-3 text-xs font-semibold">
              {allShifts ? (
                <p className="text-emerald-900 leading-relaxed">
                  <strong>24-Hour Full Day Active:</strong> Your ad will run continuously across all 4 shifts starting immediately until{" "}
                  <strong className="underline text-red-950">{formatDateTime(currentShiftTiming.promotedUntil)}</strong>.
                </p>
              ) : currentShiftTiming.isCurrentShift ? (
                <p className="text-emerald-800 leading-relaxed">
                  <strong>Active Now:</strong> Your ad will post immediately and run during the{" "}
                  <strong>{getShiftShortLabel(selectedShift || "morning")}</strong> shift until{" "}
                  <strong className="underline text-red-950">{formatDateTime(currentShiftTiming.promotedUntil)}</strong>.
                </p>
              ) : currentShiftTiming.isNextDay ? (
                <p className="text-indigo-900 leading-relaxed">
                  <strong>Shift has passed today:</strong> Scheduled to start tomorrow at{" "}
                  <strong className="underline text-red-950">{formatDateTime(currentShiftTiming.promotedFrom)}</strong> and run during the{" "}
                  <strong>{getShiftShortLabel(selectedShift || "morning")}</strong> shift until{" "}
                  <strong className="underline text-red-950">{formatDateTime(currentShiftTiming.promotedUntil)}</strong>.
                </p>
              ) : (
                <p className="text-amber-900 leading-relaxed">
                  <strong>Scheduled for Today:</strong> Starts today at{" "}
                  <strong className="underline text-red-950">{formatDateTime(currentShiftTiming.promotedFrom)}</strong> and runs during the{" "}
                  <strong>{getShiftShortLabel(selectedShift || "morning")}</strong> shift until{" "}
                  <strong className="underline text-red-950">{formatDateTime(currentShiftTiming.promotedUntil)}</strong>.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 3. Promotion Packages Section (Revealed when a time slot is chosen or All Slots is ON) */}
        {isShiftSelected && (
          <div className="mt-6 rounded-2xl bg-white border border-red-200/90 p-4 sm:p-6 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="border-b border-red-100 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-red-950 uppercase tracking-wide flex items-center gap-2">
                  <span>3. Choose a Promotion Package</span>
                  {allPackages && (
                    <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                      👑 All-in-One Combo
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {allShifts
                    ? "Prices calculated for all 4 slots (24-Hour Full Day • 4× shift multiplier)."
                    : "Prices calculated for your selected 6-hour shift."}
                </p>
              </div>

              {/* ON/OFF Switch for All Packages Once */}
              <div className="flex items-center gap-3 self-start md:self-auto bg-amber-50/80 border border-amber-200 rounded-2xl px-3.5 py-2">
                <div className="text-left">
                  <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <span>👑 Select All Packages Once</span>
                  </div>
                  <div className="text-[10px] text-amber-800 font-semibold">
                    {allPackages
                      ? "All VIP tiers combined (Rank #1 Guaranteed)"
                      : "Turn ON for All-in-One VIP Combo"}
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={allPackages}
                  onClick={handleToggleAllPackages}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allPackages ? "bg-amber-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      allPackages ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* If All Packages Toggle is ON */}
            {allPackages ? (
              <div className="mt-5 rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-pink-50/80 p-5 sm:p-6 shadow-md relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-28 h-28 bg-amber-300/20 rounded-full blur-xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/90 border border-amber-400 px-3 py-0.5 text-xs font-black text-amber-950 uppercase tracking-wider">
                      <span>👑 ALL-IN-ONE VIP COMBO</span>
                    </div>
                    <h3 className="mt-2 text-lg sm:text-xl font-black text-red-950">
                      Maximum Visibility &bull; Guaranteed Rank #1
                    </h3>
                    <p className="mt-1 text-xs text-gray-700 font-medium max-w-xl">
                      Includes all benefits of Platinum, Gold, Silver &amp; Bronze VIP tiers. Your ad gets absolute highest placement across city listings and search results.
                    </p>
                  </div>

                  {/* Price display with calculation */}
                  <div className="shrink-0 bg-white/90 border border-amber-300 rounded-2xl p-3.5 sm:text-right shadow-xs">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                      Calculated Coin Price:
                    </span>
                    <div className="flex items-baseline sm:justify-end gap-1.5 mt-0.5">
                      <span className="text-3xl font-black text-red-600">
                        {totalCoinsCost}
                      </span>
                      <span className="text-xs font-bold text-gray-600">Coins</span>
                    </div>
                    {allShifts ? (
                      <p className="text-[11px] font-extrabold text-red-700 mt-1">
                        ({allPackagesCoins} coins &times; 4 shifts = {totalCoinsCost} coins)
                      </p>
                    ) : (
                      <p className="text-[11px] font-extrabold text-red-700 mt-1">
                        ({allPackagesCoins} coins for 1 shift)
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-amber-200/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold text-gray-800">
                  <div className="flex items-center gap-2 bg-white/70 rounded-xl p-2.5 border border-amber-200/60">
                    <span className="text-amber-600 text-base">🎯</span>
                    <span>Guaranteed #1 Top Position</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/70 rounded-xl p-2.5 border border-amber-200/60">
                    <span className="text-amber-600 text-base">⭐</span>
                    <span>All VIP Badges Combined</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/70 rounded-xl p-2.5 border border-amber-200/60">
                    <span className="text-amber-600 text-base">⚡</span>
                    <span>Highest Call &amp; Chat Leads</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/70 rounded-xl p-2.5 border border-amber-200/60">
                    <span className="text-amber-600 text-base">✨</span>
                    <span>Glowing Featured Card Border</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Regular 4 Package Cards Grid */
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {promoPackages.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id;
                  const tierInfo = getTierRankInfo(pkg.tier, `${pkg.id} ${pkg.title}`);
                  const baseRate = Math.max(1, Math.round(Number(pkg.coinsCost || 5)));
                  const pkgTotalCoins = baseRate * slotMultiplier;

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`relative cursor-pointer rounded-2xl p-4 transition-all flex flex-col justify-between border ${
                        isSelected
                          ? "border-red-600 bg-pink-50/90 shadow-md ring-2 ring-red-500/20 scale-[1.01]"
                          : "border-red-100 bg-white hover:border-red-300 hover:bg-pink-50/30"
                      }`}
                    >
                      {/* Badge */}
                      {pkg.tag && (
                        <span
                          className={`absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            pkg.highlight
                              ? "bg-red-700 text-white shadow-xs"
                              : "bg-red-100 text-red-900 border border-red-200"
                          }`}
                        >
                          {pkg.tag}
                        </span>
                      )}

                      <div>
                        {/* Tier badge */}
                        <div className="mb-2">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black shadow-2xs ${tierInfo.badgeClass}`}>
                            {tierInfo.badge}
                          </span>
                        </div>

                        <h3 className="text-xs sm:text-sm font-black text-red-950 pr-4">
                          {pkg.title}
                        </h3>

                        {/* Guaranteed Position Pill */}
                        <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-100/80 px-2 py-0.5 text-[11px] font-extrabold text-red-950">
                          <span>🎯 Position:</span>
                          <span className="text-red-700 underline">{pkg.rankRange || tierInfo.rankRange}</span>
                        </div>

                        {/* Price Calculation */}
                        <div className="mt-3">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-red-600">
                              {pkgTotalCoins}
                            </span>
                            <span className="text-xs font-bold text-gray-600">Coins</span>
                            <span className="rounded-md bg-pink-100 px-1.5 py-0.5 text-[10px] font-black text-red-900 uppercase">
                              {allShifts ? "24h Pass" : "1 Shift"}
                            </span>
                          </div>

                          {allShifts ? (
                            <p className="text-[10px] text-gray-500 mt-1 font-bold">
                              ({baseRate} coins &times; 4 shifts = {pkgTotalCoins} coins)
                            </p>
                          ) : (
                            <p className="text-[10px] text-gray-500 mt-1 font-semibold">
                              ({baseRate} coins / 6-hour shift)
                            </p>
                          )}
                        </div>

                        <ul className="mt-3 space-y-1.5 text-[11px] text-gray-600">
                          {(pkg.features || []).map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 pt-3 border-t border-red-100/60">
                        <button
                          type="button"
                          className={`w-full rounded-xl py-1.5 text-xs font-bold transition ${
                            isSelected
                              ? "bg-neutral-900 text-white shadow-xs"
                              : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
                          }`}
                        >
                          {isSelected ? "Selected ✓" : "Select Package"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action CTA & Calculated Amount Summary Bar */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-pink-50/50 border border-red-200/80 p-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-black">
                  Promotion Summary &bull; Calculated Total
                </p>
                <div className="text-sm font-black text-red-950 mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span>{allPackages ? "👑 All Packages VIP Combo" : selectedPkg.title}</span>
                  <span className="text-gray-400">&bull;</span>
                  <span className="text-red-700 font-black text-base">{totalCoinsCost} Coins</span>
                  <span className="text-xs text-gray-600 font-bold">
                    ({allShifts ? `${baseCoins} coins × 4 shifts (24h)` : `${totalCoinsCost} coins / 1 shift`})
                  </span>
                </div>
                <p className="text-xs text-gray-600 font-medium mt-0.5">
                  Slot: <strong className="text-red-950">{allShifts ? "All 4 Shifts (24 Hours Full Day)" : getShiftLabel(selectedShift || "morning")}</strong>
                </p>
              </div>

              {hasEnoughCoins ? (
                <button
                  type="button"
                  disabled={submitting || !selectedAd}
                  onClick={handlePromote}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 text-white px-6 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider transition shadow-md cursor-pointer"
                >
                  <span>🚀</span>
                  <span>{submitting ? "Promoting..." : `Promote Ad Now (${totalCoinsCost} Coins)`}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-700">
                    Need {totalCoinsCost - userCoins} more coins
                  </span>
                  <Link
                    href="/post-ad/buy-coin"
                    className="rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white px-4 py-2 text-xs font-bold transition"
                  >
                    Buy Coins &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </SectionPanel>

      {/* Promotion Success Modal */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-red-200 text-center relative">
            <button
              type="button"
              onClick={() => setModalData(null)}
              className="absolute top-3.5 right-3.5 text-gray-400 hover:text-gray-700 text-xl font-bold p-1 leading-none cursor-pointer"
              aria-label="Close"
            >
              &times;
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              🎉
            </div>

            <h3 className="mt-3 text-lg font-black text-red-950">
              Ad Promoted Successfully!
            </h3>

            <p className="mt-1 text-xs font-semibold text-gray-600 truncate max-w-xs mx-auto">
              {modalData.adTitle} &bull; <span className="text-red-700 font-bold">{modalData.rankRange}</span>
            </p>

            {/* Expiry & Time Left Box */}
            <div className="mt-4 rounded-xl border border-red-100 bg-pink-50/50 p-4 space-y-2.5 text-left">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  Promotion Cost Paid:
                </p>
                <p className="text-xs font-bold text-red-950 mt-0.5">
                  <span className="text-red-700 font-extrabold text-sm">{modalData.totalCoins || totalCoinsCost} Coins Paid</span>
                  {modalData.isAllShifts ? " (All 4 Shifts • 24 Hours)" : " (6-Hour Shift)"}
                </p>
              </div>

              <div className="border-t border-red-100/80 pt-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  Shift Timing:
                </p>
                <p className="text-xs font-bold text-red-950 mt-0.5">
                  {modalData.shiftName} {modalData.isCurrentShift ? "• 🟢 Live Now" : modalData.isNextDay ? "• 📅 Tomorrow" : "• 🕒 Scheduled"}
                </p>
              </div>

              <div className="border-t border-red-100/80 pt-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  {modalData.isCurrentShift ? "Ad Expire Time:" : "Promotion Schedule:"}
                </p>
                {!modalData.isCurrentShift && (
                  <p className="text-xs font-bold text-indigo-900 mt-0.5">
                    Starts: {formatDateTime(modalData.promotedFrom)}
                  </p>
                )}
                <p className="text-sm font-black text-red-950 mt-0.5">
                  Expires: {formatDateTime(modalData.promotedUntil)}
                </p>
              </div>

              <div className="border-t border-red-100/80 pt-2 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">
                  {modalData.isCurrentShift ? "Time Left in Shift:" : "Shift Length:"}
                </span>
                <span className="text-sm font-black text-emerald-700 font-mono">
                  {modalData.isCurrentShift ? (countdown || "Calculating...") : modalData.isAllShifts ? "24 Hours" : "6 Hours"}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex gap-2">
              <Link
                href="/post-ad/your-ads"
                className="flex-1 rounded-xl bg-neutral-950 hover:bg-neutral-800 !text-white text-white py-2.5 text-xs sm:text-sm font-bold transition shadow-xs flex items-center justify-center"
                style={{ color: "#ffffff" }}
              >
                View Your Ads
              </Link>
              <button
                type="button"
                onClick={() => setModalData(null)}
                className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-gray-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
