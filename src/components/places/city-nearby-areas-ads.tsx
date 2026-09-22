"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import ContactActions from "@/components/ads/ContactActions";
import { isAdActiveInCurrentShift, getTierRankInfo } from "@/lib/promo-shifts";
import type { PublicAd } from "@/lib/models/ad";
import type { LocalAreaRecord } from "@/lib/models/localArea";

interface CityNearbyAreasAdsProps {
  ads: PublicAd[];
  localAreas: LocalAreaRecord[];
  cityName: string;
  citySlug: string;
}

export default function CityNearbyAreasAds({
  ads,
  localAreas,
  cityName,
  citySlug,
}: CityNearbyAreasAdsProps) {
  const [selectedAreaSlug, setSelectedAreaSlug] = useState<string | null>(null);

  // Sync with initial URL search params if present (e.g. ?area=connaught-place)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const initialArea = params.get("area");
      if (initialArea && localAreas.some((a) => a.slug.toLowerCase() === initialArea.toLowerCase())) {
        setSelectedAreaSlug(initialArea.toLowerCase());
      }
    }
  }, [localAreas]);

  function handleSelectArea(slug: string | null) {
    setSelectedAreaSlug(slug);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (slug) {
        url.searchParams.set("area", slug);
      } else {
        url.searchParams.delete("area");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }

  const selectedArea = useMemo(() => {
    if (!selectedAreaSlug) return null;
    return (
      localAreas.find(
        (a) => a.slug.toLowerCase() === selectedAreaSlug.toLowerCase()
      ) ?? null
    );
  }, [localAreas, selectedAreaSlug]);

  const filteredAds = useMemo(() => {
    if (!selectedArea) return ads;

    const normArea = selectedArea.name.trim().toLowerCase();
    const areaSlug = selectedArea.slug.trim().toLowerCase();

    return ads.filter((ad) => {
      // 1. Direct localArea field match (by name or by slug)
      const adArea = (ad.localArea ?? "").trim().toLowerCase();
      const adAreaSlug = adArea.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (adArea && (adArea === normArea || adAreaSlug === areaSlug)) {
        return true;
      }

      // 2. Mention in about text or name
      const aboutText = (ad.about ?? "").toLowerCase();
      const nameText = (ad.name ?? "").toLowerCase();
      return aboutText.includes(normArea) || nameText.includes(normArea);
    });
  }, [ads, selectedArea]);

  return (
    <div className="mt-4">
      {/* Nearby Areas Filter Pills */}
      {localAreas.length > 0 && (
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block mb-2">
            Nearby Areas:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {/* "All" button */}
            <button
              type="button"
              onClick={() => handleSelectArea(null)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-2xs ${
                selectedAreaSlug === null
                  ? "border border-neutral-950 bg-neutral-950 !text-white text-white"
                  : "border border-neutral-200 bg-neutral-100 text-black hover:bg-neutral-950 hover:text-white hover:border-neutral-950"
              }`}
            >
              All ({ads.length})
            </button>

            {/* Individual Local Area buttons */}
            {localAreas.map((area) => {
              const isSelected =
                selectedAreaSlug?.toLowerCase() === area.slug.toLowerCase();
              return (
                <button
                  key={area._id ?? area.slug}
                  type="button"
                  onClick={() => handleSelectArea(isSelected ? null : area.slug)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-2xs ${
                    isSelected
                      ? "border border-neutral-950 bg-neutral-950 !text-white text-white"
                      : "border border-neutral-200 bg-neutral-100 text-black hover:bg-neutral-950 hover:text-white hover:border-neutral-950"
                  }`}
                >
                  {area.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ads Display */}
      {filteredAds.length === 0 ? (
        selectedArea ? (
          <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
            <p className="text-base sm:text-lg font-bold text-neutral-900">
              No services posted in {selectedArea.name} yet.
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Be the first to post an ad in this locality or view all services in {cityName}.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleSelectArea(null)}
                className="rounded-full bg-neutral-950 px-5 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition"
              >
                Show All {cityName} Ads ({ads.length}) &rarr;
              </button>
              <Link
                href="/post-ad"
                className="rounded-full border border-neutral-300 bg-white px-5 py-2 text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition"
              >
                Post an Ad Now
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-neutral-600">
            No services posted in {cityName} yet. Be the first to post an ad!
          </p>
        )
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAds.map((ad, idx) => (
            <Card
              key={ad._id}
              className="group relative min-h-[28rem] sm:min-h-[30rem] p-5 sm:p-7 transition-shadow hover:shadow-md"
            >
              {ad._id && (
                <Link
                  href={`/places/${citySlug}/${ad._id}`}
                  aria-label={`View details for ${ad.name}`}
                  className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
                />
              )}

              {isAdActiveInCurrentShift(ad) && (
                <span
                  className={`pointer-events-none absolute left-3.5 top-3.5 z-10 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:left-6 sm:top-6 shadow-xs ${
                    getTierRankInfo(ad.promoTier, ad.promoPackage).badgeClass
                  }`}
                >
                  {getTierRankInfo(ad.promoTier, ad.promoPackage).badge}
                </span>
              )}

              {ad.city && (
                <span className="pointer-events-none absolute right-3.5 top-3.5 z-10 inline-flex max-w-[12rem] sm:max-w-xs items-center truncate rounded-full bg-neutral-100 border border-neutral-200 px-2.5 sm:px-3 py-1 text-xs font-semibold text-neutral-700 sm:right-6 sm:top-6">
                  {ad.localArea ? `${ad.localArea}, ${ad.city}` : ad.city}
                </span>
              )}

              <div className="pointer-events-none relative z-10">
                <h3 className="pr-20 sm:pr-24 text-lg sm:text-xl font-black text-neutral-900 break-words">
                  {ad.name}
                </h3>

                {ad.about && (
                  <p className="mt-2 text-sm leading-6 sm:leading-7 text-neutral-600 line-clamp-3">
                    {ad.about}
                  </p>
                )}

                {ad.images[0] && (
                  <div className="relative mt-4 h-56 overflow-hidden rounded-xl bg-neutral-100 sm:h-64">
                    <Image
                      src={ad.images[0]}
                      alt={`${ad.name} - Services in ${cityName}`}
                      fill
                      className="object-contain transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 360px"
                      priority={idx === 0}
                    />
                  </div>
                )}
              </div>

              <div className="relative z-10 mt-4 flex flex-wrap gap-2">
                <ContactActions
                  phone={ad.phone}
                  whatsapp={ad.whatsapp}
                  telegram={ad.telegram}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
