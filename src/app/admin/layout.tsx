import type { Metadata } from "next";
import { AdminProvider } from "@/components/admin/admin-context";
import AdminLayoutContent from "@/components/admin/admin-layout-content";

export const metadata: Metadata = {
  title: "Admin | RKB",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminProvider>
  );
}
