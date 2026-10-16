"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { Eyebrow } from "@/components/ui/eyebrow";

export const ALL_SIDEBAR_SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "state", label: "State" },
  { key: "city", label: "City List" },
  { key: "city-seo", label: "City SEO" },
  { key: "ads", label: "Ads" },
  { key: "users", label: "Users" },
  { key: "upi", label: "UPI" },
  { key: "coupon", label: "Coupon" },
  { key: "payment-request", label: "Payment Request" },
  { key: "payment-history", label: "Payment History" },
  { key: "set-coins", label: "Set Coins" },
  { key: "promotion-packages", label: "Promotion Package" },
  { key: "vip", label: "VIP" },
  { key: "phone-control", label: "Phone No. Control" },
  { key: "not-found", label: "404 Pages" },
  { key: "admin-control", label: "Admin Control" },
  { key: "sub-admins", label: "Sub Admin List" },
];

function AdminControlInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const me = useAdminContext();

  const editId = searchParams.get("edit");
  const isEditing = Boolean(editId);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (
      me &&
      me.authenticated &&
      me.role !== "main" &&
      !me.permissions?.includes("admin-control")
    ) {
      router.replace("/admin");
    }
  }, [me, router]);

  useEffect(() => {
    if (!editId) {
      queueMicrotask(() => {
        setEmail("");
        setPassword("");
        setPermissions([]);
      });
      return;
    }

    fetch(`/api/admin/subadmins?id=${encodeURIComponent(editId)}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.admin) {
          setEmail(data.admin.email || "");
          setPermissions(Array.isArray(data.admin.permissions) ? data.admin.permissions : []);
        }
      })
      .catch(() => {
        setError("Failed to load sub-admin details.");
      });
  }, [editId]);

  if (!me || !me.authenticated) return null;

  function togglePermission(key: string) {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  function handleSelectAll() {
    setPermissions(ALL_SIDEBAR_SECTIONS.map((s) => s.key));
  }

  function handleDeselectAll() {
    setPermissions([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        email: email.trim().toLowerCase(),
        permissions,
      };

      if (isEditing) {
        payload.id = editId;
        if (password.trim().length > 0) {
          payload.password = password.trim();
        }
      } else {
        payload.password = password.trim();
      }

      const res = await fetch("/api/admin/subadmins", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || (isEditing ? "Failed to update sub-admin." : "Failed to create sub-admin."));
        return;
      }

      setSuccess(
        isEditing
          ? "Sub-admin updated successfully."
          : "Sub-admin created successfully."
      );

      if (!isEditing) {
        setEmail("");
        setPassword("");
        setPermissions([]);
      } else {
        setPassword("");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 shadow-inner">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </span>
            <span>{isEditing ? "Edit Sub Admin" : "Admin Control"}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {isEditing
              ? "Update permissions or reset password for this sub-admin account."
              : "Create a sub-admin and assign granular access to specific administration sections."}
          </p>
        </div>
        <Link
          href="/admin/sub-admins"
          className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition"
        >
          &larr; Sub Admin List
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md shadow-xl">
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-200">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="subadmin@example.com"
              className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-200">
              {isEditing ? "New Password (optional)" : "Password"}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEditing}
                placeholder={isEditing ? "Leave blank to keep current password" : "Min. 6 characters"}
                aria-label="Password"
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 pr-12 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-amber-400"
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.5 10.6A2.5 2.5 0 0 0 12 15a2.5 2.5 0 0 0 2.4-1.8" />
                    <path d="M6.5 6.8C4 8.6 2.5 12 2.5 12s3.5 7 9.5 7a10.5 10.5 0 0 0 4.8-1.1" />
                    <path d="M14.2 4.6A11.4 11.4 0 0 1 12 4C6 4 2.5 12 2.5 12a18.7 18.7 0 0 0 3.7 4.7" />
                    <path d="M9.3 5.1A9.3 9.3 0 0 1 12 4c6 0 9.5 8 9.5 8a17.7 17.7 0 0 1-3.2 4.2" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2.5 12s3.5-8 9.5-8 9.5 8 9.5 8-3.5 8-9.5 8-9.5-8-9.5-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white">
                Assign Access Permissions ({permissions.length}/{ALL_SIDEBAR_SECTIONS.length})
              </p>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="font-bold text-amber-400 hover:text-amber-300 transition"
                >
                  Select All
                </button>
                <span className="text-white/20">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="font-semibold text-slate-400 hover:text-slate-200 transition"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {ALL_SIDEBAR_SECTIONS.map((option) => {
                const isChecked = permissions.includes(option.key);
                return (
                  <label
                    key={option.key}
                    className={`flex items-center gap-2.5 text-xs font-semibold p-3 rounded-xl border cursor-pointer select-none transition ${
                      isChecked
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : "border-white/10 bg-slate-800/40 text-slate-300 hover:bg-slate-800/70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermission(option.key)}
                      className="h-4 w-4 rounded border-white/20 bg-slate-900 text-amber-500 accent-amber-500 focus:ring-0"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-sm text-rose-300 font-semibold">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-sm text-emerald-300 font-semibold">
              {success}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-60 transition active:scale-[0.98]"
            >
              {loading
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                ? "Update Sub Admin"
                : "Create Sub Admin"}
            </button>

            {isEditing && (
              <Link
                href="/admin/admin-control"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                + Create New Instead
              </Link>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

export default function AdminControl() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading admin controls...</div>}>
      <AdminControlInner />
    </Suspense>
  );
}
