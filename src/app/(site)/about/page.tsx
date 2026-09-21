import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Card, SectionPanel } from "@/components/ui/card";
import { policySections, siteInfo } from "@/lib/site";
import { siteConfig } from "@/lib/config/site";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "About RKB | Policies, Contact and Address",
  description:
    "Read about RKB, our platform policies, contact email, phone number, and office address.",
  alternates: {
    canonical: `${siteConfig.url}/about`,
  },
  openGraph: {
    title: "About RKB | Policies, Contact and Address",
    description:
      "Read about RKB, our platform policies, contact email, phone number, and office address.",
    url: `${siteConfig.url}/about`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About RKB | Policies, Contact and Address",
    description:
      "Read about RKB, our platform policies, contact email, phone number, and office address.",
  },
};

export default function About() {
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
        name: "About",
        item: `${siteConfig.url}/about`,
      },
    ],
  };

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbSchema} />
      <SectionPanel>
        <Eyebrow>About</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
          About RKB
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
          RKB is a local marketplace for services, places, and ads. We help
          users discover trusted service providers, explore city pages, and post
          their own listings in one simple place.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <Card>
            <Eyebrow className="tracking-[0.25em]">Email</Eyebrow>
            <a
              href={`mailto:${siteInfo.email}`}
              className="mt-3 block text-lg sm:text-xl font-black !text-neutral-900 hover:text-neutral-600 transition break-all"
            >
              {siteInfo.email}
            </a>
          </Card>

          <Card>
            <Eyebrow className="tracking-[0.25em]">Contact</Eyebrow>
            <a
              href={`tel:${siteInfo.phone.replace(/\s/g, "")}`}
              className="mt-3 block text-xl font-black !text-neutral-900 hover:text-neutral-600 transition"
            >
              {siteInfo.phone}
            </a>
          </Card>

          <Card>
            <Eyebrow className="tracking-[0.25em]">Address</Eyebrow>
            <p className="mt-3 text-base leading-7 text-neutral-600">
              {siteInfo.address}
            </p>
          </Card>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-black text-neutral-900">Policies</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-neutral-600">
            These policies explain how the platform works, how user content is
            handled, and what to expect when using RKB.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {policySections.map((section) => (
              <Card key={section.title}>
                <h3 className="text-xl font-black text-neutral-900">
                  {section.title}
                </h3>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-neutral-600">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-neutral-800" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      </SectionPanel>
    </main>
  );
}
