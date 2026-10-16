import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import AdGallery from "@/components/ads/AdGallery";
import ContactActions from "@/components/ads/ContactActions";
import { SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  getPublicAdById,
  isAdVisiblePublicly,
  type Ad,
} from "@/lib/models/ad";
import { getCityBySlug } from "@/lib/models/city";
import { DEFAULT_SERVICE_RATES } from "@/components/post-ad/types";
import { AdDetailSkeleton } from "@/components/skeletons/places-skeletons";
import { isAdActiveInCurrentShift, getTierRankInfo } from "@/lib/promo-shifts";
import { siteConfig } from "@/lib/config/site";
import { JsonLd } from "@/components/seo/json-ld";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string; id: string }>;
}): Promise<Metadata> {
  const { location, id } = await params;

  const ad = await getPublicAdById(id);
  if (!ad) {
    return {
      title: "Not Found | RKB",
      robots: { index: false, follow: false },
    };
  }

  const isDeleted = (ad.status ?? "active") === "deleted";
  const isVisible = await isAdVisiblePublicly(ad as unknown as Ad);
  if (isDeleted || !isVisible) {
    return {
      title: "Listing Unavailable | RKB",
      robots: { index: false, follow: false },
    };
  }

  const title = `${ad.name} in ${ad.city} | RKB`;
  const description =
    ad.about?.trim()?.slice(0, 160) || `View ${ad.name} in ${ad.city} on RKB.`;
  const canonical = `${siteConfig.url}/places/${location}/${id}`;
  const images =
    ad.images && ad.images.length > 0
      ? [{ url: ad.images[0], alt: `${ad.name} in ${ad.city}` }]
      : [{ url: `${siteConfig.url}/rojlo.png`, alt: "RKB" }];

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      siteName: siteConfig.name,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((img) => img.url),
    },
  };
}

export default async function PlaceItemPage({
  params,
}: {
  params: Promise<{ location: string; id: string }>;
}) {
  const { location, id } = await params;

  const ad = await getPublicAdById(id);
  if (!ad) {
    notFound();
  }

  return (
    <Suspense fallback={<AdDetailSkeleton />}>
      <AdContent location={location} id={id} ad={ad} />
    </Suspense>
  );
}

/**
 * Ad Detail Content View
 */
async function AdContent({
  location,
  id,
  ad,
}: {
  location: string;
  id: string;
  ad: Ad;
}) {
  const cityInfo = await getCityBySlug(location);
  const cityName = cityInfo?.name ?? location;
  const isDeleted = (ad.status ?? "active") === "deleted";
  const isPubliclyVisible = await isAdVisiblePublicly(ad as unknown as Ad);
  const serviceRates =
    ad.serviceRates && ad.serviceRates.length > 0
      ? ad.serviceRates
      : DEFAULT_SERVICE_RATES;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteConfig.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Places",
        item: `${siteConfig.url}/places`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cityName,
        item: `${siteConfig.url}/places/${location}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: ad.name,
        item: `${siteConfig.url}/places/${location}/${id}`,
      },
    ],
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    name: ad.name,
    description: ad.about,
    url: `${siteConfig.url}/places/${location}/${id}`,
    image: ad.images?.[0] || undefined,
    mainEntity: {
      "@type": "Service",
      name: ad.name,
      description: ad.about,
      areaServed: {
        "@type": "City",
        name: cityName,
      },
      provider: {
        "@type": "Person",
        name: ad.name,
      },
    },
  };

  return (
    <main>
      <JsonLd data={[breadcrumbSchema, serviceSchema]} />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionPanel className="p-6 sm:p-8 lg:p-10">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Places", href: "/places" },
              { label: cityName, href: `/places/${location}` },
              { label: ad.name },
            ]}
          />

          {isDeleted && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              <span className="text-lg">⚠️</span>
              <p className="font-medium">This ad has been deleted. The information below is archived.</p>
            </div>
          )}

          {!isPubliclyVisible && !isDeleted && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <span className="text-lg shrink-0">⚠️</span>
              <div>
                <p className="font-bold text-amber-300">Listing Hidden from City Search Results</p>
                <p className="mt-0.5 text-xs text-amber-200/80">
                  This ad is currently not visible on the {cityName} city page because only 1 free ad is active per account. The owner must promote this ad to display it publicly.
                </p>
              </div>
            </div>
          )}

          {/* Ad Header */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Eyebrow>{ad.category}</Eyebrow>
                {isAdActiveInCurrentShift(ad) && (
                  <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider shadow-sm ${getTierRankInfo(ad.promoTier, ad.promoPackage).badgeClass}`}>
                    {getTierRankInfo(ad.promoTier, ad.promoPackage).badge}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                  📍 {cityName}
                </span>
              </div>
              <h1 className="mt-3 flex flex-wrap items-baseline gap-3 text-2xl font-black text-white sm:text-3xl lg:text-4xl">
                <span>{ad.name}</span>
                {ad.age && (
                  <span className="text-lg font-semibold text-amber-400/90 sm:text-xl">
                    ({ad.age} yrs)
                  </span>
                )}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Verified Listing
              </span>
            </div>
          </div>

          {/* Main Grid: Gallery & Contact Info */}
          <div className="mt-8 grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-2 sm:p-3">
                <AdGallery images={ad.images ?? []} name={ad.name} />
              </div>

              {ad.about && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/40 p-5 sm:p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">About {ad.name}</h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300 sm:text-base">
                    {ad.about}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6 lg:col-span-5">
              {/* Direct Connect Box */}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-white">Direct Connect</h2>
                    <p className="text-xs text-slate-400">Instant response via verified channels</p>
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 text-lg">
                    ⚡
                  </span>
                </div>

                <div className="mt-5">
                  <ContactActions
                    phone={ad.phone}
                    whatsapp={ad.whatsapp}
                    telegram={ad.telegram}
                  />
                </div>

                <div className="mt-6 space-y-4 border-t border-white/10 pt-5 text-sm">
                  {ad.toServe && ad.toServe.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Servicing</h4>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ad.toServe.map((s) => (
                          <span
                            key={s}
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {ad.placeOfService && ad.placeOfService.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Place of Service</h4>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ad.placeOfService.map((s) => (
                          <span
                            key={s}
                            className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-xs font-medium text-amber-300"
                          >
                            📍 {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Rates Card */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Service Rates</h3>
                    <p className="text-xs text-slate-400">Transparent pricing per session</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-400">INR (₹)</span>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="border-b border-white/10 bg-white/5 text-slate-300">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">Duration</th>
                        <th className="px-3.5 py-2.5 font-semibold text-center">Incall</th>
                        <th className="px-3.5 py-2.5 font-semibold text-right">Outcall</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {serviceRates.map((rate) => (
                        <tr key={rate.duration} className="transition hover:bg-white/[0.02]">
                          <td className="px-3.5 py-2.5 font-medium text-white">{rate.duration}</td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-amber-400">₹{rate.incall}</td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-amber-300">₹{rate.outcall}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </SectionPanel>
      </section>
    </main>
  );
}
