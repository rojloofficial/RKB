import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionPanel } from "@/components/ui/card";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Refund Policy | RKB",
  description: "Read RKB's refund policy for payments, coins, and listings.",
  alternates: {
    canonical: `${siteConfig.url}/refund-policy`,
  },
  openGraph: {
    title: "Refund Policy | RKB",
    description: "Read RKB's refund policy for payments, coins, and listings.",
    url: `${siteConfig.url}/refund-policy`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Refund Policy | RKB",
    description: "Read RKB's refund policy for payments, coins, and listings.",
  },
};

export default function RefundPolicy() {
  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <SectionPanel className="p-6 sm:p-10">
        <Eyebrow>Payments &amp; Billings</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl tracking-tight">
          Refund <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Policy</span>
        </h1>
        <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
          This policy explains when and how refunds are processed on RKB.
        </p>

        <div className="mt-10 space-y-8 divide-y divide-white/10">
          <section className="pt-6 first:pt-0">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">1. Refund Eligibility</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              Refunds are considered for duplicate charges, failed deliveries, or
              cancelled orders as described at the time of purchase.
            </p>
          </section>
          <section className="pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">2. Processing Time</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              Approved refunds are processed to the original payment method
              within the timeframe required by your payment provider.
            </p>
          </section>
          <section className="pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">3. Coin Purchases</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              Coin purchases used to promote listings are generally
              non-refundable once consumed, unless required by applicable law.
            </p>
          </section>
        </div>
      </SectionPanel>
    </main>
  );
}
