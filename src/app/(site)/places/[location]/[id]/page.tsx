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
  listRelatedCityAds,
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
  const relatedProfiles = await listRelatedCityAds(cityName, ad._id ?? id, 6);

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
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <SectionPanel>
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Places", href: "/places" },
              { label: cityName, href: `/places/${location}` },
              { label: ad.name },
            ]}
          />

          {isDeleted && (
            <p className="mt-4 rounded-[1rem] bg-neutral-100 p-4 text-neutral-900 border border-neutral-300">
              This ad has been deleted. The information below is archived.
            </p>
          )}

          {!isPubliclyVisible && !isDeleted && (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm text-amber-950 font-medium flex items-start gap-2.5">
              <span className="text-base shrink-0">⚠️</span>
              <div>
                <p className="font-bold">Listing Hidden from City Search Results</p>
                <p className="text-amber-900 text-xs mt-0.5">
                  This ad is currently not visible on the {cityName} city page because only 1 free ad is active per account. The owner must promote this ad to display it publicly.
                </p>
              </div>
            </div>
          )}

          <div className="mt-4">
            <Eyebrow>{ad.category}</Eyebrow>
          </div>
          <h1 className="mt-3 flex flex-wrap items-baseline gap-2 sm:gap-3 text-2xl sm:text-3xl md:text-4xl font-black text-neutral-900 break-words">
            <span>{ad.name}</span>
            {ad.age && (
              <span className="text-xl sm:text-2xl font-semibold text-neutral-500">
                Age: {ad.age}
              </span>
            )}
          </h1>

          {ad.about && (
            <p className="mt-4 whitespace-pre-line leading-7 text-neutral-600">
              {ad.about}
            </p>
          )}

          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div className="order-1 relative">
              <span className="absolute right-3 top-3 z-10 rounded-full bg-neutral-900/85 px-3 py-1 text-xs font-semibold text-white">
                {cityName}
              </span>
              <AdGallery images={ad.images ?? []} name={ad.name} />
            </div>

            <div className="order-2">
              <h2 className="text-xl font-bold text-neutral-900">Contact me</h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <ContactActions
                  phone={ad.phone}
                  whatsapp={ad.whatsapp}
                  telegram={ad.telegram}
                />
              </div>

              {ad.toServe && ad.toServe.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-bold text-neutral-900">
                    To Serve
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ad.toServe.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-1 text-sm font-semibold text-neutral-800"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ad.placeOfService && ad.placeOfService.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-bold text-neutral-900">
                    Place Of Service
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ad.placeOfService.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-1 text-sm font-semibold text-neutral-800"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-bold text-neutral-900">Service Rates</h3>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-neutral-200">
              <table className="w-full min-w-[340px] text-left text-sm">
                <thead className="bg-neutral-100 text-neutral-900">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Duration</th>
                    <th className="px-4 py-3 font-semibold">Incall Rate</th>
                    <th className="px-4 py-3 font-semibold">Outcall Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRates.map((rate) => (
                    <tr key={rate.duration} className="border-t border-neutral-200">
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {rate.duration}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">₹{rate.incall}</td>
                      <td className="px-4 py-3 text-neutral-700">₹{rate.outcall}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-bold text-neutral-900">
              Related Profiles in {cityName}
            </h3>

            {relatedProfiles.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-neutral-600">
                No other profiles are available in {cityName} right now.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {relatedProfiles.slice(0, 6).map((profile) => (
                  <Card
                    key={profile._id}
                    className="group relative overflow-hidden p-0 shadow-xs transition-all hover:border-neutral-400 hover:shadow-sm"
                  >
                    <Link
                      href={`/places/${location}/${profile._id}`}
                      aria-label={`View details for ${profile.name}`}
                      className="absolute inset-0 z-10 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
                    />

                    <div className="relative h-56 bg-neutral-100">
                      {profile.images?.[0] ? (
                        <Image
                          src={profile.images[0]}
                          alt={`${profile.name} profile image`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 360px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm font-medium text-neutral-400">
                          No image available
                        </div>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-neutral-900/80 px-3 py-1 text-xs font-semibold text-white">
                        {cityName}
                      </span>
                    </div>

                    <div className="relative z-0 p-5">
                      <h4 className="text-lg font-black text-neutral-900">
                        {profile.name}
                      </h4>
                      {profile.age && (
                        <p className="mt-1 text-sm font-semibold text-neutral-500">
                          Age: {profile.age}
                        </p>
                      )}
                      {profile.about && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-600">
                          {profile.about}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
      <section className="px-4 py-10 sm:px-6">
        <SectionPanel>
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Places", href: "/places" },
              { label: cityName, href: `/places/${citySlug}` },
              { label: localArea.name },
            ]}
          />
          <div className="mt-4">
            <Eyebrow>Places</Eyebrow>
          </div>
          <h1 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
            {localArea.name}, {cityName}
          </h1>

          {effectiveDescription && (
            <p className="mt-3 text-sm sm:text-base text-neutral-600 leading-relaxed max-w-3xl">
              {effectiveDescription}
            </p>
          )}

          {/* Sibling Local Areas Pills */}
          {siblingAreas.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-neutral-900">
                Nearby Areas:
              </span>
              <span className="rounded-xl border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white shadow-2xs">
                {localArea.name} (Current)
              </span>
              {siblingAreas.map((area) => (
                <Link
                  key={area._id ?? area.slug}
                  href={`/places/${citySlug}/${area.slug}`}
                  className="rounded-xl border border-neutral-200 bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-800 transition hover:bg-neutral-950 hover:text-white hover:border-neutral-950 cursor-pointer shadow-2xs"
                >
                  {area.name}
                </Link>
              ))}
            </div>
          )}

          {/* Ads Grid */}
          {ads.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
              <p className="text-lg font-bold text-neutral-900">
                No services posted in {localArea.name} yet.
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                Be the first to post an ad in this locality or explore all services in {cityName}.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <Link
                  href="/post-ad"
                  className="rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 transition"
                >
                  Post an Ad Now
                </Link>
                <Link
                  href={`/places/${citySlug}`}
                  className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 hover:bg-neutral-100 transition"
                >
                  View All {cityName} Ads
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ads.map((ad, idx) => (
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
                      className={`pointer-events-none absolute left-3.5 top-3.5 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black sm:left-6 sm:top-6 shadow-xs ${
                        getTierRankInfo(ad.promoTier, ad.promoPackage).badgeClass
                      }`}
                    >
                      {getTierRankInfo(ad.promoTier, ad.promoPackage).badge}
                    </span>
                  )}

                  <span className="pointer-events-none absolute right-3.5 top-3.5 z-10 inline-flex max-w-[12rem] sm:max-w-xs items-center truncate rounded-full bg-neutral-100 border border-neutral-200 px-2.5 sm:px-3 py-1 text-xs font-semibold text-neutral-700 sm:right-6 sm:top-6">
                    {localArea.name}, {cityName}
                  </span>

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
                          alt={`${ad.name} - Services in ${localArea.name}, ${cityName}`}
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
        </SectionPanel>
      </section>

      {/* Neighborhood Guide & Highlights */}
      {localArea.highlights && localArea.highlights.length > 0 && (
        <section className="px-4 py-8 sm:px-6">
          <SectionPanel>
            <Eyebrow>Neighborhood Guide</Eyebrow>
            <h2 className="mt-3 text-2xl font-black text-neutral-900 sm:text-3xl">
              Popular Landmarks & Hubs in {localArea.name}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Key commercial areas, transport nodes, and popular hotspots in {localArea.name}:
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {localArea.highlights.map((h, i) => (
                <span
                  key={i}
                  className="rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-neutral-800"
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
        <section className="px-4 py-8 sm:px-6">
          <SectionPanel>
            <Eyebrow>Local Guide</Eyebrow>
            {seo.content.map((block) => {
              if (block.type === "h1")
                return (
                  <h2
                    key={block.id}
                    className="mt-6 text-2xl sm:text-3xl font-black text-neutral-900"
                  >
                    {block.text}
                  </h2>
                );
              if (block.type === "h2")
                return (
                  <h2
                    key={block.id}
                    className="mt-5 text-xl sm:text-2xl font-bold text-neutral-900"
                  >
                    {block.text}
                  </h2>
                );
              if (block.type === "h3")
                return (
                  <h3
                    key={block.id}
                    className="mt-4 text-lg sm:text-xl font-semibold text-neutral-900"
                  >
                    {block.text}
                  </h3>
                );
              return (
                <p
                  key={block.id}
                  className="mt-3 leading-7 text-neutral-600"
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
      <section className="px-4 py-8 sm:px-6">
        <SectionPanel>
          <Eyebrow className="text-center">Popular Searches</Eyebrow>
          <h2 className="mt-3 text-center text-2xl font-black text-neutral-900 sm:text-3xl">
            Trending Searches in {localArea.name}
          </h2>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {effectiveKeywords.map((keyword, index) => (
              <span
                key={`${keyword}-${index}`}
                className="rounded-full border border-neutral-200 bg-neutral-100 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-neutral-800 transition hover:bg-neutral-200 hover:border-neutral-300"
              >
                {keyword}
              </span>
            ))}
          </div>
        </SectionPanel>
      </section>

      {/* City Directory Link */}
      <section className="px-4 py-8 sm:px-6">
        <SectionPanel className="text-center py-8">
          <Eyebrow>Explore More</Eyebrow>
          <h2 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
            Want to see all services across {cityName}?
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Browse through all districts and neighborhoods of {cityName} on the main city portal.
          </p>
          <div className="mt-5">
            <Link
              href={`/places/${citySlug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-6 py-3 text-sm font-bold text-white hover:bg-neutral-800 transition shadow-xs"
            >
              Explore Full {cityName} City Page →
            </Link>
          </div>
        </SectionPanel>
      </section>
    </main>
  );
}
