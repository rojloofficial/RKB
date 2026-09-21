import type { Metadata } from "next";
import Image from "next/image";
import Button from "@/components/ui/button";
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
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbSchema} />
      <SectionPanel>
        <Eyebrow>Services</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
          Our Services
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
          Explore the three main service categories on RKB. Each section below
          shows what the service is about, with the image and text arranged to
          keep the page easy to scan.
        </p>

        <div className="mt-10 space-y-8">
          {serviceCards.map((item, index) => {
            const reverseLayout = index === 1;

            return (
              <Card
                key={item.title}
                className="overflow-hidden p-0 shadow-sm"
              >
                <div
                  className={`grid items-center gap-0 lg:grid-cols-2 ${
                    reverseLayout ? "lg:[direction:rtl]" : ""
                  }`}
                >
                  <div
                    className={`order-2 p-6 sm:p-8 lg:p-10 ${
                      reverseLayout ? "lg:order-2 lg:[direction:ltr]" : "lg:order-1"
                    }`}
                  >
                    <Eyebrow className="tracking-[0.25em]">{item.title}</Eyebrow>
                    <h2 className="mt-3 text-2xl font-black text-neutral-900 sm:text-3xl">
                      {item.title}
                    </h2>
                    <p className="mt-4 text-base leading-7 text-neutral-600">
                      {item.description}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-neutral-500">
                      {index === 0 &&
                        "Call girls offer companionship and personalized meetups in your city."}
                      {index === 1 &&
                        "Male escort services are available for companionship and private meetups."}
                      {index === 2 &&
                        "Massage services are designed for relaxation, stress relief, and overall wellness through professional body care."}
                    </p>

                    <div className="mt-6">
                      <Button href="/post-ad/new" variant="soft">
                        Post a Service
                      </Button>
                    </div>
                  </div>

                  <div
                    className={`relative order-1 min-h-[20rem] lg:min-h-[28rem] ${
                      reverseLayout ? "lg:order-1" : "lg:order-2"
                    }`}
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
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
