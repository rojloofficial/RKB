"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { useAdminRefresh } from "@/components/admin/admin-context";

type NavItem = {
  name: string;
  href: string;
  key: string;
  icon: string;
  mainOnly?: boolean;
};

export const adminNavItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/admin",
    key: "dashboard",
    icon: "M3 12l9-9 9 9M5 10v10h14V10",
  },
  {
    name: "State",
    href: "/admin/state",
    key: "state",
    icon: "M3 21h18M3 10h18M3 3h18M3 17h18",
  },
  {
    name: "City List",
    href: "/admin/city",
    key: "city",
    icon: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6",
  },
  {
    name: "City SEO",
    href: "/admin/city-seo",
    key: "city-seo",
    icon: "M11 3H5a2 2 0 00-2 2v14a2 2 0 002 2h6M9 12h12M9 8h12M9 16h12M19 4v16",
  },
  {
    name: "Dynamic SEO",
    href: "/admin/dynamic-seo",
    key: "dynamic-seo",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    name: "Ads",
    href: "/admin/ads",
    key: "ads",
    icon: "M3 7h18M3 12h18M3 17h18",
  },
  {
    name: "Users",
    href: "/admin/users",
    key: "users",
    icon: "M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  },
  {
    name: "UPI",
    href: "/admin/upi",
    key: "upi",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z",
  },
  {
    name: "Coupon",
    href: "/admin/coupon",
    key: "coupon",
    icon: "M4 4h16v2H4V4zm0 7h16v2H4v-2zm0 7h16v2H4v-2z",
  },
  {
    name: "Payment Request",
    href: "/admin/payment-request",
    key: "payment-request",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  },
  {
    name: "Payment History",
    href: "/admin/payment-history",
    key: "payment-history",
    icon: "M11 7h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zM7 7h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4-8h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z",
  },
  {
    name: "Set Coins",
    href: "/admin/set-coins",
    key: "set-coins",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.48-.84-2.74-1.5-2.74-2.62 0-.92.73-1.54 1.77-1.54 1.69 0 2.25.74 2.68 1.74l1.51-.75C13.54 8 12.77 6.65 10.34 6.65c-1.65 0-3.55.89-3.55 2.72 0 1.54.84 2.17 2.73 3.09 1.81 1.02 2.73 1.5 2.73 2.62 0 1.08-.74 1.54-1.77 1.54-1.27 0-2.02-.74-2.44-1.81l-1.52.75c.54 1.61 1.74 2.67 3.96 2.67 1.99 0 3.55-1.03 3.55-2.72-.01-1.78-.86-2.54-3.13-3.44z",
  },
  {
    name: "Promotion Package",
    href: "/admin/promotion-packages",
    key: "promotion-packages",
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  },
  {
    name: "VIP",
    href: "/admin/vip",
    key: "vip",
    icon: "M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z",
    mainOnly: true,
  },
  {
    name: "Phone No. Control",
    href: "/admin/phone-control",
    key: "phone-control",
    icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  },
  {
    name: "404 Pages",
    href: "/admin/not-found",
    key: "not-found",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  {
    name: "Admin Control",
    href: "/admin/admin-control",
    key: "admin-control",
    icon: "M12 4v16m8-8H4",
    mainOnly: true,
  },
  {
    name: "Sub Admin List",
    href: "/admin/sub-admins",
    key: "sub-admins",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
    mainOnly: true,
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useAdminContext();
  const refresh = useAdminRefresh();

  if (pathname === "/admin/login") return null;

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    await refresh();
    router.push("/admin/login");
  }

  const visibleItems = adminNavItems.filter((item) => {
    if (!me || !me.authenticated) return false;
    if (item.mainOnly) return me.role === "main";
    if (me.role === "main") return true;
    return (me.permissions ?? []).includes(item.key);
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
          <div className="text-xl font-black text-white">Admin</div>
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
              item.href === "/admin"
                ? pathname === "/admin"
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
