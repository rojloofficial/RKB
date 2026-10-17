"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/models/city-seo";
import { SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

export default function CityFaqSection({
  faqs,
  cityName,
}: {
  faqs: FaqItem[];
  cityName: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const validFaqs = (faqs || []).filter(
    (f) => f.question?.trim() || f.answer?.trim()
  );

  if (validFaqs.length === 0) return null;

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="px-4 py-8 sm:px-6">
      <SectionPanel>
        <Eyebrow>City FAQ & Guides</Eyebrow>
        <h2 className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight sm:text-3xl">
          Frequently Asked Questions in {cityName}
        </h2>
        <p className="mt-1 text-sm text-slate-700 font-medium">
          Essential details and helpful answers about local services in {cityName}.
        </p>

        <div className="mt-8 space-y-3.5">
          {validFaqs.map((faq, index) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id || index}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "border-amber-400 bg-amber-50/20 shadow-xs ring-1 ring-amber-400/30"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(faq.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 p-4 sm:p-5 text-left cursor-pointer transition select-none"
                >
                  <span className="flex items-center gap-3 text-sm sm:text-base font-bold text-slate-900 pr-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-xs font-black text-amber-900 border border-amber-200/80">
                      Q{index + 1}
                    </span>
                    <span className="leading-snug">{faq.question}</span>
                  </span>

                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-transform duration-200 ${
                      isOpen
                        ? "rotate-180 bg-amber-500 text-white border-amber-500"
                        : "border-slate-200 bg-slate-100 text-slate-800"
                    }`}
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-amber-200/60 bg-white px-5 pb-5 pt-4 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[11px] font-black text-white mt-0.5">
                        A
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionPanel>
    </section>
  );
}
