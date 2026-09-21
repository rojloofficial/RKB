"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useState } from "react";

export default function AdImageCarousel({
  images,
  adName,
}: {
  images: string[];
  adName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const advanceAutomatically = useEffectEvent(() => {
    setActiveIndex((current) =>
      current >= images.length ? current : current + 1
    );
  });

  useEffect(() => {
    if (images.length < 2) return;

    const timer = window.setInterval(advanceAutomatically, 4500);
    return () => window.clearInterval(timer);
  }, [images.length]);

  useEffect(() => {
    if (isTransitioning) return;

    const frame = window.requestAnimationFrame(() => setIsTransitioning(true));
    return () => window.cancelAnimationFrame(frame);
  }, [isTransitioning]);

  if (images.length === 0) return null;

  const showPrevious = () => {
    setActiveIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  };

  const showNext = () => {
    setActiveIndex((current) =>
      current >= images.length ? current : current + 1
    );
  };

  const handleSlideTransitionEnd = () => {
    if (activeIndex === images.length) {
      setIsTransitioning(false);
      setActiveIndex(0);
    }
  };

  const slides = images.length > 1 ? [...images, images[0]] : images;

  return (
    <section aria-label={`${adName} images`}>
      <div className="relative overflow-hidden rounded-2xl bg-neutral-100">
        <div
          className={`flex h-72 ${isTransitioning ? "transition-transform duration-700 ease-in-out" : ""} sm:h-96`}
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          onTransitionEnd={handleSlideTransitionEnd}
        >
          {slides.map((src, index) => (
            <div key={index} className="relative h-full min-w-full">
              <Image
                src={src}
                alt={`${adName} image ${index + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 65vw"
                preload={index === 0}
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-neutral-900/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={showNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-neutral-900/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Next
            </button>
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900/80 px-3 py-1 text-xs font-semibold text-white">
              {(activeIndex % images.length) + 1} / {images.length}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
