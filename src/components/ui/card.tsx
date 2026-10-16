import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "muted" | "glass" | "dark";
  hoverable?: boolean;
}

export function Card({
  className,
  variant = "default",
  hoverable = false,
  ...props
}: CardProps) {
  const variantStyles = {
    default: "border border-slate-200/90 bg-white shadow-xs",
    elevated: "border border-slate-200 bg-white shadow-md shadow-slate-900/5",
    muted: "border border-slate-200/70 bg-slate-50/80 shadow-2xs",
    glass: "glass-panel shadow-sm",
    dark: "border border-slate-800 bg-slate-900 text-white shadow-lg",
  };

  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl p-5 sm:p-6 transition-all duration-200",
        variantStyles[variant],
        hoverable && "hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5",
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
        "mx-auto w-full max-w-6xl rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-8 md:p-10 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "brand" | "emerald" | "amber" | "rose" | "indigo" | "outline";
}) {
  const badgeVariants = {
    default: "bg-slate-100 text-slate-700 border-slate-200/90",
    brand: "bg-amber-50 text-amber-800 border-amber-200/80 font-bold",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium",
    amber: "bg-amber-50 text-amber-700 border-amber-200/80 font-medium",
    rose: "bg-rose-50 text-rose-700 border-rose-200/80 font-medium",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/80 font-medium",
    outline: "bg-transparent text-slate-700 border-slate-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
