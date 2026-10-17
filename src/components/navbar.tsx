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
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-xs font-black text-white shadow-xs">
      {initial || <PersonIcon />}
    </span>
  );
}

function PersonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
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
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/90 text-white backdrop-blur-md shadow-lg shadow-black/10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand Logo & Name */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xl font-extrabold text-white shrink-0 hover:opacity-95 transition-opacity group"
        >
          <div className="relative">
            <Image
              src="/rojlo.png"
              alt="RKB Logo"
              width={38}
              height={38}
              className="h-9 w-9 rounded-full object-cover shadow-md ring-2 ring-amber-500/30 group-hover:ring-amber-500/70 transition-all"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="tracking-tight font-black text-lg bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
              RKB
            </span>
            <span className="text-[10px] tracking-widest uppercase font-bold text-amber-400 -mt-1 hidden sm:block">
              City Classifieds
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="ml-auto hidden items-center gap-2 lg:gap-3 sm:flex">
          {navLinks.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-xs md:text-sm font-medium transition-all ${
                  active
                    ? "bg-slate-800/90 text-amber-400 font-semibold shadow-xs"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            );
          })}

          {/* User Coin Balance Pill */}
          {isLoggedIn && (
            <Link
              href="/post-ad/buy-coin"
              className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 text-xs font-bold text-amber-300 shadow-xs transition-all hover:bg-amber-900/40 hover:border-amber-400"
            >
              <span className="text-sm">🪙</span>
              <span>{Number(user?.coins ?? 0)}</span>
            </Link>
          )}

          {/* User Profile or Login CTA */}
          {isLoggedIn ? (
            <Link
              href="/post-ad"
              aria-label="Profile"
              className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900 px-3 py-1 text-xs md:text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:border-slate-600"
            >
              <ProfileIcon name={user?.name} />
              <span className="hidden md:inline max-w-[120px] truncate">{user?.name || "Dashboard"}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-xs md:text-sm font-bold text-white shadow-md shadow-orange-600/20 transition-all hover:from-amber-600 hover:to-orange-700 active:scale-95"
            >
              Login
            </Link>
          )}
        </nav>

        {/* Mobile Viewport Header Controls */}
        <div className="ml-auto flex items-center gap-2 sm:hidden">
          {isLoggedIn && (
            <Link
              href="/post-ad/buy-coin"
              className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-950/40 px-2.5 py-1 text-xs font-bold text-amber-300"
            >
              <span>🪙</span>
              <span>{Number(user?.coins ?? 0)}</span>
            </Link>
          )}

          {isLoggedIn ? (
            <Link
              href="/post-ad"
              aria-label="Profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white"
            >
              <ProfileIcon name={user?.name} />
            </Link>
          ) : (
            <Link
              href="/login"
              aria-label="Login"
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
            >
              Login
            </Link>
          )}

          <button
            type="button"
            aria-label="Toggle menu"
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <nav className="absolute left-0 right-0 top-full z-50 flex flex-col gap-1.5 border-b border-slate-800 bg-slate-950/98 px-4 py-4 shadow-2xl backdrop-blur-xl sm:hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {navLinks.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-slate-800 text-amber-400"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <span>{link.name}</span>
                <span className="text-slate-500">→</span>
              </Link>
            );
          })}

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-col gap-2">
            <Link
              href="/post-ad/new"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-orange-600/20"
            >
              <span>+ Post a New Ad</span>
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
