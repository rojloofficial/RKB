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
  // openId holds the ID of the currently expanded FAQ item (single-expand mutex accordion)
  const [openId, setOpenId] = useState<string | null>(null);

  // Filter out any empty FAQs
  const validFaqs = (faqs || []).filter(
    (f) => f.question?.trim() || f.answer?.trim()
  );

  if (validFaqs.length === 0) return null;

  const handleToggle = (id: string) => {
    // If user clicks currently open question, close it. If clicking next question, previous closes and clicked opens.
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="px-4 py-10 sm:px-6">
      <SectionPanel>
        <Eyebrow>FAQ</Eyebrow>
        <h2 className="mt-3 text-2xl font-black text-neutral-900 sm:text-3xl">
          Frequently Asked Questions in {cityName}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-neutral-600 font-medium">
          Got questions? Click any question below to view the solution.
        </p>

        <div className="mt-6 space-y-3">
          {validFaqs.map((faq, index) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id || index}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "border-neutral-900 bg-neutral-50 shadow-xs ring-1 ring-neutral-900/10"
                    : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(faq.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 p-4 sm:p-5 text-left cursor-pointer transition select-none"
                >
                  <span className="flex items-center gap-3 text-sm sm:text-base font-bold text-neutral-900 pr-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-black text-neutral-900 border border-neutral-300">
                      Q{index + 1}
                    </span>
                    <span className="leading-snug">{faq.question}</span>
                  </span>

                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black transition-all duration-200 ${
                      isOpen
                        ? "rotate-180 bg-black text-white border-black"
                        : "border-neutral-200 bg-neutral-100 text-neutral-800"
                    }`}
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-neutral-200 px-4 pb-5 pt-3.5 sm:px-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-black text-white border border-neutral-900 mt-0.5">
                        A
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-medium whitespace-pre-line">
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
