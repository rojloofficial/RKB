import { SectionPanel } from "@/components/ui/card";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function SiteLoading() {
  return (
    <main
      className="w-full min-w-0 px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
      aria-busy="true"
      aria-label="Loading page content"
    >
      <SectionPanel>
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="mt-3 h-8 w-60 rounded-xl sm:h-9 sm:w-80" />
        <SkeletonText lines={2} className="mt-3 max-w-xl" />

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-[24rem] flex-col justify-between rounded-[1.5rem] border border-red-100 bg-white p-5 sm:p-6"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-6 w-36 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <Skeleton className="h-44 w-full rounded-2xl" />
              </div>
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>
    </main>
  );
}
