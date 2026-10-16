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
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 shadow-inner">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <span>Sub Admin List</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            All delegated sub-administrators and their assigned permission scopes.
          </p>
        </div>
        <Link
          href="/admin/admin-control"
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition active:scale-[0.98]"
        >
          + Add Sub Admin
        </Link>
      </div>

      {admins.length > 0 && (
        <div className="mt-6 max-w-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sub-admins..."
            className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
          />
        </div>
      )}

      {loading ? (
        <div className="mt-6">
          <AdminTableSkeleton
            headers={["Email", "Access", "Last Login", "Actions"]}
            minWidth="min-w-[550px]"
          />
        </div>
      ) : admins.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
          No sub-admins found.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[550px] text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 border-b border-white/10 text-xs uppercase font-bold text-amber-400">
                <tr>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Access</th>
                  <th className="px-5 py-3.5">Last Login</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAdmins.map((admin) => {
                  const isAll = admin.permissions.length >= ALL_SIDEBAR_SECTIONS.length;
                  const accessText = isAll
                    ? `All (${ALL_SIDEBAR_SECTIONS.length} sections)`
                    : admin.permissions.length === 0
                    ? "—"
                    : admin.permissions.map((p) => SECTION_LABEL_MAP.get(p) || p).join(", ");

                  return (
                    <tr key={admin._id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4 font-bold text-white">
                        {admin.email}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-300 max-w-md leading-relaxed">
                        {accessText}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                        {admin.lastLogin ? formatDisplayDateTime(admin.lastLogin) : "Never"}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/admin-control?edit=${encodeURIComponent(admin._id)}`}
                            className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => remove(admin._id)}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 transition"
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
        </div>
      )}
    </main>
  );
}
