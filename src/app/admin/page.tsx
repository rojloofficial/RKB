"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminStatSkeleton } from "@/components/skeletons/admin-skeletons";
import { useAdminContext } from "@/components/admin/use-admin-context";

type Stats = {
  users: number;
  ads: number;
  cities: number;
  states: number;
  subAdmins: number;
  upiTotal: number;
  activeCoupons: number;
  pendingPayments: number;
  confirmedPayments: number;
  declinedPayments: number;
  totalAmountAfterDiscount: number;
  totalCoinsSold: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const me = useAdminContext();
  const [stats, setStats] = useState<Stats>({
    users: 0,
    ads: 0,
    cities: 0,
    states: 0,
    subAdmins: 0,
    upiTotal: 0,
    activeCoupons: 0,
    pendingPayments: 0,
    confirmedPayments: 0,
    declinedPayments: 0,
    totalAmountAfterDiscount: 0,
    totalCoinsSold: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }

    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) {
          router.replace("/admin/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setStats({
          users: data.users ?? 0,
          ads: data.ads ?? 0,
          cities: data.cities ?? 0,
          states: data.states ?? 0,
          subAdmins: data.subAdmins ?? 0,
          upiTotal: data.upiTotal ?? 0,
          activeCoupons: data.activeCoupons ?? 0,
          pendingPayments: data.pendingPayments ?? 0,
          confirmedPayments: data.confirmedPayments ?? 0,
          declinedPayments: data.declinedPayments ?? 0,
          totalAmountAfterDiscount: data.totalAmountAfterDiscount ?? 0,
          totalCoinsSold: data.totalCoinsSold ?? 0,
        });
      })
      .catch(() => {
        setStats({
          users: 0,
          ads: 0,
          cities: 0,
          states: 0,
          subAdmins: 0,
          upiTotal: 0,
          activeCoupons: 0,
          pendingPayments: 0,
          confirmedPayments: 0,
          declinedPayments: 0,
          totalAmountAfterDiscount: 0,
          totalCoinsSold: 0,
        });
      })
      .finally(() => setLoading(false));
  }, [me, router]);

  const baseCards = [
    { label: "Users", value: stats.users, href: "/admin/users" },
    { label: "Ads", value: stats.ads, href: "/admin/ads" },
    { label: "States", value: stats.states, href: "/admin/state" },
    { label: "Cities", value: stats.cities, href: "/admin/city" },
    { label: "Sub Admins", value: stats.subAdmins, href: "/admin/sub-admins" },
  ];

  const paymentCards = [
    { label: "Total UPI IDs", value: stats.upiTotal },
    { label: "Active Coupons", value: stats.activeCoupons },
    { label: "Payment Pending", value: stats.pendingPayments },
    { label: "Confirmed", value: stats.confirmedPayments },
    { label: "Declined", value: stats.declinedPayments },
    { label: "Total Amount", value: `₹${stats.totalAmountAfterDiscount}` },
    { label: "Total Coins Sold", value: stats.totalCoinsSold },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Dashboard</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Real-time overview of your platform listings, jurisdiction, and payment activity.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            System Live
          </span>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <span>Platform Directory</span>
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {baseCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md transition-all hover:border-amber-500/40 hover:bg-slate-900/90 hover:scale-[1.02]"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
              <div className="mt-2 text-3xl sm:text-4xl font-black text-white break-words">
                {loading ? <AdminStatSkeleton /> : card.value}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <span>Financials &amp; Payments</span>
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paymentCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md transition-all hover:border-amber-500/30"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
              <div className="mt-3 text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 break-words">
                {loading ? <AdminStatSkeleton /> : card.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
