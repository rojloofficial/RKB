import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionPanel } from "@/components/ui/card";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Return Policy | RKB",
  description: "Read RKB's return policy for products, services, and listings.",
  alternates: {
    canonical: `${siteConfig.url}/return-policy`,
  },
  openGraph: {
    title: "Return Policy | RKB",
    description: "Read RKB's return policy for products, services, and listings.",
    url: `${siteConfig.url}/return-policy`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Return Policy | RKB",
    description: "Read RKB's return policy for products, services, and listings.",
  },
};

export default function ReturnPolicy() {
  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <SectionPanel className="p-6 sm:p-10">
        <Eyebrow>Customer Protection</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl tracking-tight">
          Return <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Policy</span>
        </h1>
        <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
          This policy explains how returns are handled on RKB.
        </p>

        <div className="mt-10 space-y-8 divide-y divide-white/10">
          <section className="pt-6 first:pt-0">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">1. Eligibility</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              Returns are evaluated on a case-by-case basis depending on the
              product or service purchased through the platform.
            </p>
          </section>
          <section className="pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">2. How to Request</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              To request a return, contact our support team with your order or
              ad details. We will review the request and respond with the next
              steps.
            </p>
          </section>
          <section className="pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">3. Non-Returnable Items</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              Certain digital items, consumed services, and promotional coin
              purchases are non-returnable unless required by applicable law.
            </p>
          </section>
        </div>
      </SectionPanel>
    </main>
  );
}
