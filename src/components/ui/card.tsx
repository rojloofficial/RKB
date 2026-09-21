import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-neutral-200/90 bg-white p-4 sm:p-6 shadow-xs transition hover:border-neutral-300",
        className
      )}
      {...props}
    />
  );
}

export function SectionPanel({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-6xl rounded-3xl border border-neutral-200/90 bg-white p-4 sm:p-6 md:p-8 lg:p-10 shadow-xs",
        className
      )}
      {...props}
    />
  );
}
