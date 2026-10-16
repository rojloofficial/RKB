import type { Metadata } from "next";
import { SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { listAllCities } from "@/lib/models/city";
import { getAdCountsByCity } from "@/lib/models/ad";
import PlacesExplorer from "@/components/places/places-explorer";
import { siteConfig } from "@/lib/config/site";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Explore Places & Cities | RKB",
  description:
    "Explore places and find trusted local services, classifieds, and verified ads across cities and states in India.",
  alternates: {
    canonical: `${siteConfig.url}/places`,
  },
  openGraph: {
    title: "Explore Places & Cities | RKB",
    description:
      "Explore places and find trusted local services, classifieds, and verified ads across cities and states in India.",
    url: `${siteConfig.url}/places`,
    type: "website",
    images: [
      {
        url: `${siteConfig.url}/rojlo.png`,
        width: 1200,
        height: 630,
        alt: "Explore Places on RKB",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Places & Cities | RKB",
    description:
      "Explore places and find trusted local services, classifieds, and verified ads across cities and states in India.",
    images: [`${siteConfig.url}/rojlo.png`],
  },
};

export default async function Places({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const sp = (await searchParams) ?? {};
  const q = sp.q;
  const query = Array.isArray(q) ? q[0] : q;
  const initialQuery = query?.trim() ?? "";

  const [allCities, adCounts] = await Promise.all([
    listAllCities(),
    getAdCountsByCity(),
  ]);

  const citiesWithAds = allCities.map((city) => ({
    name: city.name,
    slug: city.slug,
    state: city.state ?? "",
    adCount:
      adCounts[city.name.toLowerCase()] ??
      adCounts[city.slug.toLowerCase()] ??
      0,
  }));

  const schema = [
    {
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
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Explore Places & Cities",
      description:
        "Explore places and find trusted local services, classifieds, and verified ads across cities and states in India.",
      url: `${siteConfig.url}/places`,
    },
  ];

  return (
    <div className="w-full min-w-0 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <JsonLd data={schema} />
      <SectionPanel>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Places" },
          ]}
        />
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 pb-6">
          <div>
            <Eyebrow>Places</Eyebrow>
            <h1 className="mt-1 text-3xl font-black text-neutral-900 sm:text-4xl">
              Places Directory
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Browse and discover all cities across India with verified services.
            </p>
          </div>

          {/* Right corner total locations count */}
          <div className="shrink-0 self-start sm:self-auto">
            <div className="rounded-2xl border border-neutral-300 bg-neutral-100/90 px-4 sm:px-5 py-2.5 text-left sm:text-right shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                Total Cities
              </span>
              <div className="flex items-baseline gap-1.5 sm:justify-end">
                <span className="text-2xl sm:text-3xl font-black text-neutral-950">
                  {citiesWithAds.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <PlacesExplorer
          initialCities={citiesWithAds}
          initialQuery={initialQuery}
        />
      </SectionPanel>
    </div>
  );
}
