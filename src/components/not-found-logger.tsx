"use client";

import { useEffect } from "react";

export function NotFoundLogger() {
  useEffect(() => {
    try {
      const url = window.location.pathname + window.location.search;
      const referrer = document.referrer || undefined;
      fetch("/api/log-404", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, referrer }),
      }).catch(() => {});
    } catch {
      // Ignore
    }
  }, []);

  return null;
}

export function GoBackButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.history.back();
        }
      }}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3.5 text-sm font-bold text-red-950 shadow-sm transition hover:bg-red-50 active:scale-95"
    >
      <svg className="h-4 w-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Go Back
    </button>
  );
}
