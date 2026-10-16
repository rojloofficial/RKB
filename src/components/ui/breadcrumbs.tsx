import Link from "next/link";
import { cn } from "@/lib/cn";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("mb-5 flex items-center text-xs font-medium text-slate-500", className)}
    >
      <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2" itemScope itemType="https://schema.org/BreadcrumbList">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li
              key={idx}
              className="flex items-center gap-1.5 sm:gap-2"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {idx > 0 && (
                <svg
                  className="h-3.5 w-3.5 text-slate-400 shrink-0 select-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
              {isLast || !item.href ? (
                <span
                  className="font-bold text-slate-900 truncate max-w-[180px] sm:max-w-[320px] bg-slate-100/80 px-2 py-0.5 rounded-md"
                  aria-current="page"
                  itemProp="name"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-amber-700 hover:bg-amber-50 px-2 py-0.5 rounded-md transition-colors"
                  itemProp="item"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              )}
              <meta itemProp="position" content={String(idx + 1)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
