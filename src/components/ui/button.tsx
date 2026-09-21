import Link from "next/link";
import React, {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type Variant = "solid" | "soft" | "outline" | "ghost" | "light";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed select-none";

const variants: Record<Variant, string> = {
  solid: "bg-black text-white hover:bg-neutral-800 active:scale-[0.98] shadow-sm",
  soft: "border border-neutral-300 bg-neutral-100 text-neutral-900 hover:bg-neutral-200 active:scale-[0.98]",
  outline: "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 active:scale-[0.98]",
  ghost: "text-neutral-900 hover:bg-neutral-100 active:scale-[0.98]",
  light: "bg-white text-neutral-900 hover:bg-neutral-100 border border-neutral-200 active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-6 py-3 text-base",
};

const activeClass =
  "bg-black text-white shadow-sm hover:bg-neutral-800";

type CommonProps = {
  variant?: Variant;
  size?: Size;
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
    loading && "pointer-events-none opacity-70",
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
        className={cn(classes, isDisabled && "pointer-events-none opacity-60")}
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
