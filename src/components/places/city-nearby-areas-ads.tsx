"use client";

import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import ContactActions from "@/components/ads/ContactActions";
import { isAdActiveInCurrentShift, getTierRankInfo } from "@/lib/promo-shifts";
import type { PublicAd } from "@/lib/models/ad";

interface CityNearbyAreasAdsProps {
  ads: PublicAd[];
  cityName: string;
  citySlug: string;
}

export default function CityNearbyAreasAds({
  ads,
  cityName,
  citySlug,
}: CityNearbyAreasAdsProps) {
  return (
    <div className="mt-6">
      {/* Ads Grid Display */}
      {ads.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
          <p className="text-base font-bold text-slate-900">
            No services posted in {cityName} yet.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Be the first provider to publish a verified listing in {cityName}.
          </p>
          <Link
            href="/post-ad/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-600/20"
          >
            + Post First Ad in {cityName}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad, idx) => (
            <Card
              key={ad._id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-amber-300 hover:shadow-lg card-hover-lift"
            >
              {ad._id && (
                <Link
                  href={`/places/${citySlug}/${ad._id}`}
                  aria-label={`View details for ${ad.name}`}
                  className="absolute inset-0 z-0 rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                />
              )}

              {/* Badges Overlays */}
              <div className="pointer-events-none relative z-10">
                <div className="flex items-center justify-between gap-2 mb-3">
                  {/* VIP Shift Rank Badge */}
                  {isAdActiveInCurrentShift(ad) ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-xs ${
                        getTierRankInfo(ad.promoTier, ad.promoPackage).badgeClass
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                      {getTierRankInfo(ad.promoTier, ad.promoPackage).badge}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                      Verified Listing
                    </span>
                  )}

                  {/* City Pill */}
                  {ad.city && (
                    <span className="inline-flex max-w-[11rem] items-center truncate rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      📍 {ad.city}
                    </span>
                  )}
                </div>

                {/* Main Profile Info */}
                <h2 className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors break-words">
                  {ad.name}
                </h2>

                {ad.about && (
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600 line-clamp-2">
                    {ad.about}
                  </p>
                )}

                {/* Primary Image Preview */}
                {ad.images[0] && (
                  <div className="relative mt-4 h-56 sm:h-64 overflow-hidden rounded-2xl bg-slate-100">
                    <Image
                      src={ad.images[0]}
                      alt={`${ad.name} - Services in ${cityName}`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 360px"
                      priority={idx === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="relative z-10 mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <ContactActions
                  phone={ad.phone}
                  whatsapp={ad.whatsapp}
                  telegram={ad.telegram}
                />
                <span className="text-xs font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Details →
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
