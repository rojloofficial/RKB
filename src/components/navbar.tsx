"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navLinks } from "@/lib/nav";
import { useAuth } from "@/lib/auth-context";

function ProfileIcon({ name }: { name?: string }) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase();
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-black text-white">
      {initial || <PersonIcon />}
    </span>
  );
}

function PersonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, refreshAuth, isLoading } = useAuth();

  const isLoggedIn = Boolean(user);

  useEffect(() => {
    if (isLoading || !isLoggedIn) return;

    let lastRefresh = Date.now();
    const refresh = (force = false) => {
      const now = Date.now();
      if (!force && now - lastRefresh < 60_000) return;
      lastRefresh = now;
      void refreshAuth();
    };
    const handleCoinsUpdated = () => refresh(true);

    const intervalId = window.setInterval(() => refresh(false), 60000);
    const handleFocus = () => refresh(false);
    const handleVisibility = () => {
      if (!document.hidden) refresh(false);
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "rojlo_coin_update" || e.key === "rojlo_auth_user") {
        refresh(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("coins:updated", handleCoinsUpdated);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("coins:updated", handleCoinsUpdated);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isLoading, isLoggedIn, refreshAuth]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-neutral-950 text-white shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 sm:gap-4 md:gap-6 px-3 sm:px-4 py-2.5 sm:py-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xl font-black text-white shrink-0 hover:opacity-90 transition"
        >
          <Image
            src="/rojlo.png"
            alt="RKB Logo"
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover shadow-sm ring-1 ring-white/20"
            priority
          />
          <span className="tracking-tight">RKB</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1.5 md:gap-3 sm:flex">
          {isLoggedIn && (
            <Link
              href="/post-ad/buy-coin"
              className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 md:px-3 md:py-1.5 text-xs md:text-sm font-bold text-white shadow-sm transition-colors hover:bg-neutral-800 shrink-0"
            >
              <span aria-hidden="true">🪙</span>
              <span>{Number(user?.coins ?? 0)}</span>
            </Link>
          )}

          {navLinks.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-2.5 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium transition-colors shrink-0 ${
                  active
                    ? "bg-neutral-800 text-white font-semibold"
                    : "text-neutral-300 hover:bg-neutral-850 hover:text-white hover:bg-neutral-800"
                }`}
              >
                {link.name}
              </Link>
            );
          })}

          {isLoggedIn ? (
            <Link
              href="/post-ad"
              aria-label="Profile"
              className="flex items-center gap-2 rounded-full bg-neutral-800 px-2 py-1 md:px-2.5 md:py-1.5 text-xs md:text-sm font-bold text-white transition-colors hover:bg-neutral-700 shrink-0"
            >
              <ProfileIcon name={user?.name} />
              <span className="hidden lg:inline">{user?.name}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-white px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-extrabold !text-black shadow-sm transition-colors hover:bg-neutral-200 shrink-0"
            >
              Login
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:hidden">
          {isLoggedIn && (
            <Link
              href="/post-ad/buy-coin"
              className="flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition-colors hover:bg-neutral-800"
            >
              <span aria-hidden="true">🪙</span>
              <span>{Number(user?.coins ?? 0)}</span>
            </Link>
          )}

          {isLoggedIn ? (
            <Link
              href="/post-ad"
              aria-label="Profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-white transition-colors hover:bg-neutral-700"
            >
              <ProfileIcon name={user?.name} />
            </Link>
          ) : (
            <Link
              href="/login"
              aria-label="Login"
              className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold !text-black transition-colors hover:bg-neutral-200"
            >
              Login
            </Link>
          )}

          <button
            type="button"
            aria-label="Toggle menu"
            className="rounded-full p-2 text-white hover:bg-neutral-800 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="absolute left-0 right-0 top-full z-50 flex flex-col gap-1 border-b border-neutral-800 bg-neutral-950 px-4 py-3 shadow-xl sm:hidden">
          {navLinks.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-neutral-800 text-white font-semibold"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
