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
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-red-950 sm:text-4xl">
            Profile
          </h1>
          <Button
            variant="soft"
            onClick={() => router.push("/post-ad")}
            className="!text-black"
          >
            Back
          </Button>
        </div>

        <div className="mt-6">
          <ProfileSection profile={user} loading={isLoading} />
        </div>
      </SectionPanel>
    </main>
  );
}
