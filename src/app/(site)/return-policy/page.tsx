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
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <Eyebrow>Return Policy</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
          Return Policy
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
          This policy explains how returns are handled on RKB.
        </p>

        <div className="mt-8 space-y-6">
          <section>
            <h2 className="text-xl font-black text-neutral-900">1. Eligibility</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              Returns are evaluated on a case-by-case basis depending on the
              product or service purchased through the platform.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-neutral-900">2. How to Request</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              To request a return, contact our support team with your order or
              ad details. We will review the request and respond with the next
              steps.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-neutral-900">3. Non-Returnable Items</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              Certain digital items, consumed services, and promotional coin
              purchases are non-returnable unless required by applicable law.
            </p>
          </section>
        </div>
      </SectionPanel>
    </main>
  );
}
