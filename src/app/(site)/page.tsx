import type { Metadata } from "next";
import Image from "next/image";
import Button from "@/components/ui/button";
import SearchBar from "@/components/search-bar";
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

export default function Home() {
  return (
    <main>
      <section className="bg-neutral-100/70 border-b border-neutral-200/80">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-neutral-500">
              get you fun
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-neutral-900 break-words">
              Raat Ki Baat
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg leading-7 sm:leading-8 text-neutral-600">
              RKB connects you with call girls, male escorts, wellness, and the
              best local spots across Indian cities.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button href="/services" variant="solid" className="!text-white">
                Explore Services
              </Button>
              <Button href="/post-ad/new" variant="outline" className="px-6 py-3">
                Post an Ad
              </Button>
            </div>

            <SearchBar />
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:py-12 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-3xl border border-neutral-200/90 bg-white p-5 sm:p-8 lg:p-10 shadow-xs">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-neutral-500">
            Services
          </p>
          <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900">
            What you can find
          </h2>
          <p className="mt-3 sm:mt-4 max-w-2xl text-base sm:text-lg leading-7 sm:leading-8 text-neutral-600">
            RKB brings together the everyday services people need, with a
            simple way to post your own ad.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {serviceCards.map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-xs hover:border-neutral-300 hover:shadow-sm transition-all"
              >
                <div className="relative h-56 overflow-hidden rounded-t-2xl bg-neutral-100">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <h3 className="mt-4 px-6 text-xl font-black text-neutral-900">
                  {item.title}
                </h3>
                <p className="mt-2 px-6 pb-6 text-sm leading-7 text-neutral-600">
                  {item.description}
                </p>
                <div className="px-6 pb-6">
                  <Button href="/post-ad/new" variant="soft">
                    Post a Service
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-neutral-950 p-6 sm:p-8 lg:p-10 text-center text-white border border-neutral-800 shadow-sm">
          <h2 className="text-2xl font-black !text-white sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-neutral-300">
            Post your ad in minutes and reach people looking for your service in
            your city.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              href="/post-ad/new"
              variant="solid"
              className="!bg-white !text-black text-black hover:!bg-neutral-200 font-bold"
            >
              Post an Ad
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
