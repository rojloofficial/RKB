import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionPanel } from "@/components/ui/card";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Terms and Conditions | RKB",
  description:
    "Read the terms and conditions for using RKB, including accounts, listings, payments, and acceptable use.",
  alternates: {
    canonical: `${siteConfig.url}/terms`,
  },
  openGraph: {
    title: "Terms and Conditions | RKB",
    description:
      "Read the terms and conditions for using RKB, including accounts, listings, payments, and acceptable use.",
    url: `${siteConfig.url}/terms`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms and Conditions | RKB",
    description:
      "Read the terms and conditions for using RKB, including accounts, listings, payments, and acceptable use.",
  },
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using RKB, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, please do not use the platform.",
  },
  {
    title: "2. Accounts",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate information and be at least 18 years old to use this service.",
  },
  {
    title: "3. Listings and Content",
    body: "Users are solely responsible for the ads and content they post. Content must be lawful, accurate, and not infringe the rights of others. We reserve the right to remove any listing that violates these terms.",
  },
  {
    title: "4. Payments and Coins",
    body: "Payments for coins or promoted listings are processed as described at the time of purchase. All purchases are final unless otherwise required by applicable law.",
  },
  {
    title: "5. Prohibited Use",
    body: "You may not use RKB for any unlawful, fraudulent, or abusive activity. We may suspend or terminate accounts that breach these terms.",
  },
  {
    title: "6. Limitation of Liability",
    body: "RKB is provided on an \"as is\" basis. We are not liable for any indirect or consequential damages arising from the use of the platform or interactions between users.",
  },
  {
    title: "7. Changes to Terms",
    body: "We may update these Terms from time to time. Continued use of RKB after changes are posted constitutes acceptance of the revised terms.",
  },
];

export default function Terms() {
  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <SectionPanel className="p-6 sm:p-10">
        <Eyebrow>User Agreement</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl tracking-tight">
          Terms and <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Conditions</span>
        </h1>
        <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
          Please read these terms carefully before using RKB.
        </p>

        <div className="mt-10 space-y-8 divide-y divide-white/10">
          {sections.map((section) => (
            <section key={section.title} className="pt-6 first:pt-0">
              <h2 className="text-lg sm:text-xl font-bold text-amber-400">
                {section.title}
              </h2>
              <p className="mt-2.5 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-300">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </SectionPanel>
    </main>
  );
}
