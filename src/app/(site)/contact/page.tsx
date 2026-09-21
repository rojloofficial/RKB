import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Card, SectionPanel } from "@/components/ui/card";
import { siteInfo } from "@/lib/site";
import { siteConfig } from "@/lib/config/site";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Contact Us | RKB",
  description: "Get in touch with the RKB support team by email, phone, or mail.",
  alternates: {
    canonical: `${siteConfig.url}/contact`,
  },
  openGraph: {
    title: "Contact Us | RKB",
    description: "Get in touch with the RKB support team by email, phone, or mail.",
    url: `${siteConfig.url}/contact`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us | RKB",
    description: "Get in touch with the RKB support team by email, phone, or mail.",
  },
};

export default function Contact() {
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
        name: "Contact Us",
        item: `${siteConfig.url}/contact`,
      },
    ],
  };

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbSchema} />
      <SectionPanel>
        <Eyebrow>Contact</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
          Contact Us
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
          Have a question or need help? Reach out to our team using the details
          below.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 max-w-3xl">
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
        </div>
      </SectionPanel>
    </main>
  );
}
