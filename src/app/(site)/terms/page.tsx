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
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <Eyebrow>Terms</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-neutral-900 sm:text-4xl">
          Terms and Conditions
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
          Please read these terms carefully before using RKB.
        </p>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-black text-neutral-900">
                {section.title}
              </h2>
              <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </SectionPanel>
    </main>
  );
}
