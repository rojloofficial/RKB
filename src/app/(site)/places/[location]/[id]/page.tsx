import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdGallery from "@/components/ads/AdGallery";
import ContactActions from "@/components/ads/ContactActions";
import { Card, SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  getPublicAdById,
  listAdsByCityAndLocalArea,
  isAdVisiblePublicly,
  type Ad,
} from "@/lib/models/ad";
import { getCityBySlug } from "@/lib/models/city";
import {
  getLocalAreaByCityAndSlug,
  listLocalAreas,
  type LocalAreaDetail,
} from "@/lib/models/localArea";
import { getEffectiveLocalAreaSeo } from "@/lib/models/local-area-seo";
import { DEFAULT_SERVICE_RATES } from "@/components/post-ad/types";
import {
  AdDetailSkeleton,
  CityPageSkeleton,
} from "@/components/skeletons/places-skeletons";
import { isAdActiveInCurrentShift, getTierRankInfo } from "@/lib/promo-shifts";
import { siteConfig } from "@/lib/config/site";
import { JsonLd } from "@/components/seo/json-ld";
import CityFaqSection from "@/components/places/city-faq-section";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string; id: string }>;
}): Promise<Metadata> {
  const { location, id } = await params;

  // 1. Check if id matches an Ad
  const ad = await getPublicAdById(id);
  if (ad) {
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

  // 2. Check if id matches a Local Area in this city
  const localArea = await getLocalAreaByCityAndSlug(location, id);
  if (localArea) {
    const seo = await getEffectiveLocalAreaSeo(
      location,
      id,
      localArea.name,
      localArea.cityName
    );

    const title =
      seo.title?.trim() ||
      `Best Places & Services in ${localArea.name}, ${localArea.cityName} | RKB`;
    const description =
      seo.description?.trim() ||
      localArea.description ||
      `Explore top verified services, local classifieds, and attractions in ${localArea.name}, ${localArea.cityName} on RKB.`;
    const canonical = `${siteConfig.url}/places/${location}/${id}`;
    const ogImage = `${siteConfig.url}/rojlo.png`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        siteName: siteConfig.name,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `${localArea.name}, ${localArea.cityName} - Services on RKB`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
    };
  }

  return {
    title: "Not Found | RKB",
    robots: { index: false, follow: false },
  };
}

export default async function PlaceItemPage({
  params,
}: {
  params: Promise<{ location: string; id: string }>;
}) {
  const { location, id } = await params;

  // Check if id is an Ad
  const ad = await getPublicAdById(id);
  if (ad) {
    return (
      <Suspense fallback={<AdDetailSkeleton />}>
        <AdContent location={location} id={id} ad={ad} />
      </Suspense>
    );
  }

  // Check if id is a Local Area
  const localArea = await getLocalAreaByCityAndSlug(location, id);
  if (localArea) {
    return (
      <Suspense fallback={<CityPageSkeleton />}>
        <LocalAreaContent
          citySlug={location}
          areaSlug={id}
          localArea={localArea}
        />
      </Suspense>
    );
  }

  notFound();
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

/**
 * Local Area City Page View - Identical layout & full feature set of City Pages
 */
async function LocalAreaContent({
  citySlug,
  areaSlug,
  localArea,
}: {
  citySlug: string;
  areaSlug: string;
  localArea: LocalAreaDetail;
}) {
  const [cityInfo, allCityAreas, ads, seo] = await Promise.all([
    getCityBySlug(citySlug),
    listLocalAreas({ citySlug, cityName: localArea.cityName }),
    listAdsByCityAndLocalArea(localArea.cityName, localArea.name),
    getEffectiveLocalAreaSeo(
      citySlug,
      areaSlug,
      localArea.name,
      localArea.cityName
    ),
  ]);

  const cityName = cityInfo?.name || localArea.cityName;

  // Sibling local areas within the same city
  const siblingAreas = allCityAreas
    .filter((a) => a.slug.toLowerCase() !== areaSlug.toLowerCase())
    .slice(0, 15);

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
        item: `${siteConfig.url}/places/${citySlug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: localArea.name,
        item: `${siteConfig.url}/places/${citySlug}/${areaSlug}`,
      },
    ],
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Services in ${localArea.name}, ${cityName}`,
    description: `Explore verified services and places in ${localArea.name}, ${cityName} on RKB.`,
    url: `${siteConfig.url}/places/${citySlug}/${areaSlug}`,
    about: {
      "@type": "Place",
      name: localArea.name,
      containedInPlace: {
        "@type": "City",
        name: cityName,
      },
    },
  };

  const localFaqs = [
    {
      id: "faq-1",
      question: `How do I find verified services in ${localArea.name}, ${cityName}?`,
      answer: `All profiles listed on this ${localArea.name} page feature verified contact details (Phone, WhatsApp, Telegram). You can review their rates, service photos, and reach out directly with full confidence.`,
    },
    {
      id: "faq-2",
      question: `Can I post a service advertisement specifically in ${localArea.name}?`,
      answer: `Yes! When posting an ad on RKB, choose ${cityName} as your city and select ${localArea.name} in the local area dropdown to have your ad featured directly on this neighborhood page.`,
    },
    {
      id: "faq-3",
      question: `Are services available across all sub-localities of ${localArea.name}?`,
      answer: `Most service providers in ${localArea.name} cater to both incall and outcall services covering the entire neighborhood and adjacent sectors with quick response times.`,
    },
  ];

  const popularKeywords = [
    `${localArea.name} services`,
    `${localArea.name} ${cityName}`,
    `Verified ads in ${localArea.name}`,
    `Call services in ${localArea.name}`,
    `Best services near ${localArea.name}`,
    `${localArea.name} classifieds`,
  ];

  const effectiveFaqs = seo?.faqs && seo.faqs.length > 0 ? seo.faqs : localFaqs;
  const effectiveKeywords =
    seo?.popularSearches && seo.popularSearches.length > 0
      ? seo.popularSearches
      : popularKeywords;
  const effectiveDescription = seo?.description || localArea.description;

  return (
    <main>
      <JsonLd data={[breadcrumbSchema, collectionSchema]} />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionPanel className="p-6 sm:p-8 lg:p-10">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Places", href: "/places" },
              { label: cityName, href: `/places/${citySlug}` },
              { label: localArea.name },
            ]}
          />
          <div className="mt-4">
            <Eyebrow>Local Area Guide</Eyebrow>
          </div>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl lg:text-5xl">
            {localArea.name}, <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">{cityName}</span>
          </h1>

          {effectiveDescription && (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {effectiveDescription}
            </p>
          )}

          {/* Sibling Local Areas Pills */}
          {siblingAreas.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Nearby Areas in {cityName}:
              </span>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 shadow-sm">
                  {localArea.name} (Current)
                </span>
                {siblingAreas.map((area) => (
                  <Link
                    key={area._id ?? area.slug}
                    href={`/places/${citySlug}/${area.slug}`}
                    className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-amber-500/30 hover:bg-slate-800 hover:text-white"
                  >
                    {area.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Ads Grid */}
          {ads.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-slate-900/40 p-8 text-center sm:p-12">
              <span className="text-4xl">🏙️</span>
              <p className="mt-3 text-lg font-bold text-white">
                No services posted in {localArea.name} yet.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Be the first to post an ad in this locality or explore all services in {cityName}.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/post-ad"
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:opacity-95"
                >
                  Post an Ad Now
                </Link>
                <Link
                  href={`/places/${citySlug}`}
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  View All {cityName} Ads
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ads.map((ad, idx) => (
                <Card
                  key={ad._id}
                  className="group relative flex flex-col justify-between overflow-hidden border border-white/10 bg-slate-900/70 p-5 transition duration-300 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/5 sm:p-6"
                >
                  {ad._id && (
                    <Link
                      href={`/places/${citySlug}/${ad._id}`}
                      aria-label={`View details for ${ad.name}`}
                      className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  )}

                  <div className="pointer-events-none relative z-10">
                    <div className="flex items-start justify-between gap-2">
                      {isAdActiveInCurrentShift(ad) ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs ${
                            getTierRankInfo(ad.promoTier, ad.promoPackage).badgeClass
                          }`}
                        >
                          {getTierRankInfo(ad.promoTier, ad.promoPackage).badge}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Verified
                        </span>
                      )}

                      <span className="inline-flex max-w-[12rem] items-center truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                        📍 {localArea.name}
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-black text-white group-hover:text-amber-400 transition-colors">
                      {ad.name}
                    </h2>

                    {ad.about && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-400 line-clamp-2">
                        {ad.about}
                      </p>
                    )}

                    {ad.images[0] && (
                      <div className="relative mt-4 h-48 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950 sm:h-52">
                        <Image
                          src={ad.images[0]}
                          alt={`${ad.name} - Services in ${localArea.name}, ${cityName}`}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, 360px"
                          priority={idx === 0}
                        />
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 mt-5 border-t border-white/10 pt-4">
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
        </SectionPanel>
      </section>

      {/* Neighborhood Guide & Highlights */}
      {localArea.highlights && localArea.highlights.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <SectionPanel className="p-6 sm:p-8">
            <Eyebrow>Neighborhood Guide</Eyebrow>
            <h2 className="mt-3 text-xl font-black text-white sm:text-2xl">
              Popular Landmarks & Hubs in {localArea.name}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Key commercial areas, transport nodes, and popular hotspots in {localArea.name}:
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {localArea.highlights.map((h, i) => (
                <span
                  key={i}
                  className="rounded-full border border-white/10 bg-slate-900/60 px-3.5 py-1.5 text-xs font-medium text-slate-300"
                >
                  📍 {h}
                </span>
              ))}
            </div>
          </SectionPanel>
        </section>
      )}

      {/* Local Area Guide / SEO Content Blocks */}
      {seo?.content && seo.content.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <SectionPanel className="p-6 sm:p-8">
            <Eyebrow>Local Guide</Eyebrow>
            {seo.content.map((block) => {
              if (block.type === "h1" || block.type === "h2" || block.type === "h3")
                return (
                  <h2
                    key={block.id}
                    className="mt-6 text-xl font-bold text-white sm:text-2xl"
                  >
                    {block.text}
                  </h2>
                );
              return (
                <p
                  key={block.id}
                  className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base"
                >
                  {block.text}
                </p>
              );
            })}
          </SectionPanel>
        </section>
      )}

      {/* Neighborhood FAQs */}
      <CityFaqSection faqs={effectiveFaqs} cityName={`${localArea.name}, ${cityName}`} />

      {/* Popular Searches */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionPanel className="p-6 text-center sm:p-8">
          <Eyebrow className="mx-auto">Popular Searches</Eyebrow>
          <h2 className="mt-3 text-xl font-black text-white sm:text-2xl">
            Trending Searches in {localArea.name}
          </h2>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {effectiveKeywords.map((keyword, index) => (
              <span
                key={`${keyword}-${index}`}
                className="rounded-full border border-white/10 bg-slate-900/60 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-amber-500/30 hover:text-amber-300"
              >
                {keyword}
              </span>
            ))}
          </div>
        </SectionPanel>
      </section>

      {/* City Directory Link */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionPanel className="p-8 text-center sm:p-10">
          <Eyebrow className="mx-auto">Explore More</Eyebrow>
          <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            Want to see all services across {cityName}?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            Browse through all districts and neighborhoods of {cityName} on the main city portal.
          </p>
          <div className="mt-6">
            <Link
              href={`/places/${citySlug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:opacity-95"
            >
              Explore Full {cityName} City Page →
            </Link>
          </div>
        </SectionPanel>
      </section>
    </main>
  );
}
