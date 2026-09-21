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
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quick edit modal state
  const [editingAdmin, setEditingAdmin] = useState<SubAdminRow | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

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

  if (!me || !me.authenticated) return null;

  async function remove(id: string, email: string) {
    if (!confirm(`Are you sure you want to delete sub-admin "${email}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
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
    } finally {
      setDeletingId(null);
    }
  }

  function openEditModal(admin: SubAdminRow) {
    setEditingAdmin(admin);
    setEditEmail(admin.email);
    setEditPassword("");
    setEditPermissions([...(admin.permissions || [])]);
    setEditError("");
  }

  function toggleEditPermission(key: string) {
    setEditPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  function selectAllEdit() {
    setEditPermissions(ALL_SIDEBAR_SECTIONS.map((s) => s.key));
  }

  function deselectAllEdit() {
    setEditPermissions([]);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAdmin) return;
    setSavingEdit(true);
    setEditError("");

    try {
      const payload: Record<string, unknown> = {
        id: editingAdmin._id,
        email: editEmail.trim().toLowerCase(),
        permissions: editPermissions,
      };
      if (editPassword.trim().length > 0) {
        payload.password = editPassword.trim();
      }

      const res = await fetch("/api/admin/subadmins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || "Failed to update sub-admin.");
        return;
      }

      setEditingAdmin(null);
      void load();
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  }

  const filteredAdmins = useMemo(() => {
    if (!searchQuery.trim()) return admins;
    const q = searchQuery.toLowerCase().trim();
    return admins.filter((a) => {
      if (a.email.toLowerCase().includes(q)) return true;
      const permLabels = a.permissions.map((p) => (SECTION_LABEL_MAP.get(p) || p).toLowerCase());
      return permLabels.some((lbl) => lbl.includes(q));
    });
  }, [admins, searchQuery]);

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-red-950">Sub Admin List</h1>
          <p className="mt-1 text-sm text-red-900">
            Manage sub-admin accounts, configure sidebar navigation permissions, and monitor access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/admin-control"
            className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition shadow-xs flex items-center gap-2"
          >
            <span>+</span> Add Sub Admin
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-red-100 bg-white p-4 sm:p-5 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-red-700">Total Sub Admins</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-red-950">{admins.length}</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-white p-4 sm:p-5 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Full Access Sub Admins</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-950">
            {admins.filter((a) => a.permissions.length === ALL_SIDEBAR_SECTIONS.length).length}
          </p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-white p-4 sm:p-5 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Active (Ever Logged In)</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-indigo-950">
            {admins.filter((a) => Boolean(a.lastLogin)).length}
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sub-admin by email or section..."
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-2 text-sm text-red-950 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-red-400 hover:text-red-700 font-bold"
            >
              Clear
            </button>
          )}
        </div>
        <span className="text-xs font-semibold text-red-800">
          Showing {filteredAdmins.length} of {admins.length} sub-admins
        </span>
      </div>

      {/* Table Section */}
      {loading ? (
        <AdminTableSkeleton
          headers={["Sub Admin Email", "Sidebar Navigation Access", "Last Login", "Actions"]}
          minWidth="min-w-[650px]"
        />
      ) : admins.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-red-200 bg-pink-50/50 p-10 text-center">
          <p className="text-base font-bold text-red-950">No sub-admins found</p>
          <p className="mt-1 text-sm text-red-800">
            Get started by creating a sub-admin and assigning specific sidebar navigation sections.
          </p>
          <Link
            href="/admin/admin-control"
            className="mt-4 inline-block rounded-full bg-neutral-950 px-5 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            Create First Sub Admin &rarr;
          </Link>
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-red-100 bg-white p-8 text-center text-sm text-red-900">
          No sub-admins matched your search &quot;{searchQuery}&quot;.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-red-100 bg-white shadow-xs">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-pink-50 text-red-950">
              <tr>
                <th className="px-5 py-4 font-bold">Sub Admin Email</th>
                <th className="px-5 py-4 font-bold">Sidebar Navigation Access</th>
                <th className="px-5 py-4 font-bold">Last Login</th>
                <th className="px-5 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-50">
              {filteredAdmins.map((admin) => {
                const totalPossible = ALL_SIDEBAR_SECTIONS.length;
                const isAll = admin.permissions.length >= totalPossible;
                const isEmpty = admin.permissions.length === 0;

                return (
                  <tr key={admin._id} className="hover:bg-pink-50/30 transition-colors">
                    <td className="px-5 py-4 font-medium text-red-950">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{admin.email}</span>
                      </div>
                      <p className="text-[11px] text-red-600 mt-0.5">
                        Created: {formatDisplayDateTime(admin.createdAt)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {isAll ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-black text-emerald-900 shadow-2xs">
                          <span>🌟</span> Full Access (All {totalPossible} Sections)
                        </span>
                      ) : isEmpty ? (
                        <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-500">
                          No sections assigned
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                          <span className="text-[11px] font-bold text-red-900 mr-1">
                            ({admin.permissions.length}/{totalPossible}):
                          </span>
                          {admin.permissions.slice(0, 4).map((p) => (
                            <span
                              key={p}
                              className="rounded-md bg-pink-100 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-950"
                            >
                              {SECTION_LABEL_MAP.get(p) || p}
                            </span>
                          ))}
                          {admin.permissions.length > 4 && (
                            <span
                              title={admin.permissions.slice(4).map((p) => SECTION_LABEL_MAP.get(p) || p).join(", ")}
                              className="cursor-help rounded-md bg-neutral-100 border border-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-700"
                            >
                              +{admin.permissions.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs font-medium text-neutral-700">
                      {admin.lastLogin ? (
                        formatDisplayDateTime(admin.lastLogin)
                      ) : (
                        <span className="text-neutral-400 italic">Never logged in</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(admin)}
                          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition shadow-2xs"
                        >
                          Edit
                        </button>
                        <Link
                          href={`/admin/admin-control?edit=${encodeURIComponent(admin._id)}`}
                          className="hidden sm:inline-flex rounded-lg border border-red-200 bg-pink-50 px-3 py-1.5 text-xs font-bold text-red-900 hover:bg-pink-100 transition"
                          title="Full Edit in Admin Control"
                        >
                          Advanced
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === admin._id}
                          onClick={() => remove(admin._id, admin.email)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
                        >
                          {deletingId === admin._id ? "Deleting..." : "Delete"}
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

      {/* Quick Edit Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-red-50 pb-3">
              <div>
                <h2 className="text-xl font-black text-red-950">Edit Sub Admin</h2>
                <p className="text-xs text-red-800">
                  Update credentials and sidebar navigation access for this account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-red-950 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm text-red-950 outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-red-950 mb-1">
                    New Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm text-red-950 outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Permissions */}
              <div className="border-t border-red-50 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-bold text-red-950">
                    Sidebar Navigation Access ({editPermissions.length}/{ALL_SIDEBAR_SECTIONS.length})
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllEdit}
                      className="font-bold text-red-900 underline hover:text-red-700"
                    >
                      Select All
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={deselectAllEdit}
                      className="font-bold text-red-900 underline hover:text-red-700"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
                  {ALL_SIDEBAR_SECTIONS.map((sec) => {
                    const isChecked = editPermissions.includes(sec.key);
                    return (
                      <label
                        key={sec.key}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
                          isChecked
                            ? "border-red-500 bg-pink-50 font-bold text-red-950"
                            : "border-red-100 bg-white text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEditPermission(sec.key)}
                          className="h-3.5 w-3.5 rounded text-red-600 focus:ring-red-500 accent-neutral-950"
                        />
                        <span className="truncate">{sec.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {editError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-800">
                  {editError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-red-50">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-full bg-neutral-950 px-5 py-2 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
