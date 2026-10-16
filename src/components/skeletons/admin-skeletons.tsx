import { Skeleton } from "@/components/ui/skeleton";

export function AdminStatSkeleton({ className = "h-8 w-16 sm:h-9 sm:w-20" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-pulse motion-reduce:animate-none rounded-md bg-slate-800/80 ${className}`}
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
      className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-md"
      aria-busy="true"
      aria-label="Loading table data"
    >
      <table className={`w-full ${minWidth} text-left text-sm`}>
        <thead className="bg-slate-800/80 text-amber-400 font-bold uppercase tracking-wider text-xs border-b border-white/10">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 sm:py-4 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {Array.from({ length: rowCount }).map((_, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
              {headers.map((_, cIdx) => (
                <td key={cIdx} className="px-4 py-3 sm:py-4">
                  <div
                    className={`h-4 rounded-md animate-pulse bg-slate-800/70 ${
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
          className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl backdrop-blur-md"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-6 w-36 rounded-md bg-slate-800/80 animate-pulse" />
                <div className="h-6 w-16 rounded-full bg-slate-800/80 animate-pulse" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="h-4 w-32 rounded-md bg-slate-800/60 animate-pulse" />
                <div className="h-4 w-28 rounded-md bg-slate-800/60 animate-pulse" />
                <div className="h-4 w-36 rounded-md bg-slate-800/60 animate-pulse" />
                <div className="h-4 w-32 rounded-md bg-slate-800/60 animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 rounded-full bg-slate-800/80 animate-pulse" />
              <div className="h-8 w-16 rounded-full bg-slate-800/80 animate-pulse" />
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
          className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl backdrop-blur-md"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-6 w-48 rounded-md bg-slate-800/80 animate-pulse" />
                <div className="h-6 w-20 rounded-full bg-slate-800/80 animate-pulse" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="h-4 w-44 rounded-md bg-slate-800/60 animate-pulse" />
                <div className="h-4 w-28 rounded-md bg-slate-800/60 animate-pulse" />
                <div className="h-4 w-36 rounded-md bg-slate-800/60 animate-pulse" />
                <div className="h-4 w-40 rounded-md bg-slate-800/60 animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <div className="h-9 w-20 rounded-full bg-slate-800/80 animate-pulse" />
              <div className="h-9 w-20 rounded-full bg-slate-800/80 animate-pulse" />
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
          className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl backdrop-blur-md"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-800/60 border border-white/5 p-4 space-y-2">
              <div className="h-3 w-16 rounded-md bg-slate-700/60 animate-pulse" />
              <div className="h-5 w-36 rounded-md bg-slate-700/80 animate-pulse" />
            </div>
            <div className="rounded-xl bg-slate-800/60 border border-white/5 p-4 space-y-2">
              <div className="h-3 w-20 rounded-md bg-slate-700/60 animate-pulse" />
              <div className="h-5 w-28 rounded-md bg-slate-700/80 animate-pulse" />
            </div>
            <div className="rounded-xl bg-slate-800/60 border border-white/5 p-4 space-y-2">
              <div className="h-3 w-16 rounded-md bg-slate-700/60 animate-pulse" />
              <div className="h-5 w-32 rounded-md bg-slate-700/80 animate-pulse" />
            </div>
            <div className="rounded-xl bg-slate-800/60 border border-white/5 p-4 space-y-2">
              <div className="h-3 w-24 rounded-md bg-slate-700/60 animate-pulse" />
              <div className="h-6 w-20 rounded-md bg-slate-700/80 animate-pulse" />
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
          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl backdrop-blur-md sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-5 w-36 rounded-md bg-slate-800/80 animate-pulse" />
            <div className="h-4 w-48 rounded-md bg-slate-800/60 animate-pulse" />
            <div className="mt-3 h-32 w-32 rounded-lg bg-slate-800/70 animate-pulse" />
          </div>
          <div className="flex gap-2 sm:flex-col shrink-0">
            <div className="h-8 w-20 rounded-full bg-slate-800/80 animate-pulse" />
            <div className="h-8 w-20 rounded-full bg-slate-800/80 animate-pulse" />
            <div className="h-9 w-20 rounded-lg bg-slate-800/80 animate-pulse" />
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
          className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 shadow-xl backdrop-blur-md"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-md bg-slate-800/80 animate-pulse" />
              <div className="h-6 w-36 rounded-md bg-slate-800/80 animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-slate-800/80 animate-pulse" />
            </div>
            <div className="h-7 w-24 rounded-full bg-slate-800/80 animate-pulse" />
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
          <div className="h-8 w-64 sm:w-80 rounded-xl bg-slate-800/80 animate-pulse" />
          <div className="h-4 w-72 rounded-md bg-slate-800/60 animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-slate-800/80 animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-24 rounded-full bg-slate-800/80 animate-pulse" />
          <div className="h-9 w-20 rounded-full bg-slate-800/80 animate-pulse" />
          <div className="h-9 w-20 rounded-full bg-slate-800/80 animate-pulse" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-4 shadow-xl backdrop-blur-md">
            <div className="h-6 w-32 rounded-md bg-slate-800/80 animate-pulse" />
            <div className="h-10 w-full rounded-xl bg-slate-800/70 animate-pulse" />
            <div className="h-20 w-full rounded-xl bg-slate-800/70 animate-pulse" />
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-4 shadow-xl backdrop-blur-md">
          <div className="h-6 w-28 rounded-md bg-slate-800/80 animate-pulse" />
          <div className="h-24 w-full rounded-xl bg-slate-800/70 animate-pulse" />
        </div>
      </div>
    </main>
  );
}
