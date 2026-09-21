import { Skeleton } from "@/components/ui/skeleton";

export function YourAdsListSkeleton() {
  return (
    <div className="mt-6 grid gap-4" aria-busy="true" aria-label="Loading your ads">
      {Array.from({ length: 3 }).map((_, i) => (
        <article
          key={i}
          className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-48 rounded-md sm:w-64" />
            <Skeleton className="h-4 w-32 rounded-md sm:w-40" />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function PaymentHistorySkeleton() {
  return (
    <div
      className="mt-6 space-y-4"
      aria-busy="true"
      aria-label="Loading payment history"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-4 w-48 rounded-md" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-12 rounded-md" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PaymentOptionsSkeleton() {
  return (
    <div
      className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-6"
      aria-busy="true"
      aria-label="Loading payment options"
    >
      <div className="mt-4 flex justify-center">
        <Skeleton className="h-52 w-52 rounded-2xl sm:h-60 sm:w-60" />
      </div>
      <div className="mt-6 space-y-2 text-center">
        <Skeleton className="mx-auto h-5 w-48 rounded-md" />
        <Skeleton className="mx-auto h-4 w-36 rounded-md" />
      </div>
      <div className="mt-6 flex justify-center">
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  const fields = ["Name", "Email", "Service", "Member Since"];
  return (
    <div className="mt-6 space-y-4" aria-busy="true" aria-label="Loading profile">
      {fields.map((label) => (
        <div key={label} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-neutral-600">{label}</p>
          <Skeleton className="mt-2 h-5 w-44 rounded-md" />
        </div>
      ))}
    </div>
  );
}
