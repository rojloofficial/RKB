"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function AdGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const count = images.length;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 4000);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0) {
    return (
      <div className="relative h-72 w-full overflow-hidden rounded-3xl bg-slate-100 sm:h-80 md:h-[26rem] flex items-center justify-center text-slate-400">
        No images available
      </div>
    );
  }

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  return (
    <div className="relative w-full space-y-3">
      {/* Main Image Frame */}
      <div className="relative h-72 w-full overflow-hidden rounded-3xl bg-slate-950 sm:h-80 md:h-[28rem] border border-slate-200/80 shadow-md group">
        <Image
          src={images[index]}
          alt={`${name} image ${index + 1}`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={index === 0}
        />

        {/* Counter Badge */}
        {count > 1 && (
          <div className="absolute bottom-4 right-4 z-10 rounded-full bg-slate-950/70 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-sm border border-white/10">
            {index + 1} / {count}
          </div>
        )}

        {/* Prev / Next Arrows */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2.5 text-slate-900 shadow-md backdrop-blur-md hover:bg-white active:scale-95 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2.5 text-slate-900 shadow-md backdrop-blur-md hover:bg-white active:scale-95 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnails row */}
      {count > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`View photo ${i + 1}`}
              className={`relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                i === index
                  ? "border-amber-500 ring-2 ring-amber-500/30 scale-105"
                  : "border-slate-200 opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={img}
                alt={`${name} thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
