import Link from "next/link";
import Image from "next/image";
import { navLinks, policyLinks } from "@/lib/nav";

const POPULAR_CITIES = [
  { name: "Mumbai", slug: "mumbai" },
  { name: "Delhi", slug: "delhi" },
  { name: "Bengaluru", slug: "bengaluru" },
  { name: "Hyderabad", slug: "hyderabad" },
  { name: "Ahmedabad", slug: "ahmedabad" },
  { name: "Chennai", slug: "chennai" },
  { name: "Kolkata", slug: "kolkata" },
  { name: "Pune", slug: "pune" },
  { name: "Jaipur", slug: "jaipur" },
  { name: "Surat", slug: "surat" },
  { name: "Lucknow", slug: "lucknow" },
  { name: "Chandigarh", slug: "chandigarh" },
  { name: "Goa", slug: "goa" },
  { name: "Indore", slug: "indore" },
  { name: "Patna", slug: "patna" },
  { name: "Nagpur", slug: "nagpur" },
];

export default function Footer() {
  return (
    <footer className="border-t border-neutral-800 bg-neutral-950 px-3 sm:px-6 lg:px-8 py-8 text-neutral-300 w-full">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        <div className="flex items-center gap-3.5 sm:gap-5 sm:col-span-2 -ml-2 sm:-ml-3">
          <Link href="/" className="shrink-0 hover:opacity-90 transition">
            <Image
              src="/favicon.png"
              alt="RKB Logo"
              width={220}
              height={220}
              loading="eager"
              className="h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44 lg:h-52 lg:w-52 object-contain drop-shadow-xl"
            />
          </Link>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl font-black tracking-tight !text-white">RKB</p>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-neutral-400 max-w-[280px]">
              Find services, explore places,<br />
              and post ads in one simple<br />
              local marketplace.
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold !text-white">Navigate</p>
          <ul className="mt-3 space-y-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-neutral-400 transition-colors hover:text-white"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold !text-white">Policies</p>
          <ul className="mt-3 space-y-2">
            {policyLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-neutral-400 transition-colors hover:text-white"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 w-full max-w-6xl border-t border-neutral-800 pt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Popular Locations
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {POPULAR_CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/places/${city.slug}`}
              className="text-neutral-400 transition-colors hover:text-white"
            >
              {city.name}
            </Link>
          ))}
          <Link
            href="/places"
            className="text-neutral-300 underline underline-offset-2 hover:text-white"
          >
            View all cities →
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-6 w-full max-w-6xl border-t border-neutral-800 pt-5 text-sm text-neutral-400">
        <p>© {new Date().getFullYear()} RKB. All rights reserved.</p>
      </div>
    </footer>
  );
}
