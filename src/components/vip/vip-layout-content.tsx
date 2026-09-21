"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import VipSidebar from "./vip-sidebar";
import { useVipContext } from "./use-vip-context";

interface VipLayoutContentProps {
  children: React.ReactNode;
}

export default function VipLayoutContent({ children }: VipLayoutContentProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const me = useVipContext();

  const isAuthPage =
    pathname === "/vip/login" || pathname.startsWith("/vip/create-password");
  const isAuthenticated = me?.authenticated;

  if (isAuthPage) {
    return <div className="min-h-screen bg-pink-50 text-red-950">{children}</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 text-neutral-900">
      {/* Desktop Sidebar - visible on md+ screens when authenticated */}
      {isAuthenticated && (
        <div className="hidden md:flex">
          <VipSidebar isOpen={true} />
        </div>
      )}

      {/* Mobile Sidebar */}
      {isAuthenticated && (
        <div className="md:hidden">
          <VipSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header with Hamburger */}
        {isAuthenticated && (
          <header className="md:hidden flex items-center justify-between h-16 bg-neutral-950 text-white px-4 border-b border-neutral-800 z-20">
            <div className="text-lg font-bold">VIP Panel</div>
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
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
