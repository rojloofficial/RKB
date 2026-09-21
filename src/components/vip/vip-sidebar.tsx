"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useVipContext } from "./use-vip-context";
import { useVipRefresh } from "./vip-context";

type NavItem = {
  name: string;
  href: string;
  key: string;
  icon: string;
  stateOnly?: boolean;
};

export const vipNavItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/vip",
    key: "dashboard",
    icon: "M3 12l9-9 9 9M5 10v10h14V10",
  },
  {
    name: "State",
    href: "/vip/state",
    key: "state",
    icon: "M3 21h18M3 10h18M3 3h18M3 17h18",
    stateOnly: true,
  },
  {
    name: "City",
    href: "/vip/city",
    key: "city",
    icon: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6",
  },
  {
    name: "Users",
    href: "/vip/users",
    key: "users",
    icon: "M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  },
  {
    name: "Ads",
    href: "/vip/ads",
    key: "ads",
    icon: "M3 7h18M3 12h18M3 17h18",
  },
  {
    name: "Phone No. Control",
    href: "/vip/phone-control",
    key: "phone-control",
    icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  },
];

interface VipSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function VipSidebar({ isOpen = true, onClose }: VipSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useVipContext();
  const refresh = useVipRefresh();

  if (pathname === "/vip/login" || pathname.startsWith("/vip/create-password")) {
    return null;
  }

  async function handleLogout() {
    await fetch("/api/vip/logout", { method: "POST" }).catch(() => {});
    try {
      localStorage.removeItem("rojlo_vip_me");
    } catch {}
    await refresh();
    router.replace("/vip/login");
  }

  const visibleItems = vipNavItems.filter((item) => {
    if (item.stateOnly) {
      return me?.hasStateAccess === true || me?.role === "admin";
    }
    return true;
  });

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-60 flex-none flex-col border-r border-neutral-800 bg-neutral-950 text-white transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <div className="text-xl font-black text-white">VIP Panel</div>
            <div className="text-xs text-neutral-400 truncate max-w-[170px]">
              {me?.email ?? "VIP Member"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-3 overflow-y-auto scrollbar-hide">
          {visibleItems.map((item) => {
            const active =
              item.href === "/vip"
                ? pathname === "/vip"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-neutral-800 text-white font-semibold"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }`}
              >
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
                >
                  <path d={item.icon} />
                </svg>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-neutral-800 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
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
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
