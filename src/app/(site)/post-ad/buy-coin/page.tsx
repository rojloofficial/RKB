"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import BuyCoinSection from "@/components/post-ad/buy-coin-section";
import { useAuthGuard } from "@/components/post-ad/use-auth-guard";

export default function Page() {
  const router = useRouter();
  const ready = useAuthGuard();

  if (!ready) return null;

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <div className="mb-6 flex items-center justify-end gap-4">
          <Button
            variant="soft"
            onClick={() => router.push("/post-ad")}
            className="!text-black"
          >
            Back
          </Button>
        </div>

        <div className="mt-2">
          <BuyCoinSection />
        </div>
      </SectionPanel>
    </main>
  );
}
