"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { Eyebrow } from "@/components/ui/eyebrow";

export const ALL_SIDEBAR_SECTIONS = [
  { key: "dashboard", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { key: "state", label: "State", icon: "M3 21h18M3 10h18M3 3h18M3 17h18" },
  { key: "city", label: "City List", icon: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" },
  { key: "city-seo", label: "City SEO", icon: "M11 3H5a2 2 0 00-2 2v14a2 2 0 002 2h6M9 12h12M9 8h12M9 16h12M19 4v16" },
  { key: "dynamic-seo", label: "Dynamic SEO", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { key: "ads", label: "Ads", icon: "M3 7h18M3 12h18M3 17h18" },
  { key: "users", label: "Users", icon: "M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8z" },
  { key: "upi", label: "UPI", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" },
  { key: "coupon", label: "Coupon", icon: "M4 4h16v2H4V4zm0 7h16v2H4v-2zm0 7h16v2H4v-2z" },
  { key: "payment-request", label: "Payment Request", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" },
  { key: "payment-history", label: "Payment History", icon: "M11 7h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zM7 7h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4-8h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z" },
  { key: "set-coins", label: "Set Coins", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.48-.84-2.74-1.5-2.74-2.62 0-.92.73-1.54 1.77-1.54 1.69 0 2.25.74 2.68 1.74l1.51-.75C13.54 8 12.77 6.65 10.34 6.65c-1.65 0-3.55.89-3.55 2.72 0 1.54.84 2.17 2.73 3.09 1.81 1.02 2.73 1.5 2.73 2.62 0 1.08-.74 1.54-1.77 1.54-1.27 0-2.02-.74-2.44-1.81l-1.52.75c.54 1.61 1.74 2.67 3.96 2.67 1.99 0 3.55-1.03 3.55-2.72-.01-1.78-.86-2.54-3.13-3.44z" },
  { key: "promotion-packages", label: "Promotion Package", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  { key: "vip", label: "VIP", icon: "M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z" },
  { key: "phone-control", label: "Phone No. Control", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
  { key: "not-found", label: "404 Pages", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { key: "admin-control", label: "Admin Control", icon: "M12 4v16m8-8H4" },
  { key: "sub-admins", label: "Sub Admin List", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
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
  const [fetchingAdmin, setFetchingAdmin] = useState(false);

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

  // Load existing sub-admin if edit query param present
  useEffect(() => {
    if (!editId) {
      setEmail("");
      setPassword("");
      setPermissions([]);
      return;
    }

    setFetchingAdmin(true);
    setError("");
    fetch(`/api/admin/subadmins?id=${encodeURIComponent(editId)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Failed to load sub-admin details.");
        }
        return res.json();
      })
      .then((data) => {
        if (data.admin) {
          setEmail(data.admin.email || "");
          setPermissions(Array.isArray(data.admin.permissions) ? data.admin.permissions : []);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load sub-admin details.");
      })
      .finally(() => {
        setFetchingAdmin(false);
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
      const url = "/api/admin/subadmins";
      const method = isEditing ? "PUT" : "POST";
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

      const res = await fetch(url, {
        method,
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-red-950">
              {isEditing ? "Edit Sub Admin" : "Admin Control"}
            </h1>
            {isEditing && (
              <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-0.5">
                Edit Mode
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-red-900">
            {isEditing
              ? "Update permissions or reset password for this sub-admin account."
              : "Create a sub-admin and assign access to specific sidebar navigation sections."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <Link
              href="/admin/admin-control"
              className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-950 hover:bg-pink-50 transition"
            >
              + Create New Sub Admin
            </Link>
          )}
          <Link
            href="/admin/sub-admins"
            className="rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
          >
            View Sub Admin List &rarr;
          </Link>
        </div>
      </div>

      {fetchingAdmin ? (
        <div className="mt-8 p-6 text-sm text-red-900">Loading sub-admin details...</div>
      ) : (
        <div className="mt-6 rounded-2xl border border-red-100 bg-white p-5 sm:p-7 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-red-950">
                  Sub Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@example.com"
                  className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-950 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <Eyebrow className="mb-1 block">
                  {isEditing ? "New Password (optional)" : "Password"}
                </Eyebrow>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!isEditing}
                    placeholder={
                      isEditing
                        ? "Leave blank to keep current password"
                        : "Min. 6 characters"
                    }
                    aria-label="Password"
                    className="w-full rounded-xl border border-red-200 px-4 py-2.5 pr-12 text-sm text-red-950 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-red-500 transition hover:text-red-700"
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
            </div>

            {/* Sidebar Navigation Permissions Grid */}
            <div className="pt-2 border-t border-red-50">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-base font-bold text-red-950">
                    Assign Sidebar Navigation Access
                  </h3>
                  <p className="text-xs text-red-900">
                    Selected sections will appear in the sub-admin&apos;s sidebar menu.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-red-800 bg-pink-100 rounded-full px-2.5 py-1">
                    {permissions.length} of {ALL_SIDEBAR_SECTIONS.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-bold text-neutral-900 hover:text-red-700 underline px-1 py-0.5"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-xs font-bold text-neutral-900 hover:text-red-700 underline px-1 py-0.5"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {ALL_SIDEBAR_SECTIONS.map((sec) => {
                  const isChecked = permissions.includes(sec.key);
                  return (
                    <label
                      key={sec.key}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? "border-red-500 bg-pink-50/70 shadow-xs"
                          : "border-red-100 bg-white hover:border-red-200 hover:bg-neutral-50/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(sec.key)}
                        className="h-4 w-4 rounded text-red-600 focus:ring-red-500 accent-neutral-950"
                      />
                      <svg
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isChecked ? "text-red-600" : "text-neutral-400"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={sec.icon} />
                      </svg>
                      <span
                        className={`text-sm font-semibold truncate ${
                          isChecked ? "text-red-950 font-bold" : "text-neutral-700"
                        }`}
                      >
                        {sec.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800 flex items-center justify-between gap-3">
                <span>{success}</span>
                <Link
                  href="/admin/sub-admins"
                  className="text-xs font-bold underline hover:text-emerald-950"
                >
                  View in Sub Admin List &rarr;
                </Link>
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-neutral-950 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60 transition"
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
                  href="/admin/sub-admins"
                  className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition"
                >
                  Cancel
                </Link>
              )}
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default function AdminControl() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-red-900">Loading...</div>}>
      <AdminControlInner />
    </Suspense>
  );
}
