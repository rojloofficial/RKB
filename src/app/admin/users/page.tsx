"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { formatDisplayDateTime } from "@/lib/date";

type User = {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  coins?: number;
  adCount?: number;
  lastLogin?: string | Date;
  createdAt: string | Date;
};

export default function AdminUsers() {
  const router = useRouter();
  const me = useAdminContext();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadData() {
    try {
      setDownloading(true);
      const res = await fetch("/api/admin/users/export", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to export user data");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().split("T")[0];
      a.download = `rojlo-users-${today}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download user data:", err);
      alert("Failed to download user data. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        cache: "no-store",
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }
    queueMicrotask(() => {
      void load(false);
    });
  }, [load, me, router]);

  async function remove(id?: string) {
    if (!id || deletingId) return;
    if (!confirm("Delete this user?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u._id !== id));
      } else {
        alert("Failed to delete user. Please try again.");
      }
      void load(true);
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert("Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Users <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Directory</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            View registered user profiles, account balances, and activity.
          </p>
        </div>
        <button
          type="button"
          disabled={downloading}
          onClick={handleDownloadData}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold px-4 py-2.5 text-xs sm:text-sm shadow-md transition disabled:opacity-50 cursor-pointer active:scale-[0.98]"
        >
          {downloading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export Data (JSON)</span>
            </>
          )}
        </button>
      </div>

      {loading ? (
        <AdminTableSkeleton
          headers={["Name", "Email", "Phone", "Coins", "Last Login", "Actions", "Ads"]}
          minWidth="min-w-[700px]"
        />
      ) : users.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center">
          <p className="text-sm font-semibold text-slate-400">No registered users found.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-md">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-800/80 text-amber-400 font-bold uppercase tracking-wider text-xs border-b border-white/10">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Name</th>
                <th className="px-4 py-3.5 font-semibold">Email</th>
                <th className="px-4 py-3.5 font-semibold">Phone</th>
                <th className="px-4 py-3.5 font-semibold">Coins</th>
                <th className="px-4 py-3.5 font-semibold">Last Login</th>
                <th className="px-4 py-3.5 font-semibold">Actions</th>
                <th className="px-4 py-3.5 text-right font-semibold">Ads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-white">
                    {user.name}
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">{user.email}</td>
                  <td className="px-4 py-3.5 text-slate-400">
                    {user.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                      🪙 {Number(user.coins ?? 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                    {user.lastLogin ? formatDisplayDateTime(user.lastLogin) : "Never"}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      disabled={deletingId === user._id}
                      onClick={() => remove(user._id)}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-300 transition inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {deletingId === user._id && (
                        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      <span>{deletingId === user._id ? "Deleting..." : "Delete"}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="inline-flex items-center rounded-full bg-slate-800 border border-white/10 px-2.5 py-0.5 text-xs font-bold text-slate-300">
                      {user.adCount ?? 0} ads
                    </span>
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
