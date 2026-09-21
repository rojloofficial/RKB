import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base skeleton block with subtle pulse animation and reduced-motion support.
 */
export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse motion-reduce:animate-none rounded-xl bg-neutral-200/70 ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Skeleton text lines with realistic staggered widths.
 */
export function SkeletonText({
  lines = 2,
  className = "",
  lineHeight = "h-4",
  lastLineWidth = "w-3/5",
}: {
  lines?: number;
  className?: string;
  lineHeight?: string;
  lastLineWidth?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => {
        const isLast = i === lines - 1 && lines > 1;
        return (
          <Skeleton
            key={i}
            className={`${lineHeight} ${isLast ? lastLineWidth : "w-full"} rounded-md`}
          />
        );
      })}
    </div>
  );
}

/**
 * Skeleton circular/avatar placeholder.
 */
export function SkeletonAvatar({
  size = "h-12 w-12",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return <Skeleton className={`${size} rounded-full shrink-0 ${className}`} />;
}

/**
 * Skeleton badge/pill placeholder.
 */
export function SkeletonBadge({
  className = "h-6 w-16",
}: {
  className?: string;
}) {
  return <Skeleton className={`rounded-full ${className}`} />;
}

/**
 * Skeleton button placeholder.
 */
export function SkeletonButton({
  className = "h-10 w-24",
}: {
  className?: string;
}) {
  return <Skeleton className={`rounded-full ${className}`} />;
}

/**
 * Page container skeleton matching RKB section panels.
 */
export function PageSkeleton({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`px-4 py-10 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full ${className}`}
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-5">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 sm:w-64" />
            <Skeleton className="h-4 w-64 sm:w-96" />
          </div>
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
        <div className="mt-6">
          {children || <SkeletonText lines={4} className="mt-4" />}
        </div>
      </div>
    </main>
  );
}

/**
 * Reusable Card skeleton matching Ad and Service listings.
 */
export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between ${className}`}
      aria-busy="true"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonBadge className="h-5 w-20" />
          <SkeletonBadge className="h-5 w-16" />
        </div>
        <Skeleton className="h-6 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-48 w-full rounded-2xl sm:h-56" />
      </div>
      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
        <Skeleton className="h-9 w-24 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Reusable Table skeleton for Admin and Dashboard views.
 */
export function TableSkeleton({
  rows = 5,
  cols = 5,
  className = "",
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs ${className}`}
      aria-busy="true"
      aria-label="Loading table"
    >
      <div className="border-b border-neutral-200 bg-neutral-100 p-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded-md" />
        ))}
      </div>
      <div className="divide-y divide-neutral-100 p-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 p-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-4 flex-1 rounded-md ${
                  c === 0 ? "h-5 w-1/3" : c === cols - 1 ? "h-8 w-20 rounded-full" : ""
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Reusable Profile skeleton.
 */
export function ProfileSkeleton() {
  const fields = ["Name", "Email", "Phone", "Service Type", "Member Since"];
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading profile">
      <div className="flex items-center gap-4 border-b border-neutral-200 pb-5">
        <SkeletonAvatar size="h-16 w-16 sm:h-20 sm:w-20" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        {fields.map((label) => (
          <div key={label} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-2">
            <span className="text-xs font-bold text-neutral-700">{label}</span>
            <Skeleton className="h-5 w-40 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Navbar placeholder skeleton.
 */
export function NavbarSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-neutral-950 px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 rounded-full bg-white/20" />
          <Skeleton className="h-6 w-20 rounded-md bg-white/20" />
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <Skeleton className="h-8 w-16 rounded-full bg-white/20" />
          <Skeleton className="h-8 w-20 rounded-full bg-white/20" />
          <Skeleton className="h-8 w-20 rounded-full bg-white/20" />
        </div>
      </div>
    </header>
  );
}

/**
 * Dashboard skeleton with stats cards and table.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={4} cols={5} />
    </div>
  );
}

/**
 * Payment and Checkout skeleton.
 */
export function PaymentSkeleton() {
  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8 max-w-5xl mx-auto" aria-busy="true" aria-label="Loading payment">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
        <div className="flex flex-col items-center justify-center p-6 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4">
          <Skeleton className="h-56 w-56 sm:h-64 sm:w-64 rounded-2xl" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="space-y-3 max-w-md mx-auto">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      </div>
    </main>
  );
}

/**
 * Pricing / Packages grid skeleton.
 */
export function PackageSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      aria-busy="true"
      aria-label="Loading packages"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
          <SkeletonBadge className="h-5 w-16" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
          <SkeletonText lines={3} />
          <Skeleton className="h-10 w-full rounded-full mt-4" />
        </div>
      ))}
    </div>
  );
}

/**
 * Form skeleton for authentication, ad post, and settings.
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div
      className="space-y-4 max-w-md mx-auto w-full p-4 sm:p-6 rounded-3xl border border-neutral-200 bg-white shadow-xs"
      aria-busy="true"
      aria-label="Loading form"
    >
      <div className="space-y-2 text-center pb-2">
        <Skeleton className="h-7 w-40 mx-auto" />
        <Skeleton className="h-4 w-56 mx-auto" />
      </div>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-11 w-full rounded-full mt-2" />
    </div>
  );
}

/**
 * Stacked vertical list skeleton.
 */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4 flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-9 w-20 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Dialog / Popup Modal skeleton.
 */
export function ModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" aria-busy="true">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200 text-center space-y-4">
        <SkeletonAvatar size="h-14 w-14 mx-auto" />
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
        <div className="rounded-2xl bg-neutral-100 p-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
