"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "rojlo_age_verified";
const DECLINED_KEY = "rojlo_age_declined";

export default function AgeGate() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      let verified = false;
      let declined = false;
      try {
        verified = localStorage.getItem(STORAGE_KEY) === "true";
        declined = sessionStorage.getItem(DECLINED_KEY) === "true";
      } catch {
        verified = false;
        declined = false;
      }

      if (verified) {
        setShow(false);
        setIsDeclined(false);
        return;
      }

      if (declined) {
        setIsDeclined(true);
        setShow(true);
        return;
      }

      setShow(true);
    });
  }, [pathname]);

  function acceptAge() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
      sessionStorage.removeItem(DECLINED_KEY);
    } catch {}
    setShow(false);
    setIsDeclined(false);
  }

  function declineAge() {
    try {
      sessionStorage.setItem(DECLINED_KEY, "true");
    } catch {}
    setIsDeclined(true);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agegate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md px-4 py-6"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700/80 bg-slate-900 p-6 sm:p-10 text-center shadow-2xl text-white max-h-[92vh] overflow-y-auto">
        {/* Glow ambient background */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {isDeclined ? (
          <div className="relative z-10 space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-3xl">
              ⛔
            </div>
            <h2 id="agegate-title" className="text-2xl font-black text-white">
              Access Restricted
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              You must be at least 18 years of age to access this website. If you are under 18 or entered by mistake, please close this browser tab.
            </p>
            <div className="pt-2 flex flex-col gap-3">
              <a
                href="https://www.google.com"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 py-3 text-sm font-bold text-slate-200 hover:bg-slate-700 transition"
              >
                Exit Website
              </a>
              <button
                type="button"
                onClick={acceptAge}
                className="text-xs text-slate-500 hover:text-slate-400 underline underline-offset-4"
              >
                I am actually 18+ (Retry verification)
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-400 shadow-inner text-3xl">
              🔞
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 mb-3">
                Age Verification Required
              </span>
              <h2 id="agegate-title" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Are you 18 or older?
              </h2>
            </div>

            <p className="text-sm leading-relaxed text-slate-300">
              This platform contains classified advertisements and adult content intended strictly for mature audiences aged <strong className="text-white">18 and above</strong>. Please confirm your age to continue.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={acceptAge}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/30 hover:from-amber-600 hover:to-orange-700 active:scale-95 transition-all cursor-pointer"
              >
                Yes, I am 18+
              </button>
              <button
                type="button"
                onClick={declineAge}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-6 py-3.5 text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95 transition-all cursor-pointer"
              >
                No, I&apos;m under 18
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              By entering, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
