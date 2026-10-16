"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import ProfileSection from "./profile-section";
import { useAuthGuard } from "./use-auth-guard";
import { useAuth } from "@/lib/auth-context";

export default function ProfileView() {
  const router = useRouter();
  const ready = useAuthGuard();
  const { user, isLoading } = useAuth();

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionPanel className="p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              User Profile
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Your registered credentials, account tier, and marketplace history.
            </p>
          </div>
          <Button
            variant="soft"
            size="sm"
            onClick={() => router.push("/post-ad")}
            className="border border-white/10 text-slate-300 hover:text-white"
          >
            Back to Hub
          </Button>
        </div>

        <div className="mt-6">
          <ProfileSection profile={user} loading={isLoading} />
        </div>
      </SectionPanel>
    </main>
  );
}
