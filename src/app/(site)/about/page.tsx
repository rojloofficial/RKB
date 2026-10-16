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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbSchema} />
      <SectionPanel className="p-6 sm:p-8 lg:p-10 border border-slate-200/90 bg-white">
        <Eyebrow>About Platform</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-black sm:text-4xl lg:text-5xl tracking-tight">
          About <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">RKB</span>
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-black font-medium sm:text-lg">
          RKB is India&apos;s leading local marketplace for services, places, and classifieds. We help
          users discover trusted service providers, explore city directories, and post
          their own listings in one modern, seamless platform.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="flex flex-col justify-between border-slate-200 bg-slate-50/90 p-6 shadow-xs">
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 text-lg mb-4">
                ✉️
              </div>
              <Eyebrow className="tracking-[0.2em]">Official Email</Eyebrow>
            </div>
            <a
              href={`mailto:${siteInfo.email}`}
              className="mt-3 block text-base sm:text-lg font-bold text-black transition hover:text-amber-600 break-all"
            >
              {siteInfo.email}
            </a>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 bg-slate-50/90 p-6 shadow-xs">
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 text-lg mb-4">
                📞
              </div>
              <Eyebrow className="tracking-[0.2em]">Phone Support</Eyebrow>
            </div>
            <a
              href={`tel:${siteInfo.phone.replace(/\s/g, "")}`}
              className="mt-3 block text-lg sm:text-xl font-bold text-black transition hover:text-amber-600"
            >
              {siteInfo.phone}
            </a>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 bg-slate-50/90 p-6 shadow-xs sm:col-span-2 lg:col-span-1">
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 text-lg mb-4">
                📍
              </div>
              <Eyebrow className="tracking-[0.2em]">Registered Office</Eyebrow>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-black font-medium">
              {siteInfo.address}
            </p>
          </Card>
        </div>

        <section className="mt-12 border-t border-slate-200 pt-10">
          <h2 className="text-2xl font-black text-black sm:text-3xl">Platform Policies &amp; Governance</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black font-medium sm:text-base">
            These policies explain how the platform works, how user content is
            handled, and what to expect when using RKB.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {policySections.map((section) => (
              <Card key={section.title} className="border-slate-200 bg-slate-50/80 p-6 shadow-xs">
                <h3 className="text-lg font-bold text-black">
                  {section.title}
                </h3>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-black font-medium">
                  {section.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-black">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                      <span className="text-black font-medium">{point}</span>
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
