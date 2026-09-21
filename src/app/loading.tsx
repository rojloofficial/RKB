import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div
      className="min-h-screen w-full bg-pink-50 p-4 sm:p-8"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between border-b border-red-100 py-4">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>

        <div className="space-y-6 rounded-[1.75rem] border border-red-100 bg-white p-6 shadow-sm sm:p-10">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-10 w-64 rounded-xl sm:h-12 sm:w-96" />
          <SkeletonText lines={2} className="max-w-xl" />

          <div className="grid gap-6 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-pink-100/70 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
