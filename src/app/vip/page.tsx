"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useVipContext } from "@/components/vip/use-vip-context";
import { AdminStatSkeleton } from "@/components/skeletons/admin-skeletons";
import { formatDisplayDateTime } from "@/lib/date";

type VipStats = {
  statesCount: number;
  citiesCount: number;
  usersCount: number;
  adsCount: number;
  hasStateAccess: boolean;
  assignments: Array<{
    _id?: string;
    type?: "city" | "state";
    stateName?: string;
    cityName?: string;
    status: string;
    assignedAt: string;
    expiresAt: string;
  }>;
};

export default function VipDashboard() {
  const me = useVipContext();
  const [stats, setStats] = useState<VipStats>({
    statesCount: 0,
    citiesCount: 0,
    usersCount: 0,
    adsCount: 0,
    hasStateAccess: false,
    assignments: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (me && !me.authenticated) {
      if (typeof window !== "undefined") {
        window.location.replace("/vip/login");
      }
    }
  }, [me]);

  useEffect(() => {
    if (!me || !me.authenticated) return;

    fetch("/api/vip/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setStats({
          statesCount: data.statesCount ?? 0,
          citiesCount: data.citiesCount ?? 0,
          usersCount: data.usersCount ?? 0,
          adsCount: data.adsCount ?? 0,
          hasStateAccess: Boolean(data.hasStateAccess),
          assignments: Array.isArray(data.assignments) ? data.assignments : [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [me]);

  if (!me || !me.authenticated) return null;

  const statCards = [
    {
      label: "States",
      value: stats.statesCount,
      href: stats.hasStateAccess ? "/vip/state" : undefined,
      description: stats.hasStateAccess ? "Assigned states" : "City access only",
      enabled: stats.hasStateAccess,
    },
    {
      label: "Cities",
      value: stats.citiesCount,
      href: "/vip/city",
      description: "Accessible cities",
      enabled: true,
    },
    {
      label: "Users",
      value: stats.usersCount,
      href: "/vip/users",
      description: "Users in your areas",
      enabled: true,
    },
    {
      label: "Ads",
      value: stats.adsCount,
      href: "/vip/ads",
      description: "Ads in your areas",
      enabled: true,
    },
  ];

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            VIP <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Dashboard</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Welcome, <span className="font-semibold text-white">{me.email}</span>. Here is the overview of your assigned jurisdiction.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-3.5 py-1.5 text-xs font-bold text-amber-300 self-start sm:self-auto">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          VIP Control Active
        </div>
      </div>

      {/* 4 Stats Cards (City, State, User, Ads) */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card) => {
          const cardContent = (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md transition-all hover:border-amber-500/40 hover:bg-slate-900/90 hover:scale-[1.02]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {card.label}
              </span>
              <div className="mt-2 text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                {loading ? <AdminStatSkeleton /> : card.value}
              </div>
              <p className="mt-1 text-xs text-slate-400">{card.description}</p>
            </div>
          );

          if (card.href) {
            return (
              <Link key={card.label} href={card.href}>
                {cardContent}
              </Link>
            );
          }

          return <div key={card.label}>{cardContent}</div>;
        })}
      </div>

      {/* Access Scope Summary */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400">Your Assigned Access</h2>
        <p className="mt-1 text-xs text-slate-400">
          You have read-only viewing permissions for the following jurisdiction.
        </p>

        {stats.assignments.length === 0 ? (
          <p className="mt-4 text-xs sm:text-sm text-slate-300">
            {stats.hasStateAccess
              ? "All areas accessible under admin privileges."
              : "No specific assignment details found."}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {stats.assignments.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/50 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {item.type === "state" ? "State" : "City"}:
                    </span>
                    <span className="text-sm font-black text-white">
                      {item.stateName || item.cityName}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Expires: {formatDisplayDateTime(item.expiresAt)}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-xs font-bold text-emerald-300">
                  Active
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="mt-6 flex flex-wrap gap-3">
        {stats.hasStateAccess && (
          <Link
            href="/vip/state"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            View States &rarr;
          </Link>
        )}
        <Link
          href="/vip/city"
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
        >
          View Cities &rarr;
        </Link>
        <Link
          href="/vip/users"
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
        >
          View Users &rarr;
        </Link>
        <Link
          href="/vip/ads"
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition"
        >
          View Ads &rarr;
        </Link>
      </div>
    </main>
  );
}
