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
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <Eyebrow>Disclaimer</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
          Disclaimer
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
          Please read this disclaimer before using RKB.
        </p>

        <div className="mt-8 space-y-6">
          <section>
            <h2 className="text-xl font-black text-neutral-900">1. Marketplace Role</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              RKB is a marketplace that connects users. We do not personally
              perform the listed services.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-neutral-900">2. No Warranty</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              The platform is provided &ldquo;as is&rdquo; without warranties of any kind.
              We do not guarantee service quality or availability.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-black text-neutral-900">3. User Responsibility</h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
              Users are responsible for verifying listings, service details, and
              the conduct of other users before transacting.
            </p>
          </section>
        </div>
      </SectionPanel>
    </main>
  );
}
