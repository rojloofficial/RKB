import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";

export default function AdminLoading() {
  return (
    <main
      className="min-w-0 p-4 sm:p-6 lg:p-10"
      aria-busy="true"
      aria-label="Loading admin content"
    >
      <div className="h-9 w-48 rounded-xl bg-slate-800/80 animate-pulse" />
      <div className="mt-2 h-4 w-72 rounded-md bg-slate-800/60 animate-pulse" />

      {/* Stat Cards Skeleton */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md"
          >
            <div className="h-4 w-28 rounded-md bg-slate-800/60 animate-pulse" />
            <div className="mt-3 h-8 w-20 rounded-md bg-slate-800/80 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="mt-8">
        <AdminTableSkeleton
          headers={["Item", "Details", "Status", "Date", "Actions"]}
          rowCount={6}
        />
      </div>
    </main>
  );
}
