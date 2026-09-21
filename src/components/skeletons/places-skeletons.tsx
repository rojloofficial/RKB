import { Card, SectionPanel } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export function AdCardSkeleton() {
  return (
    <Card className="group relative flex min-h-[28rem] flex-col justify-between p-5 sm:min-h-[30rem] sm:p-7">
      <div>
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-6 w-36 rounded-md sm:h-7 sm:w-44" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <SkeletonText
          lines={2}
          className="mt-3"
          lineHeight="h-4"
          lastLineWidth="w-4/5"
        />
        <Skeleton className="mt-4 h-56 w-full rounded-[1rem] sm:h-64" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
    </Card>
  );
}

export function CityPageSkeleton() {
  return (
    <main>
      <section className="px-4 py-10 sm:px-6">
        <SectionPanel>
          {/* Eyebrow */}
          <Skeleton className="h-4 w-32 rounded-full" />

          {/* Heading */}
          <Skeleton className="mt-3 h-8 w-64 rounded-xl sm:h-9 sm:w-96" />

          {/* Popular Areas Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          {/* Ad Cards Grid */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <AdCardSkeleton key={i} />
            ))}
          </div>
        </SectionPanel>
      </section>
    </main>
  );
}

export function AdDetailSkeleton() {
  return (
    <main>
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <SectionPanel>
          {/* Eyebrow category */}
          <Skeleton className="h-4 w-28 rounded-full" />

          {/* Title & Age */}
          <div className="mt-3 flex flex-wrap items-baseline gap-2 sm:gap-3">
            <Skeleton className="h-8 w-52 rounded-xl sm:h-10 sm:w-80" />
            <Skeleton className="h-6 w-20 rounded-md sm:h-7" />
          </div>

          {/* About description */}
          <SkeletonText lines={3} className="mt-4 max-w-3xl" lineHeight="h-4 sm:h-5" />

          {/* 2-Column: Gallery & Contact Info */}
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            {/* Left: Gallery Carousel Placeholder */}
            <div className="order-1 relative">
              <Skeleton className="h-72 w-full rounded-2xl sm:h-96" />
            </div>

            {/* Right: Contact & Details */}
            <div className="order-2 space-y-6">
              <div>
                <Skeleton className="h-6 w-32 rounded-md" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Skeleton className="h-10 w-24 rounded-full" />
                  <Skeleton className="h-10 w-32 rounded-full" />
                  <Skeleton className="h-10 w-28 rounded-full" />
                </div>
              </div>

              {/* To Serve */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-24 rounded-md" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <Skeleton className="h-7 w-28 rounded-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                </div>
              </div>

              {/* Place Of Service */}
              <div className="space-y-2">
                <Skeleton className="h-5 w-36 rounded-md" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-28 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Service Rates Table Placeholder */}
          <div className="mt-8">
            <Skeleton className="h-6 w-36 rounded-md" />
            <div className="mt-3 overflow-x-auto rounded-2xl border border-red-100 bg-white p-5">
              <div className="space-y-3">
                <div className="flex justify-between border-b border-red-50 pb-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-24" />
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex justify-between border-b border-red-50/50 py-3 last:border-0"
                  >
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionPanel>
      </section>
    </main>
  );
}

export function PlacesExplorerSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Search and filters bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-11 w-full max-w-md rounded-2xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>

      {/* Suggested searches */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>

      {/* Grid of city cards */}
      <div className="grid w-full min-w-0 gap-3 sm:gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex w-full min-w-0 flex-col rounded-xl border border-red-100 bg-white p-3 sm:p-3.5"
          >
            <div className="flex w-full min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-5 w-28 rounded-md" />
                <Skeleton className="h-3.5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
