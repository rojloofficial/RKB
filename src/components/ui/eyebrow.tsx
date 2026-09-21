import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-neutral-500",
        className
      )}
      {...props}
    />
  );
}
