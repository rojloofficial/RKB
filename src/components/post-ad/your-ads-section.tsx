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
    <section className="rounded-2xl bg-white p-3 sm:p-6 md:p-7 shadow-xs w-full max-w-full overflow-hidden box-border">
      {/* Free Ad Policy & Allowance Summary Banner */}
      <div className="mb-6 rounded-2xl border border-red-200/90 bg-pink-50/50 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5 shrink-0">
              {actualFreeUsed > 0 ? "✅" : "🎁"}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-red-950 text-sm sm:text-base">
                  Free Ad Allowance: {actualFreeUsed} / {freeAdAllowance} Used
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    actualFreeUsed > 0
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-pink-200 text-red-900 border border-red-300"
                  }`}
                >
                  {actualFreeUsed > 0 ? "1 Free Ad Active" : "1 Available"}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 sm:self-center">
            <Link
              href="/post-ad/your-ads/promoted"
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-950 px-4 py-2 text-xs font-bold !text-white hover:bg-red-900 transition shadow-xs"
            >
              <span>🚀</span>
              <span>Promote Ads</span>
            </Link>
          </div>
        </div>

        {actualHiddenCount > 0 && (
          <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
            <span className="text-base shrink-0">⚠️</span>
            <p className="font-medium">
              <strong>{actualHiddenCount} ad(s) currently hidden from the city page:</strong> Because you already have 1 free ad, you must promote additional ads to display them to customers in city search results.
            </p>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 sm:gap-8 border-b border-neutral-200 pb-2 text-sm sm:base overflow-x-auto no-scrollbar scroll-smooth w-full">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 transition-all shrink-0 font-bold ${
                isActive
                  ? "text-neutral-950 border-b-2 border-neutral-900 font-black"
                  : "text-neutral-500 hover:text-neutral-950"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Ads Count Heading */}
      <div className="mt-4">
        <p className="text-sm sm:text-base text-neutral-900">
          You have <strong className="font-black text-neutral-900">{currentList.length} {countLabel}</strong>
        </p>
      </div>

      {loading ? (
        <div className="mt-6">
          <YourAdsListSkeleton />
        </div>
      ) : currentList.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-neutral-50 border border-neutral-200 p-6 sm:p-8 text-center">
          <p className="text-sm font-semibold text-neutral-600">
            No ads found in the <strong className="text-neutral-900">{activeTab.replace("_", " ")}</strong> tab.
          </p>
          <Link
            href="/post-ad/new"
            className="mt-4 inline-block rounded-xl bg-neutral-950 px-5 py-2.5 text-xs font-bold !text-white text-white hover:bg-neutral-800 transition shadow-xs"
            style={{ color: "#ffffff" }}
          >
            <span style={{ color: "#ffffff" }} className="!text-white text-white">
              + Post a New Ad
            </span>
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-5 sm:space-y-6">
          {currentList.map((ad) => {
            const hasImage = Array.isArray(ad.images) && ad.images.length > 0 && Boolean(ad.images[0]);
            const isPromoted = isAdPromoted(ad);
            const created = ad.createdAt ? new Date(ad.createdAt) : new Date();
            const expireDate = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
            const expireShort = formatShortDate(expireDate);

            const displayTitle = ad.city
              ? `[${ad.city.toUpperCase()}] • √ ${ad.title || ad.name}`
              : `√ ${ad.title || ad.name}`;

            return (
              <article
                key={ad._id}
                className="w-full max-w-full min-w-0 rounded-2xl border border-neutral-200 bg-white p-3.5 sm:p-6 shadow-xs flex flex-col gap-3.5 sm:gap-4 transition-all overflow-hidden box-border"
              >
                {/* Top Status & Expiration Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-neutral-200 pb-3.5 text-xs w-full min-w-0">
                  {/* Left Metadata */}
                  <div className="space-y-1 min-w-0">
                    <p className="text-neutral-500 font-medium">
                      Ad Expire Date:{" "}
                      <strong className="text-neutral-900 font-bold">{expireShort}</strong>
                    </p>
                    <div className="pt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          ad.status === "suspended"
                            ? "border border-amber-300 bg-amber-50 text-amber-800"
                            : "border border-emerald-300 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {ad.status === "suspended" ? "Suspended" : "Active"}
                      </span>

                      {ad.status !== "suspended" && (
                        isPromoted ? (
                          <span className="inline-block rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                            🟢 Visible (Promoted)
                          </span>
                        ) : ad.isFreeAd ? (
                          <span className="inline-block rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                            🆓 1 Free Ad (Visible on City Page)
                          </span>
                        ) : (
                          <span className="inline-block rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800">
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
                              <span className="rounded-full bg-indigo-100 border border-indigo-300 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800">
                                🕒 Scheduled
                              </span>
                            </div>
                            <p className="font-bold text-red-950 text-xs">
                              Position: <span className="text-red-700 underline">{tierInfo.rankRange}</span>
                            </p>
                            <p className="text-gray-600 font-semibold text-[11px]">
                              Shift: {shiftLabel}
                            </p>
                            <p className="text-indigo-700 font-semibold text-[11px] flex flex-wrap items-center sm:justify-end gap-1 pt-0.5 leading-tight break-words">
                              <span>🕒</span>
                              <span>
                                Starts: {promoStartFormatted} &bull; Expires: {promoExpiryFormatted}
                              </span>
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
                                <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  ⏸️ Shift Resting
                                </span>
                              </div>
                              <p className="font-bold text-red-950 text-xs">
                                Position: <span className="text-red-700 underline">{tierInfo.rankRange}</span>
                              </p>
                              <p className="text-gray-600 font-semibold text-[11px]">
                                Shift: {shiftLabel} &bull; <span className="text-amber-700 font-bold">Resting (Off-Shift)</span>
                              </p>
                              <p className="text-indigo-700 font-semibold text-[11px] flex flex-wrap items-center sm:justify-end gap-1 pt-0.5 leading-tight break-words">
                                <span>🔄</span>
                                <span>
                                  Returns to Top: {nextShiftFormatted} &bull; {formatTimeRemaining(ad.promotedUntil)}
                                </span>
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
                            <p className="font-bold text-red-950 text-xs">
                              Position: <span className="text-red-700 underline">{tierInfo.rankRange}</span>
                            </p>
                            <p className="text-gray-600 font-semibold text-[11px]">
                              Shift: {shiftLabel} &bull; <span className="text-emerald-700 font-bold">Active Now</span>
                            </p>
                            <p className="text-emerald-700 font-semibold text-[11px] flex flex-wrap items-center sm:justify-end gap-1 pt-0.5 leading-tight break-words">
                              <span>🕒</span>
                              <span>{formatTimeRemaining(ad.promotedUntil)}</span>
                            </p>
                          </>
                        );
                      }

                      if (isPromotedEver && ad.promotedUntil) {
                        return (
                          <>
                            <div className="flex sm:justify-end items-center gap-1.5">
                              <span className="rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                                🔴 Promo Expired &bull; Moved to Free
                              </span>
                            </div>
                            <p className="font-bold text-gray-700 text-xs">{tierInfo.title}</p>
                            <p className="text-gray-500 text-[11px]">Shift: {shiftLabel}</p>
                            <p className="text-rose-600 font-semibold text-[11px] flex flex-wrap items-center sm:justify-end gap-1 pt-0.5 leading-tight break-words">
                              <span>Expired on: {promoExpiryFormatted}</span>
                            </p>
                          </>
                        );
                      }

                      return (
                        <>
                          <p className="font-bold text-gray-600">Standard Free Ad</p>
                          <p className="text-gray-400 text-[11px]">No active promotion</p>
                          <p className="text-gray-500 text-[11px] pt-0.5">
                            Ranked in standard listings
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Ad Preview Card */}
                <div className="w-full min-w-0 rounded-xl border border-red-100/90 bg-pink-50/20 p-3 sm:p-4 flex flex-col sm:flex-row gap-3.5 sm:gap-4 overflow-hidden box-border">
                  {/* Thumbnail Photo with Image Count */}
                  <div className="relative shrink-0 w-full sm:w-40 sm:min-w-[160px] h-48 sm:h-36 rounded-xl overflow-hidden bg-pink-100 flex items-center justify-center border border-red-200/60">
                    {hasImage && ad.images?.[0] ? (
                      <Image
                        src={ad.images[0]}
                        alt={ad.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 160px"
                      />
                    ) : (
                      <div className="p-3 text-center text-xs text-gray-500 font-medium leading-relaxed">
                        Preview not visible on line
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                      {ad.images?.length || 1}
                    </span>
                  </div>

                  {/* Ad Information */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between gap-2 overflow-hidden">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
                        {ad.category || "Call Girls"}
                      </p>
                      <h3 className="mt-1 text-sm sm:text-base font-black text-red-600 leading-snug break-words">
                        {displayTitle}
                      </h3>
                      <p className="mt-1.5 text-xs text-gray-700 leading-relaxed line-clamp-3 break-words">
                        {ad.about}
                      </p>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-600 font-semibold">
                      {ad.age && (
                        <span className="flex items-center gap-1">
                          📅 {ad.age} Years
                        </span>
                      )}
                      {ad.city && (
                        <span className="flex items-center gap-1">
                          📍 {ad.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        🌐 IN Indian
                      </span>
                    </div>
                  </div>
                </div>

                {/* Free Ad Banner / Hidden Warning */}
                {!isPromoted && (
                  ad.isFreeAd ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 sm:p-3 text-xs text-blue-950 w-full min-w-0 box-border">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-800 text-[11px] font-bold text-white">
                        ✓
                      </div>
                      <div className="min-w-0 break-words">
                        <p className="font-bold text-blue-950">Active Free Ad (Visible on City Page)</p>
                        <p className="text-blue-900/80 text-[11px] mt-0.5">
                          This is your 1 free ad visible to visitors in {ad.city}. Promote to unlock VIP ranking and display all photos!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 p-2.5 sm:p-3 text-xs text-rose-950 w-full min-w-0 box-border">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-700 text-[11px] font-bold text-white">
                        !
                      </div>
                      <div className="min-w-0 break-words">
                        <p className="font-bold text-rose-950">Hidden from City Page • Promotion Required</p>
                        <p className="text-rose-900/90 text-[11px] mt-0.5 font-medium">
                          Only 1 free ad is allowed per account. This ad is <strong>NOT visible in {ad.city} search listings</strong> until you promote it with a VIP package.
                        </p>
                      </div>
                    </div>
                  )
                )}

                {/* Bottom Actions Bar */}
                <div className="grid grid-cols-4 sm:flex sm:items-center sm:justify-around border-t border-neutral-200 pt-3 text-xs font-bold gap-1 w-full min-w-0">
                  <Link
                    href={getCityUrl(ad.city)}
                    className="flex items-center justify-center gap-1 text-neutral-700 hover:text-neutral-950 transition py-1.5 px-1 sm:px-2.5 rounded-lg hover:bg-neutral-100 text-[11px] sm:text-xs font-bold"
                  >
                    <span>👁</span>
                    <span>VIEW {!isPromoted && !ad.isFreeAd ? "(HIDDEN)" : ""}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => onToggleStatus?.(ad)}
                    className="flex items-center justify-center gap-1 text-neutral-700 hover:text-neutral-950 transition py-1.5 px-1 sm:px-2.5 rounded-lg hover:bg-neutral-100 text-[11px] sm:text-xs font-bold"
                  >
                    <span>{ad.status === "suspended" ? "▶" : "⏸"}</span>
                    <span>{ad.status === "suspended" ? "ACTIVATE" : "SUSPEND"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(ad)}
                    className="flex items-center justify-center gap-1 text-neutral-700 hover:text-neutral-950 transition py-1.5 px-1 sm:px-2.5 rounded-lg hover:bg-neutral-100 text-[11px] sm:text-xs font-bold"
                  >
                    <span>✏</span>
                    <span>EDIT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(ad)}
                    className="flex items-center justify-center gap-1 text-neutral-700 hover:text-neutral-950 transition py-1.5 px-1 sm:px-2.5 rounded-lg hover:bg-neutral-100 text-[11px] sm:text-xs font-bold"
                  >
                    <span>🗑</span>
                    <span>DELETE</span>
                  </button>
                </div>

                {/* Promote The Ad Action Button */}
                {!isPromoted && !ad.isFreeAd ? (
                  <Link
                    href={ad._id ? `/post-ad/your-ads/promoted?adId=${ad._id}&required=1` : "/post-ad/your-ads/promoted"}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-md w-full text-center bg-neutral-900 hover:bg-neutral-800 !text-white text-white border border-neutral-900"
                    style={{ color: "#ffffff" }}
                  >
                    <span>🚀</span>
                    <span className="!text-white text-white font-bold">
                      Promote Now to Make Visible on City Page
                    </span>
                  </Link>
                ) : !isPromoted ? (
                  <Link
                    href={ad._id ? `/post-ad/your-ads/promoted?adId=${ad._id}` : "/post-ad/your-ads/promoted"}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-xs w-full text-center bg-neutral-950 hover:bg-neutral-800 !text-white text-white shadow-md border border-transparent"
                    style={{ color: "#ffffff" }}
                  >
                    <span>⭐</span>
                    <span className="!text-white text-white font-bold">
                      Boost with VIP Promotion (Top Ranking)
                    </span>
                  </Link>
                ) : (
                  <Link
                    href={ad._id ? `/post-ad/your-ads/promoted?adId=${ad._id}` : "/post-ad/your-ads/promoted"}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-xs w-full text-center border border-neutral-200 bg-neutral-100 hover:bg-neutral-200 text-neutral-900"
                  >
                    <span>⭐</span>
                    <span className="text-neutral-900 font-bold">
                      Promoted Ad (Manage / Re-promote)
                    </span>
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
