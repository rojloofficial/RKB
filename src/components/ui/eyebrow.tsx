import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-800 shadow-2xs",
        className
      )}
      {...props}
    />
  );
}
