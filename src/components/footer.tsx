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
    <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-300 w-full mt-auto">
      {/* Top Footer Grid */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="sm:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <Image
                src="/rojlo.png"
                alt="RKB Logo"
                width={48}
                height={48}
                className="h-12 w-12 rounded-2xl object-cover ring-2 ring-amber-500/30 group-hover:ring-amber-500/70 transition-all shadow-md"
              />
              <div>
                <span className="text-2xl font-black tracking-tight text-white">RKB</span>
                <p className="text-xs font-semibold text-amber-400">Classifieds & Local Services</p>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400 max-w-sm">
              Discover trusted services, wellness, escorts, and top local attractions across India’s major cities with transparent ads and instant contact.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Network
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-slate-300">
                🛡️ Verified Listings
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-wider">Explore</p>
            <ul className="mt-4 space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-amber-400"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Classifieds & Post Ad */}
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-wider">Classifieds</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/post-ad/new" className="transition-colors hover:text-amber-400">
                  Post New Ad
                </Link>
              </li>
              <li>
                <Link href="/post-ad/your-ads" className="transition-colors hover:text-amber-400">
                  My Active Ads
                </Link>
              </li>
              <li>
                <Link href="/post-ad/buy-coin" className="transition-colors hover:text-amber-400">
                  Buy Coins & Top-up
                </Link>
              </li>
              <li>
                <Link href="/places" className="transition-colors hover:text-amber-400">
                  Browse by City
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies & Compliance */}
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-wider">Policies & Legal</p>
            <ul className="mt-4 space-y-2.5">
              {policyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-amber-400"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Popular Locations Chips */}
        <div className="mt-12 pt-8 border-t border-slate-800/80">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5">
            Popular Cities & Metropolitan Areas
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {POPULAR_CITIES.map((city) => (
              <Link
                key={city.slug}
                href={`/places/${city.slug}`}
                className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-slate-300 transition-all hover:bg-slate-800 hover:text-amber-300 hover:border-slate-700"
              >
                {city.name}
              </Link>
            ))}
            <Link
              href="/places"
              className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-amber-300 font-semibold transition-all hover:bg-amber-500/20"
            >
              All 200+ Cities →
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} RKB Platform. All rights reserved.</p>
          <p className="flex items-center gap-1 text-slate-400">
            Strictly 18+ Adult Classifieds & Verified Local Services Portal
          </p>
        </div>
      </div>
    </footer>
  );
}
