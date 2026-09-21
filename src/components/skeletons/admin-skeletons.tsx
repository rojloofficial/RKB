import { Skeleton } from "@/components/ui/skeleton";

export function AdminStatSkeleton({ className = "h-8 w-16 sm:h-9 sm:w-20" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-pulse motion-reduce:animate-none rounded-md bg-pink-200/60 ${className}`}
      aria-hidden="true"
    />
  );
}

export function AdminTableSkeleton({
  headers,
  rowCount = 5,
  minWidth = "min-w-[640px]",
}: {
  headers: string[];
  rowCount?: number;
  minWidth?: string;
}) {
  return (
    <div
      className="mt-6 overflow-x-auto rounded-2xl border border-red-100 bg-white"
      aria-busy="true"
      aria-label="Loading table data"
    >
      <table className={`w-full ${minWidth} text-left text-sm`}>
        <thead className="bg-pink-50 text-red-950">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 sm:py-4 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, rIdx) => (
            <tr key={rIdx} className="border-t border-red-50">
              {headers.map((_, cIdx) => (
                <td key={cIdx} className="px-4 py-3 sm:py-4">
                  <Skeleton
                    className={`h-4 rounded-md ${
                      cIdx === 0
                        ? "w-3/4"
                        : cIdx === headers.length - 1
                        ? "w-16"
                        : "w-24"
                    }`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminCouponCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading coupons">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-red-200 bg-white p-4 sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-36 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminPaymentRequestCardsSkeleton({
  count = 3,
}: {
  count?: number;
}) {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Loading payment requests"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-red-200 bg-white p-4 sm:p-6"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-48 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Skeleton className="h-4 w-44 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-4 w-40 rounded-md" />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminPaymentHistoryCardsSkeleton({
  count = 3,
}: {
  count?: number;
}) {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Loading payment history"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-red-200 bg-white p-4 sm:p-6 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-red-50 p-4 space-y-2">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-5 w-36 rounded-md" />
            </div>
            <div className="rounded-xl bg-orange-50 p-4 space-y-2">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-5 w-28 rounded-md" />
            </div>
            <div className="rounded-xl bg-red-50 p-4 space-y-2">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-5 w-32 rounded-md" />
            </div>
            <div className="rounded-xl bg-green-50 p-4 space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminUpiCardsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading UPIs">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-white p-4 sm:p-6 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="mt-3 h-32 w-32 rounded-lg" />
          </div>
          <div className="flex gap-2 sm:flex-col shrink-0">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminStateHierarchySkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading states">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-red-100 bg-white p-4 sm:p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-6 w-36 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminCitySeoSkeleton() {
  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-8" aria-busy="true" aria-label="Loading SEO editor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 sm:w-80 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-red-100 bg-white p-6 space-y-4">
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
        <div className="rounded-2xl border border-red-100 bg-white p-6 space-y-4">
          <Skeleton className="h-6 w-28 rounded-md" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </main>
  );
}

