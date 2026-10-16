"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./admin-sidebar";
import { useAdminContext } from "./use-admin-context";

interface AdminLayoutContentProps {
  children: React.ReactNode;
}

export default function AdminLayoutContent({ children }: AdminLayoutContentProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const me = useAdminContext();

  // Hide sidebar and header on login page
  const isLoginPage = pathname === "/admin/login";
  const isAuthenticated = me?.authenticated;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Desktop Sidebar - visible on md+ screens and when authenticated */}
      {!isLoginPage && isAuthenticated && (
        <div className="hidden md:flex">
          <Sidebar isOpen={true} />
        </div>
      )}

      {/* Mobile Sidebar - togglable on smaller screens and when authenticated */}
      {!isLoginPage && isAuthenticated && (
        <div className="md:hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        {/* Mobile Header with Hamburger - only show when authenticated and not on login page */}
        {!isLoginPage && isAuthenticated && (
          <header className="md:hidden flex items-center justify-between h-16 bg-slate-900/90 backdrop-blur-md text-white px-4 border-b border-white/10 z-20">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-white">RKB</span>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-md px-2 py-0.5">
                Admin Panel
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
              aria-label="Toggle menu"
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
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </header>
        )}

        {/* Page Content */}
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">{children}</div>
      </div>
    </div>
  );
}
