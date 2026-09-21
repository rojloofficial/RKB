"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminStatSkeleton } from "@/components/skeletons/admin-skeletons";

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
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
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
  }, []);

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
    <main className="p-4 sm:p-6 lg:p-10 min-w-0">
      <h1 className="text-3xl font-black text-red-950">Dashboard</h1>
      <p className="mt-2 text-red-900">Overview of your platform and payment activity.</p>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-red-950">Platform Summary</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {baseCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-red-100 bg-white p-5 sm:p-6 shadow-sm transition hover:border-red-200"
            >
              <p className="text-sm font-medium text-red-900">{card.label}</p>
              <div className="mt-2 text-3xl sm:text-4xl font-black text-red-950 break-words">
                {loading ? <AdminStatSkeleton /> : card.value}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-red-950">Payment Summary</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paymentCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-red-100 bg-white p-5 sm:p-6 shadow-sm transition hover:border-red-200"
            >
              <p className="text-sm font-medium text-red-900">{card.label}</p>
              <div className="mt-3 text-2xl sm:text-3xl font-black text-red-950 break-words">
                {loading ? <AdminStatSkeleton /> : card.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
