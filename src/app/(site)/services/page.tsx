import type { Metadata } from "next";
import Image from "next/image";
import Button from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { serviceCards } from "@/lib/services";
import { siteConfig } from "@/lib/config/site";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Our Services | RKB",
  description:
    "Explore local services, adult entertainment, companionship, and wellness services available across Indian cities on RKB.",
  alternates: {
    canonical: `${siteConfig.url}/services`,
  },
  openGraph: {
    title: "Our Services | RKB",
    description:
      "Explore local services, adult entertainment, companionship, and wellness services available across Indian cities on RKB.",
    url: `${siteConfig.url}/services`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Services | RKB",
    description:
      "Explore local services, adult entertainment, companionship, and wellness services available across Indian cities on RKB.",
  },
};

export default function Services() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Services" },
  ];

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
        name: "Services",
        item: `${siteConfig.url}/services`,
      },
    ],
  };

  return (
    <main className="px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbSchema} />
      <SectionPanel>
        <Breadcrumbs items={breadcrumbItems} />

        <div className="max-w-3xl">
          <Eyebrow>Classified Categories</Eyebrow>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl lg:text-5xl">
            Our Services & Categories
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600">
            Explore the main service categories available across India on RKB. Find verified local companions, wellness professionals, and relaxation experts in your city.
          </p>
        </div>

        <div className="mt-12 space-y-10">
          {serviceCards.map((item, index) => {
            const isReversed = index % 2 === 1;

            return (
              <Card
                key={item.title}
                className="overflow-hidden p-0 border border-slate-200/90 shadow-sm card-hover-lift"
              >
                <div className={`grid items-stretch lg:grid-cols-12`}>
                  {/* Text Information Column */}
                  <div
                    className={`p-6 sm:p-10 lg:col-span-7 flex flex-col justify-between ${
                      isReversed ? "lg:order-2" : "lg:order-1"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
                          Category 0{index + 1}
                        </span>
                        <span className="text-xs text-slate-400">• Verified Listings</span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                        {item.title}
                      </h2>

                      <p className="mt-4 text-base leading-relaxed text-slate-700">
                        {item.description}
                      </p>

                      <p className="mt-3 text-sm leading-relaxed text-slate-500">
                        {index === 0 &&
                          "Call girls offer companionship and personalized meetups in your city with transparent incall and outcall arrangements."}
                        {index === 1 &&
                          "Male escort services are available for companionship, events, and private meetups tailored to your preferences."}
                        {index === 2 &&
                          "Massage services are designed for relaxation, stress relief, and overall wellness through professional body care."}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">✓ Phone Call</span>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">✓ WhatsApp Chat</span>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">✓ Telegram</span>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">✓ City-wide Coverage</span>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3">
                      <Button href="/post-ad/new" variant="gradient">
                        Post a {item.title} Ad
                      </Button>
                      <Button href="/places" variant="outline">
                        Browse Listings in Cities
                      </Button>
                    </div>
                  </div>

                  {/* Image Column */}
                  <div
                    className={`relative min-h-[22rem] lg:min-h-[auto] lg:col-span-5 bg-slate-100 overflow-hidden ${
                      isReversed ? "lg:order-1" : "lg:order-2"
                    }`}
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 40vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent lg:hidden" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </SectionPanel>
    </main>
  );
}
