"use client";

import Link from "next/link";
import { formatDisplayDate } from "@/lib/date";
import type { ProfileUser } from "./types";
import { ProfileSkeleton } from "@/components/skeletons/post-ad-skeletons";

export default function ProfileSection({
  profile,
  loading = false,
}: {
  profile: ProfileUser | null;
  loading?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-8 shadow-xl">
      {loading ? (
        <ProfileSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Name</span>
            <p className="mt-1.5 text-lg font-black text-white break-words">
              {profile?.name ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Email</span>
            <p className="mt-1.5 text-lg font-bold text-amber-400 font-mono break-all">
              {profile?.email ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Primary Service</span>
            <p className="mt-1.5 text-base font-bold text-slate-200">
              {profile?.service ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Member Since</span>
            <p className="mt-1.5 text-base font-bold text-slate-200">
              {profile?.createdAt ? formatDisplayDate(profile.createdAt) : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 sm:col-span-2 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Wallet Credits</span>
              <p className="mt-1 text-2xl font-black text-white">
                {profile?.coins ?? 0} <span className="text-amber-400 text-sm font-bold">Coins</span>
              </p>
            </div>
            <Link
              href="/post-ad/buy-coin"
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:opacity-95"
            >
              + Add Coins
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
