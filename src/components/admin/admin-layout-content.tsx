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
    <div className="flex h-screen overflow-hidden bg-neutral-50 text-neutral-900">
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header with Hamburger - only show when authenticated and not on login page */}
        {!isLoginPage && isAuthenticated && (
          <header className="md:hidden flex items-center justify-between h-16 bg-neutral-950 text-white px-4 border-b border-neutral-800 z-20">
            <div className="text-lg font-bold">Admin Panel</div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
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
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}
