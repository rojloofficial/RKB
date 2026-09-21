import type { Metadata } from "next";
import { VipProvider } from "@/components/vip/vip-context";
import VipLayoutContent from "@/components/vip/vip-layout-content";

export const metadata: Metadata = {
  title: "VIP Portal | RKB",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function VipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VipProvider>
      <VipLayoutContent>{children}</VipLayoutContent>
    </VipProvider>
  );
}
