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
    }, 2000);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0) {
    return (
      <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-neutral-100 sm:h-80 md:h-96" />
    );
  }

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  return (
    <div className="relative w-full">
      <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-neutral-100 sm:h-80 md:h-96">
        <Image
          src={images[index]}
          alt={`${name} image ${index + 1}`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={index === 0}
        />
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-2xl font-black text-neutral-900 shadow-sm hover:bg-white transition"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next image"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-2xl font-black text-neutral-900 shadow-sm hover:bg-white transition"
          >
            ›
          </button>

          <div className="mt-3 flex justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to image ${i + 1}`}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  i === index ? "bg-neutral-900" : "bg-neutral-300"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
