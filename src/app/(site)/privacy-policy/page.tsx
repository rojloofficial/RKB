import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionPanel } from "@/components/ui/card";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy | RKB",
  description: "Read how RKB collects, uses, and protects your information.",
  alternates: {
    canonical: `${siteConfig.url}/privacy-policy`,
  },
  openGraph: {
    title: "Privacy Policy | RKB",
    description: "Read how RKB collects, uses, and protects your information.",
    url: `${siteConfig.url}/privacy-policy`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | RKB",
    description: "Read how RKB collects, uses, and protects your information.",
  },
};

export default function PrivacyPolicy() {
  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <SectionPanel className="p-6 sm:p-10">
        <Eyebrow>Compliance &amp; Trust</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl tracking-tight">
          Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Policy</span>
        </h1>
        <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
          This policy explains how RKB handles and protects your personal information.
        </p>

        <div className="mt-10 space-y-8 divide-y divide-white/10">
          <section className="pt-6 first:pt-0">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">1. Information We Collect</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              We collect account details, ad content, and basic usage information
              needed to operate the platform and support you.
            </p>
          </section>
          <section className="pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">2. How We Use It</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              Your information is used to provide services, display listings,
              communicate with you, and improve the platform.
            </p>
          </section>
          <section className="pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">3. Data Sharing</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              We do not sell your personal information. Data may be shared with
              service providers only as needed to run the platform.
            </p>
          </section>
          <section className="pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-amber-400">4. Your Choices</h2>
            <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
              You can request access to or deletion of your account data by
              contacting our support team.
            </p>
          </section>
        </div>
      </SectionPanel>
    </main>
  );
}
