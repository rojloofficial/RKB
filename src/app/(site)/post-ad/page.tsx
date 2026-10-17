"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useAuthGuard } from "@/components/post-ad/use-auth-guard";
import { useAuth } from "@/lib/auth-context";

const dashboardLinks = [
  {
    href: "/post-ad/your-ads",
    title: "Your Ads",
    desc: "Manage, edit, suspend, or promote your active and saved listings.",
    icon: "📋",
    badge: "Manage",
  },
  {
    href: "/post-ad/new",
    title: "Post New Ad",
    desc: "Publish a new verified service advertisement in any Indian city.",
    icon: "✨",
    badge: "Create",
  },
  {
    href: "/post-ad/buy-coin",
    title: "Buy Coins",
    desc: "Purchase credit packs to promote your ads to top search positions.",
    icon: "🪙",
    badge: "Top-up",
  },
  {
    href: "/post-ad/payment-history",
    title: "Payment History",
    desc: "Track transaction IDs, approval statuses, and coin invoices.",
    icon: "🧾",
    badge: "Records",
  },
  {
    href: "/post-ad/profile",
    title: "Account Profile",
    desc: "View your registration details, primary service, and join date.",
    icon: "👤",
    badge: "Settings",
  },
];

export default function Dashboard() {
  const router = useRouter();
  const ready = useAuthGuard();
  const { user } = useAuth();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  };

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionPanel className="p-6 sm:p-8 lg:p-10">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <Eyebrow>Account Hub</Eyebrow>
            <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl lg:text-4xl">
              Welcome back, <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">{user?.name || "Member"}</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-900 font-medium">
              Manage your service ads, recharge credits, and monitor inquiries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Wallet pill */}
            <div className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs sm:text-sm font-bold text-amber-950">
              <span>🪙</span>
              <span>{user?.coins ?? 0} Coins</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-xs sm:text-sm font-bold text-slate-900 transition hover:bg-red-50 hover:border-red-300 hover:text-red-700 cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardLinks.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-xl border border-slate-200">
                    {c.icon}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-900">
                    {c.badge}
                  </span>
                </div>

                <h2 className="mt-4 text-lg font-bold text-slate-900">
                  {c.title}
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-900 font-normal">
                  {c.desc}
                </p>
              </div>

              <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-amber-600">
                <span>Access Feature</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </SectionPanel>
    </main>
  );
}
