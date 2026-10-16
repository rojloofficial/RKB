import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/button";
import SearchBar from "@/components/search-bar";
import { Eyebrow } from "@/components/ui/eyebrow";
import { serviceCards } from "@/lib/services";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "RKB – Find Services, Places & Post Ads in Your City",
  description:
    "RKB connects you with call girls, male escorts, wellness, and the best local spots and services across Indian cities. Post your ad today.",
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: "RKB – Find Services, Places & Post Ads in Your City",
    description:
      "RKB connects you with call girls, male escorts, wellness, and the best local spots across Indian cities.",
    url: siteConfig.url,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RKB – Find Services, Places & Post Ads in Your City",
    description:
      "RKB connects you with call girls, male escorts, wellness, and the best local spots across Indian cities.",
  },
};

const STATS = [
  { value: "200+", label: "Supported Cities" },
  { value: "100%", label: "Verified Ads" },
  { value: "24/7", label: "Direct Contact" },
  { value: "10K+", label: "Monthly Visitors" },
];

const FEATURES = [
  {
    icon: "📍",
    title: "Micro-Locality Search",
    description: "Find trusted local listings by specific neighborhood, colony, or metropolitan sub-district in every Indian city.",
  },
  {
    icon: "💬",
    title: "Instant Direct Contact",
    description: "Connect instantly via direct phone call, WhatsApp, or Telegram with no middlemen or commission fees.",
  },
  {
    icon: "🪙",
    title: "Coin-Based Promotions",
    description: "Flexible 6-hour promotional shifts (Morning, Afternoon, Evening, Night) to maximize your ad visibility when it counts.",
  },
  {
    icon: "🔒",
    title: "Privacy & Discretion",
    description: "Strict passwordless authentication, verified advertiser profiles, and safe client-side image compression.",
  },
];

export default function Home() {
  return (
    <main className="flex-1 w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white pt-16 pb-20 sm:pt-20 sm:pb-28">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-amber-500/10 via-orange-500/15 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Top Eyebrow Tag */}
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 shadow-inner mb-6">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              India&apos;s Leading Local Classifieds Network
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight sm:leading-tight tracking-tight text-white">
              Raat Ki Baat <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                Find Services & Places
              </span>
            </h1>

            {/* Subheading */}
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-300 font-normal">
              RKB connects you with call girls, male escorts, wellness, and the best local spots across 200+ Indian cities.
            </p>

            {/* Quick Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Button href="/services" variant="gradient" size="lg" className="shadow-lg shadow-orange-600/30">
                Explore Services
              </Button>
              <Button href="/post-ad/new" variant="outline" size="lg" className="!bg-slate-900/80 !text-white !border-slate-700 hover:!bg-slate-800">
                + Post an Ad
              </Button>
            </div>

            {/* Interactive Search Bar */}
            <SearchBar />
          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-14 pt-10 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {STATS.map((stat) => (
              <div key={stat.label} className="p-3">
                <p className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">{stat.value}</p>
                <p className="mt-1 text-xs sm:text-sm font-medium text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories / Services Grid Section */}
      <section className="px-4 py-14 sm:py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>Browse Services</Eyebrow>
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              What you can find on RKB
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              Explore trusted listings with transparent rates, real customer photos, and direct communication channels.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {serviceCards.map((item) => (
              <article
                key={item.title}
                className="group overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs card-hover-lift flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-64 overflow-hidden rounded-t-3xl bg-slate-100">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-4 rounded-full bg-amber-500/90 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-xs">
                      Popular Category
                    </span>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-slate-100">
                  <Link
                    href="/places"
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    Browse City Ads →
                  </Link>
                  <Button href="/post-ad/new" variant="soft" size="sm">
                    Post a Service
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose RKB Features Grid */}
      <section className="bg-slate-100/70 border-y border-slate-200/80 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>Platform Highlights</Eyebrow>
            <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Why Advertisers & Visitors Choose RKB
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Built specifically for local cities across India with high-visibility promotional tools.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs card-hover-lift"
              >
                <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-2xl mb-4">
                  {feat.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900">{feat.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-8 sm:p-12 lg:p-16 text-center text-white border border-slate-800 shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 mb-4">
              Get Discovered Fast
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to post your listing?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-slate-300">
              Publish your classified ad in minutes and reach thousands of prospective clients looking for your services in your city.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button
                href="/post-ad/new"
                variant="gradient"
                size="lg"
                className="shadow-xl shadow-amber-500/20 font-bold"
              >
                + Post an Ad Today
              </Button>
              <Button
                href="/places"
                variant="outline"
                size="lg"
                className="!bg-slate-900 !text-white !border-slate-700 hover:!bg-slate-800"
              >
                Browse All Places
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
