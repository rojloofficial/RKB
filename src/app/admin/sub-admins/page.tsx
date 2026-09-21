"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { formatDisplayDateTime } from "@/lib/date";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";

type SubAdminRow = {
  _id: string;
  email: string;
  permissions: string[];
  lastLogin: string | null;
  createdAt: string;
};

export default function SubAdminList() {
  const router = useRouter();
  const me = useAdminContext();
  const [admins, setAdmins] = useState<SubAdminRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subadmins", { credentials: "include" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setAdmins(data.admins ?? []);
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (me && me.authenticated && me.role !== "main") {
      router.replace("/admin");
      return;
    }
    if (me && me.authenticated && me.role === "main") {
      queueMicrotask(() => load());
    }
  }, [me, router, load]);

  if (!me || !me.authenticated) return null;

  async function remove(id: string) {
    if (!confirm("Delete this sub-admin?")) return;
    try {
      const res = await fetch("/api/admin/subadmins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete sub-admin.");
        return;
      }
      void load();
    } catch {
      alert("Network error. Please try again.");
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-red-950">Sub Admin List</h1>
        <button
          type="button"
          onClick={() => router.push("/admin/admin-control")}
          className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Add Sub Admin
        </button>
      </div>
      <p className="mt-2 text-red-900">
        All sub-admins created by the main admin.
      </p>

      {loading ? (
        <AdminTableSkeleton
          headers={["Email", "Access", "Last Login", "Actions"]}
          minWidth="min-w-[550px]"
        />
      ) : admins.length === 0 ? (
        <p className="mt-6 text-red-900">No sub-admins found.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-red-100 bg-white">
          <table className="w-full min-w-[550px] text-left text-sm">
            <thead className="bg-pink-50 text-red-950">
              <tr>
                <th className="px-4 py-4 font-semibold">Email</th>
                <th className="px-4 py-4 font-semibold">Access</th>
                <th className="px-4 py-4 font-semibold">Last Login</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin._id} className="border-t border-red-50">
                  <td className="px-4 py-4 font-medium text-red-950">
                    {admin.email}
                  </td>
                  <td className="px-4 py-4 text-red-900">
                    {admin.permissions.length === 0
                      ? "—"
                      : admin.permissions.join(", ")}
                  </td>
                  <td className="px-4 py-4 text-red-900">
                    {admin.lastLogin ? formatDisplayDateTime(admin.lastLogin) : "Never"}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => remove(admin._id)}
                      className="rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
