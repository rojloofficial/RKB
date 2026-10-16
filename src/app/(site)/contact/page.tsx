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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbSchema} />
      <SectionPanel className="p-6 sm:p-8 lg:p-10">
        <Eyebrow>Get In Touch</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl lg:text-5xl">
          Contact <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Support</span>
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Have an inquiry, need assistance with your advertisement or coin recharge, or want to report a listing?
          Reach out directly to our dedicated support team.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 max-w-3xl">
          <Card className="flex flex-col justify-between border-white/10 bg-slate-900/60 p-6">
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 text-lg mb-4">
                ✉️
              </div>
              <Eyebrow className="tracking-[0.2em]">Email Support</Eyebrow>
            </div>
            <a
              href={`mailto:${siteInfo.email}`}
              className="mt-3 block text-base sm:text-lg font-bold text-white transition hover:text-amber-400 break-all"
            >
              {siteInfo.email}
            </a>
          </Card>

          <Card className="flex flex-col justify-between border-white/10 bg-slate-900/60 p-6">
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 text-lg mb-4">
                📞
              </div>
              <Eyebrow className="tracking-[0.2em]">Phone / WhatsApp</Eyebrow>
            </div>
            <a
              href={`tel:${siteInfo.phone.replace(/\s/g, "")}`}
              className="mt-3 block text-base sm:text-lg font-bold text-white transition hover:text-amber-400"
            >
              {siteInfo.phone}
            </a>
          </Card>
        </div>
      </SectionPanel>
    </main>
  );
}
