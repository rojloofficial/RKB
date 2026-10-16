import Link from "next/link";
import React, {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "solid" | "soft" | "outline" | "ghost" | "light" | "gradient" | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer";

const variants: Record<ButtonVariant, string> = {
  solid:
    "bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] shadow-sm hover:shadow border border-slate-800",
  gradient:
    "bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 active:scale-[0.98] shadow-md shadow-amber-500/25 border border-amber-400/30",
  soft:
    "border border-slate-200/80 bg-slate-100/80 text-slate-800 hover:bg-slate-200/70 hover:border-slate-300 active:scale-[0.98]",
  outline:
    "border border-slate-300/90 bg-white text-slate-800 hover:bg-slate-50/90 hover:border-slate-400 active:scale-[0.98] shadow-xs",
  ghost:
    "text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 active:scale-[0.98]",
  light:
    "bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 active:scale-[0.98] shadow-xs",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] shadow-sm shadow-rose-600/20 border border-rose-500",
};

const sizes: Record<ButtonSize, string> = {
  xs: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  sm: "px-4 py-2 text-xs sm:text-sm rounded-lg gap-2",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3.5 text-base rounded-xl gap-2.5 font-bold",
};

const activeClass =
  "bg-amber-600 text-white shadow-md shadow-amber-500/20 hover:bg-amber-700 border border-amber-500";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  active?: boolean;
  loading?: boolean;
  loadingText?: ReactNode;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function Button(props: ButtonProps) {
  const {
    variant = "solid",
    size = "md",
    fullWidth = false,
    active = false,
    loading = false,
    loadingText,
    className,
    children,
    disabled,
    ...rest
  } = props;

  const isDisabled = Boolean(disabled || loading);

  const classes = cn(
    base,
    active ? activeClass : variants[variant],
    sizes[size],
    fullWidth && "w-full",
    loading && "pointer-events-none opacity-75",
    className
  );

  const content = (
    <>
      {loading && <Spinner className="h-4 w-4 shrink-0" />}
      {loading && loadingText !== undefined ? loadingText : children}
    </>
  );

  if (props.href !== undefined) {
    const { href, onClick, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;

    return (
      <Link
        href={href!}
        className={cn(classes, isDisabled && "pointer-events-none opacity-50")}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : undefined}
        {...(onClick ? { onClick } : {})}
        {...anchorRest}
      >
        {content}
      </Link>
    );
  }

  const { onClick, ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...(onClick ? { onClick } : {})}
      {...buttonRest}
    >
      {content}
    </button>
  );
}
