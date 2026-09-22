"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { formatDisplayDateTime } from "@/lib/date";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";
import { ALL_SIDEBAR_SECTIONS } from "@/app/admin/admin-control/page";

type SubAdminRow = {
  _id: string;
  email: string;
  permissions: string[];
  lastLogin: string | null;
  createdAt: string;
};

const SECTION_LABEL_MAP = new Map(
  ALL_SIDEBAR_SECTIONS.map((s) => [s.key, s.label])
);

export default function SubAdminList() {
  const router = useRouter();
  const me = useAdminContext();
  const [admins, setAdmins] = useState<SubAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
    if (
      me &&
      me.authenticated &&
      me.role !== "main" &&
      !me.permissions?.includes("sub-admins")
    ) {
      router.replace("/admin");
      return;
    }
    if (
      me &&
      me.authenticated &&
      (me.role === "main" || me.permissions?.includes("sub-admins"))
    ) {
      queueMicrotask(() => load());
    }
  }, [me, router, load]);

  const filteredAdmins = useMemo(() => {
    if (!search.trim()) return admins;
    const q = search.toLowerCase().trim();
    return admins.filter((a) => {
      if (a.email.toLowerCase().includes(q)) return true;
      const labels = a.permissions.map((p) => (SECTION_LABEL_MAP.get(p) || p).toLowerCase());
      return labels.some((lbl) => lbl.includes(q));
    });
  }, [admins, search]);

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
        <Link
          href="/admin/admin-control"
          className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Add Sub Admin
        </Link>
      </div>
      <p className="mt-2 text-red-900">
        All sub-admins created by the main admin.
      </p>

      {admins.length > 0 && (
        <div className="mt-4 max-w-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sub-admins..."
            className="w-full rounded-[20px] border border-red-200 bg-white px-4 py-2 text-sm text-red-950 outline-none focus:border-red-400"
          />
        </div>
      )}

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
              {filteredAdmins.map((admin) => {
                const isAll = admin.permissions.length >= ALL_SIDEBAR_SECTIONS.length;
                const accessText = isAll
                  ? `All (${ALL_SIDEBAR_SECTIONS.length} sections)`
                  : admin.permissions.length === 0
                  ? "—"
                  : admin.permissions.map((p) => SECTION_LABEL_MAP.get(p) || p).join(", ");

                return (
                  <tr key={admin._id} className="border-t border-red-50 hover:bg-pink-50/20">
                    <td className="px-4 py-4 font-medium text-red-950">
                      {admin.email}
                    </td>
                    <td className="px-4 py-4 text-red-900 max-w-md">
                      {accessText}
                    </td>
                    <td className="px-4 py-4 text-red-900 whitespace-nowrap">
                      {admin.lastLogin ? formatDisplayDateTime(admin.lastLogin) : "Never"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/admin-control?edit=${encodeURIComponent(admin._id)}`}
                          className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(admin._id)}
                          className="rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
