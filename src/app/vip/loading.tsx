import { Skeleton } from "@/components/ui/skeleton";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";

export default function VipLoading() {
  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0" aria-busy="true" aria-label="Loading VIP panel">
      {/* Title skeleton */}
      <Skeleton className="h-9 w-48 rounded-xl" />
      <Skeleton className="mt-2 h-4 w-72 rounded-md" />

      {/* Stats cards skeleton */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-red-100 bg-white p-4 sm:p-5">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="mt-3 h-8 w-14 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main content table skeleton */}
      <div className="mt-8">
        <AdminTableSkeleton
          headers={["Name", "Details", "Count", "Status"]}
          rowCount={6}
          minWidth="min-w-[500px]"
        />
      </div>
    </main>
  );
}
