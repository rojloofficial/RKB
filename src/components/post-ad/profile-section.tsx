"use client";

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
    <section className="rounded-[1.75rem] bg-white p-5 sm:p-8">
      {loading ? (
        <ProfileSkeleton />
      ) : (
        <div className="mt-6 space-y-4">
        <div className="rounded-2xl bg-neutral-100 p-4">
          <p className="text-sm font-semibold text-neutral-500">Name</p>
          <p className="mt-1 font-semibold text-neutral-900 break-words">
            {profile?.name ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-neutral-100 p-4">
          <p className="text-sm font-semibold text-neutral-500">Email</p>
          <p className="mt-1 font-semibold text-neutral-900 break-all">
            {profile?.email ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-neutral-100 p-4">
          <p className="text-sm font-semibold text-neutral-500">Service</p>
          <p className="mt-1 font-semibold text-neutral-900">
            {profile?.service ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-neutral-100 p-4">
          <p className="text-sm font-semibold text-neutral-500">Member Since</p>
          <p className="mt-1 font-semibold text-neutral-900">
            {profile?.createdAt ? formatDisplayDate(profile.createdAt) : "—"}
          </p>
        </div>
      </div>
      )}
    </section>
  );
}
