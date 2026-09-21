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
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <Eyebrow>Refund Policy</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
          Refund Policy
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
          This policy explains when and how refunds are processed on RKB.
        </p>

        <div className="mt-8 space-y-6">
          <section>
            <h2 className="text-xl font-black text-neutral-900">1. Refund Eligibility</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              Refunds are considered for duplicate charges, failed deliveries, or
              cancelled orders as described at the time of purchase.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-neutral-900">2. Processing Time</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              Approved refunds are processed to the original payment method
              within the timeframe required by your payment provider.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-neutral-900">3. Coin Purchases</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              Coin purchases used to promote listings are generally
              non-refundable once consumed, unless required by applicable law.
            </p>
          </section>
        </div>
      </SectionPanel>
    </main>
  );
}
