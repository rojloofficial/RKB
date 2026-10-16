import Link from "next/link";
import { NotFoundLogger, GoBackButton } from "@/components/not-found-logger";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-950 text-slate-100 px-6 py-16 sm:px-8 sm:py-20 lg:py-24">
      <NotFoundLogger />
      <main className="flex w-full flex-col items-center justify-center">
        <div className="relative w-full max-w-xl">
          {/* Background Decorative Ambient Glow */}
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Main Card */}
          <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 p-8 sm:p-12 lg:p-14 text-center shadow-2xl backdrop-blur-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3.5 py-1.5 text-xs font-bold text-amber-300 border border-amber-500/30 mb-6">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              ERROR 404 • PAGE NOT FOUND
            </div>

            {/* Icon Illustration */}
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/20 ring-8 ring-amber-500/10">
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
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Page Not <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Found</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-300 max-w-md mx-auto">
              The address you navigated to does not exist, has been removed, or was typed incorrectly. We have automatically logged this URL so our team can investigate and fix it.
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-400 hover:to-orange-500 active:scale-95"
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
          </div>
        </div>
      </main>
    </div>
  );
}
