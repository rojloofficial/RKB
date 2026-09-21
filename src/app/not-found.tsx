import Link from "next/link";
import { NotFoundLogger, GoBackButton } from "@/components/not-found-logger";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-pink-50 via-rose-50/40 to-pink-50 text-red-950 px-6 py-16 sm:px-8 sm:py-20 lg:py-24">
      <NotFoundLogger />
      <main className="flex w-full flex-col items-center justify-center">
        <div className="relative w-full max-w-xl">
          {/* Background Decorative Ambient Glow */}
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-rose-300/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-red-300/20 rounded-full blur-3xl pointer-events-none" />

          {/* Main Card */}
          <div className="relative rounded-3xl border border-red-100 bg-white/95 p-8 sm:p-12 lg:p-14 text-center shadow-2xl backdrop-blur-md">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 border border-rose-200/80 mb-6">
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
              ERROR 404 • PAGE NOT FOUND
            </div>

            {/* Icon Illustration */}
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-red-600 via-rose-600 to-pink-600 text-white shadow-xl shadow-red-600/25 ring-8 ring-rose-50">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Title & Description */}
            <h1 className="text-3xl font-black tracking-tight text-red-950 sm:text-4xl">
              Page Not Found
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-red-900/75 max-w-md mx-auto">
              The address you navigated to does not exist, has been removed, or was typed incorrectly. We have automatically logged this URL so our team can investigate and fix it.
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:from-red-700 hover:to-rose-700 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Return to Homepage
              </Link>

              <GoBackButton />
            </div>

            {/* Quick Helpful Links */}
            <div className="mt-8 pt-6 border-t border-red-100 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-red-800/80">
              <span className="text-red-900/50">Looking for something else?</span>
              <Link href="/places" className="hover:text-red-600 hover:underline transition">
                Browse Places
              </Link>
              <span className="text-red-200">•</span>
              <Link href="/services" className="hover:text-red-600 hover:underline transition">
                Services
              </Link>
              <span className="text-red-200">•</span>
              <Link href="/contact" className="hover:text-red-600 hover:underline transition">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
