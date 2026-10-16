"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Ad } from "./types";
import { cityPlaces } from "@/lib/places";
import { YourAdsListSkeleton } from "@/components/skeletons/post-ad-skeletons";
import {
  isAdPromotionActive,
  isAdScheduledFuture,
  getTierRankInfo,
  getShiftShortLabel,
  formatDateTime,
  formatTimeRemaining,
  isAdShiftResting,
  getNextShiftStart,
} from "@/lib/promo-shifts";

function getCityUrl(cityName: string) {
  if (!cityName) return "/places";
  const city = cityPlaces.find(
    (place) => place.name.toLowerCase() === cityName.toLowerCase()
  );
  if (city) return `/places/${city.slug}`;
  const slug = cityName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `/places/${slug}`;
}

function formatShortDate(date?: string | Date) {
  const d = date ? new Date(date) : new Date();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()] || "Oct";
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

type TabType = "all" | "promoted" | "free" | "not_published";

interface TabItem {
  id: TabType;
  label: string;
}

const TABS: TabItem[] = [
  { id: "all", label: "All" },
  { id: "promoted", label: "Promoted" },
  { id: "free", label: "Free" },
  { id: "not_published", label: "Not Published" },
];

export default function YourAdsSection({
  ads,
  freeAdAllowance = 1,
  freeAdsUsed,
  hiddenAdsCount,
  onEdit,
  onDelete,
  onToggleStatus,
  loading = false,
}: {
  ads: Ad[];
  userEmail?: string;
  freeAdAllowance?: number;
  freeAdsUsed?: number;
  hiddenAdsCount?: number;
  onEdit: (ad: Ad) => void;
  onDelete: (ad: Ad) => void;
  onToggleStatus?: (ad: Ad) => void;
  loading?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabType>("all");

  const isAdPromoted = (ad: Ad) => {
    return isAdPromotionActive(ad);
  };

  const publishedAds = ads.filter(
    (ad) =>
      (ad.status ?? "active") !== "deleted" &&
      ad.status !== "suspended" &&
      ad.status !== "pending" &&
      ad.status !== "draft"
  );

  const notPublishedAds = ads.filter(
    (ad) =>
      (ad.status ?? "active") !== "deleted" &&
      (ad.status === "suspended" || ad.status === "pending" || ad.status === "draft")
  );

  // Active promoted ads: published AND active promotion (promotedUntil > now)
  const promotedAds = publishedAds.filter((ad) => isAdPromotionActive(ad));

  // Free ads: published AND NOT actively promoted (includes ads that were never promoted, and ads whose promo expired!)
  const freeAds = publishedAds.filter((ad) => !isAdPromotionActive(ad));

  // All ads: all non-deleted ads
  const allAds = ads.filter((ad) => (ad.status ?? "active") !== "deleted");

  const actualFreeUsed =
    freeAdsUsed !== undefined
      ? freeAdsUsed
      : ads.some((a) => a.isFreeAd)
      ? 1
      : 0;

  const actualHiddenCount =
    hiddenAdsCount !== undefined
      ? hiddenAdsCount
      : ads.filter(
          (a) =>
            (a.status ?? "active") !== "deleted" &&
            a.status !== "suspended" &&
            !isAdPromotionActive(a) &&
            !a.isFreeAd
        ).length;

  let currentList: Ad[] = [];
  let countLabel = "active ads";

  if (activeTab === "all") {
    currentList = allAds;
    countLabel = "total ads";
  } else if (activeTab === "promoted") {
    currentList = promotedAds;
    countLabel = "promoted ads";
  } else if (activeTab === "free") {
    currentList = freeAds;
    countLabel = "free ads";
  } else {
    currentList = notPublishedAds;
    countLabel = "not published ads";
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl w-full max-w-full overflow-hidden box-border">
      {/* Free Ad Policy & Allowance Summary Banner */}
      <div className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/80 to-slate-900/60 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5 shrink-0">
              {actualFreeUsed > 0 ? "🎁" : "✨"}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Free Ad Allowance: {actualFreeUsed} / {freeAdAllowance} Used
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    actualFreeUsed > 0
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {actualFreeUsed > 0 ? "1 Free Ad Active" : "1 Available"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Each account receives 1 active free ad. Additional ads require promotion to be visible in city search.
              </p>
            </div>
          </div>

          <div className="shrink-0 sm:self-center">
            <Link
              href="/post-ad/your-ads/promoted"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:opacity-95"
            >
              <span>🚀</span>
              <span>Promote Listings</span>
            </Link>
          </div>
        </div>

        {actualHiddenCount > 0 && (
          <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <span className="text-base shrink-0">⚠️</span>
            <p className="font-medium">
              <strong className="text-amber-300">{actualHiddenCount} listing(s) hidden from city search:</strong> Because your free ad slot is in use, extra ads remain hidden from city listings until activated with a promotion package.
            </p>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-xs sm:text-sm overflow-x-auto no-scrollbar scroll-smooth w-full">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3.5 py-2 font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Ads Count Heading */}
      <div className="mt-4 flex items-center justify-between text-xs sm:text-sm text-slate-400">
        <p>
          Showing <strong className="font-bold text-white">{currentList.length} {countLabel}</strong>
        </p>
      </div>

      {loading ? (
        <div className="mt-6">
          <YourAdsListSkeleton />
        </div>
      ) : currentList.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-8 text-center sm:p-12">
          <span className="text-3xl">📭</span>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            No ads found in the <strong className="text-amber-400">{activeTab.replace("_", " ")}</strong> tab.
          </p>
          <Link
            href="/post-ad/new"
            className="mt-4 inline-block rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:opacity-95"
          >
            + Post a New Ad
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {currentList.map((ad) => {
            const hasImage = Array.isArray(ad.images) && ad.images.length > 0 && Boolean(ad.images[0]);
            const isPromoted = isAdPromoted(ad);
            const created = ad.createdAt ? new Date(ad.createdAt) : new Date();
            const expireDate = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
            const expireShort = formatShortDate(expireDate);

            const displayTitle = ad.city
              ? `[${ad.city.toUpperCase()}] • ${ad.title || ad.name}`
              : ad.title || ad.name;

            return (
              <article
                key={ad._id}
                className="w-full max-w-full min-w-0 rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:p-5 shadow-lg flex flex-col gap-4 transition-all hover:border-amber-500/30 overflow-hidden box-border"
              >
                {/* Top Status & Expiration Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-white/10 pb-3.5 text-xs w-full min-w-0">
                  {/* Left Metadata */}
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-slate-400 font-medium">
                      Expires: <strong className="text-white font-bold">{expireShort}</strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          ad.status === "suspended"
                            ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {ad.status === "suspended" ? "Suspended" : "Active"}
                      </span>

                      {ad.status !== "suspended" && (
                        isPromoted ? (
                          <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            🟢 Visible (Promoted)
                          </span>
                        ) : ad.isFreeAd ? (
                          <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            🆓 1 Free Ad (Visible on City Page)
                          </span>
                        ) : (
                          <span className="inline-block rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                            🔴 Hidden (Promotion Required)
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Right VIP / Promo Schedule */}
                  <div className="sm:text-right space-y-1 text-xs min-w-0">
                    {(() => {
                      const isPromoValid = isAdPromotionActive(ad);
                      const isScheduled = isAdScheduledFuture(ad);
                      const isPromotedEver = Boolean(ad.promoted || ad.isPromoted || ad.promotedUntil);
                      const tierInfo = getTierRankInfo(ad.promoTier, ad.promoPackage);
                      const shiftLabel = getShiftShortLabel(ad.promoShift);
                      const promoExpiryFormatted = formatDateTime(ad.promotedUntil);
                      const promoStartFormatted = formatDateTime(ad.promotedFrom);

                      if (isScheduled) {
                        return (
                          <>
                            <div className="flex sm:justify-end items-center gap-1.5">
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${tierInfo.badgeClass}`}>
                                {tierInfo.badge}
                              </span>
                              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
                                🕒 Scheduled
                              </span>
                            </div>
                            <p className="font-bold text-white text-xs">
                              Position: <span className="text-amber-400 underline">{tierInfo.rankRange}</span>
                            </p>
                            <p className="text-slate-400 font-semibold text-[11px]">
                              Shift: {shiftLabel}
                            </p>
                            <p className="text-indigo-400 font-semibold text-[11px] flex flex-wrap items-center sm:justify-end gap-1 pt-0.5 leading-tight break-words">
                              <span>🕒 Starts: {promoStartFormatted} • Expires: {promoExpiryFormatted}</span>
                            </p>
                          </>
                        );
                      }

                      if (isPromoValid) {
                        const isResting = isAdShiftResting(ad);
                        const nextShiftDate = getNextShiftStart(ad.promoShift);
                        const nextShiftFormatted = formatDateTime(nextShiftDate);

                        if (isResting) {
                          return (
                            <>
                              <div className="flex sm:justify-end items-center gap-1.5">
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${tierInfo.badgeClass}`}>
                                  {tierInfo.badge}
                                </span>
                                <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                                  ⏸️ Shift Resting
                                </span>
                              </div>
                              <p className="font-bold text-white text-xs">
                                Position: <span className="text-amber-400 underline">{tierInfo.rankRange}</span>
                              </p>
                              <p className="text-slate-400 font-semibold text-[11px]">
                                Shift: {shiftLabel} • <span className="text-amber-400 font-bold">Resting</span>
                              </p>
                              <p className="text-amber-300 font-semibold text-[11px] flex flex-wrap items-center sm:justify-end gap-1 pt-0.5 leading-tight break-words">
                                <span>🔄 Returns: {nextShiftFormatted} • {formatTimeRemaining(ad.promotedUntil)}</span>
                              </p>
                            </>
                          );
                        }

                        return (
                          <>
                            <div className="flex sm:justify-end items-center gap-1.5">
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${tierInfo.badgeClass}`}>
                                {tierInfo.badge}
                              </span>
                            </div>
                            <p className="font-bold text-white text-xs">
                              Position: <span className="text-amber-400 underline">{tierInfo.rankRange}</span>
                            </p>
                            <p className="text-slate-400 font-semibold text-[11px]">
                              Shift: {shiftLabel} • <span className="text-emerald-400 font-bold">Active Now</span>
                            </p>
                            <p className="text-emerald-400 font-semibold text-[11px] flex flex-wrap items-center sm:justify-end gap-1 pt-0.5 leading-tight break-words">
                              <span>🕒 {formatTimeRemaining(ad.promotedUntil)}</span>
                            </p>
                          </>
                        );
                      }

                      if (isPromotedEver && ad.promotedUntil) {
                        return (
                          <>
                            <div className="flex sm:justify-end items-center gap-1.5">
                              <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-bold text-rose-300">
                                🔴 Promo Expired
                              </span>
                            </div>
                            <p className="font-bold text-slate-300 text-xs">{tierInfo.title}</p>
                            <p className="text-slate-400 text-[11px]">Shift: {shiftLabel}</p>
                            <p className="text-rose-400 font-semibold text-[11px] flex flex-wrap items-center sm:justify-end gap-1 pt-0.5 leading-tight break-words">
                              <span>Expired: {promoExpiryFormatted}</span>
                            </p>
                          </>
                        );
                      }

                      return (
                        <>
                          <p className="font-bold text-slate-300">Standard Free Ad</p>
                          <p className="text-slate-400 text-[11px]">Ranked in regular listings</p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Ad Preview Card */}
                <div className="w-full min-w-0 rounded-xl border border-white/10 bg-slate-900/40 p-3 sm:p-4 flex flex-col sm:flex-row gap-3.5 sm:gap-4 overflow-hidden box-border">
                  {/* Thumbnail Photo with Image Count */}
                  <div className="relative shrink-0 w-full sm:w-40 sm:min-w-[160px] h-44 sm:h-36 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-white/10">
                    {hasImage && ad.images?.[0] ? (
                      <Image
                        src={ad.images[0]}
                        alt={ad.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 160px"
                      />
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400 font-medium leading-relaxed">
                        No image uploaded
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs border border-white/10">
                      📷 {ad.images?.length || 0}
                    </span>
                  </div>

                  {/* Ad Information */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between gap-2 overflow-hidden">
                    <div>
                      <p className="text-xs font-bold text-amber-400 uppercase tracking-wider truncate">
                        {ad.category || "General Service"}
                      </p>
                      <h3 className="mt-1 text-base sm:text-lg font-black text-white leading-snug break-words">
                        {displayTitle}
                      </h3>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed line-clamp-2 break-words">
                        {ad.about}
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400 font-medium">
                      {ad.age && (
                        <span className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                          📅 {ad.age} Yrs
                        </span>
                      )}
                      {ad.city && (
                        <span className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                          📍 {ad.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                        🌐 Verified In-City
                      </span>
                    </div>
                  </div>
                </div>

                {/* Free Ad Banner / Hidden Warning */}
                {!isPromoted && (
                  ad.isFreeAd ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 sm:p-3 text-xs text-amber-200 w-full min-w-0 box-border">
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                        ✓
                      </div>
                      <div className="min-w-0 break-words">
                        <p className="font-bold text-amber-300">Active Free Ad (Visible on City Page)</p>
                        <p className="text-amber-200/80 text-[11px] mt-0.5">
                          This is your 1 free ad visible to visitors in {ad.city}. Upgrade with VIP promotion for top placement and maximum inquiries!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 sm:p-3 text-xs text-rose-200 w-full min-w-0 box-border">
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold">
                        !
                      </div>
                      <div className="min-w-0 break-words">
                        <p className="font-bold text-rose-300">Hidden from City Page • Promotion Required</p>
                        <p className="text-rose-200/80 text-[11px] mt-0.5 font-medium">
                          Only 1 free ad is active per account. This ad is <strong>hidden from {ad.city} search listings</strong> until promoted with a VIP package.
                        </p>
                      </div>
                    </div>
                  )
                )}

                {/* Bottom Actions Bar */}
                <div className="grid grid-cols-4 sm:flex sm:items-center sm:justify-around border-t border-white/10 pt-3 text-xs font-bold gap-1 w-full min-w-0">
                  <Link
                    href={getCityUrl(ad.city)}
                    className="flex items-center justify-center gap-1.5 text-slate-300 hover:text-white transition py-2 px-2 rounded-xl hover:bg-white/5 text-[11px] sm:text-xs"
                  >
                    <span>👁</span>
                    <span>View</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => onToggleStatus?.(ad)}
                    className="flex items-center justify-center gap-1.5 text-slate-300 hover:text-white transition py-2 px-2 rounded-xl hover:bg-white/5 text-[11px] sm:text-xs cursor-pointer"
                  >
                    <span>{ad.status === "suspended" ? "▶" : "⏸"}</span>
                    <span>{ad.status === "suspended" ? "Activate" : "Suspend"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(ad)}
                    className="flex items-center justify-center gap-1.5 text-slate-300 hover:text-amber-400 transition py-2 px-2 rounded-xl hover:bg-white/5 text-[11px] sm:text-xs cursor-pointer"
                  >
                    <span>✏️</span>
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(ad)}
                    className="flex items-center justify-center gap-1.5 text-slate-300 hover:text-red-400 transition py-2 px-2 rounded-xl hover:bg-white/5 text-[11px] sm:text-xs cursor-pointer"
                  >
                    <span>🗑</span>
                    <span>Delete</span>
                  </button>
                </div>

                {/* Promote The Ad Action Button */}
                {!isPromoted && !ad.isFreeAd ? (
                  <Link
                    href={ad._id ? `/post-ad/your-ads/promoted?adId=${ad._id}&required=1` : "/post-ad/your-ads/promoted"}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-lg shadow-orange-500/20 w-full text-center bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-95"
                  >
                    <span>🚀</span>
                    <span>Promote Now to Make Visible on City Page</span>
                  </Link>
                ) : !isPromoted ? (
                  <Link
                    href={ad._id ? `/post-ad/your-ads/promoted?adId=${ad._id}` : "/post-ad/your-ads/promoted"}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-md w-full text-center bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-95"
                  >
                    <span>⭐</span>
                    <span>Boost with VIP Promotion (Top Ranking)</span>
                  </Link>
                ) : (
                  <Link
                    href={ad._id ? `/post-ad/your-ads/promoted?adId=${ad._id}` : "/post-ad/your-ads/promoted"}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-xs w-full text-center border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                  >
                    <span>⭐</span>
                    <span>Promoted Ad (Manage / Re-promote)</span>
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
