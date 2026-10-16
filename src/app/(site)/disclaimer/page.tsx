import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionPanel } from "@/components/ui/card";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Disclaimer | RKB",
  description: "Read the disclaimer for using the RKB platform.",
  alternates: {
    canonical: `${siteConfig.url}/disclaimer`,
  },
  openGraph: {
    title: "Disclaimer | RKB",
    description: "Read the disclaimer for using the RKB platform.",
    url: `${siteConfig.url}/disclaimer`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Disclaimer | RKB",
    description: "Read the disclaimer for using the RKB platform.",
  },
};

export default function Disclaimer() {
  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <SectionPanel className="p-6 sm:p-10">
        <Eyebrow>Legal Notice</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl tracking-tight">
          Disclaimer <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">&amp; Notice</span>
        </h1>
        <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
          Please read this platform disclaimer before using RKB services.
        </p>

        <div className="mt-10 space-y-8 divide-y divide-white/10">
          <section className="pt-6 first:pt-0">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">1. Marketplace Role</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              RKB is a marketplace that connects users. We do not personally
              perform the listed services.
            </p>
          </section>
          <section className="pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">2. No Warranty</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              The platform is provided &ldquo;as is&rdquo; without warranties of any kind.
              We do not guarantee service quality or availability.
            </p>
          </section>
          <section className="pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">3. User Responsibility</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              Users are responsible for verifying listings, service details, and
              the conduct of other users before transacting.
            </p>
          </section>
        </div>
      </SectionPanel>
    </main>
  );
}
