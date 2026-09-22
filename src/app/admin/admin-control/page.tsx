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
  { key: "dynamic-seo", label: "Dynamic SEO" },
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
    <main className="p-4 sm:p-6 lg:p-10 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-red-950">
          {isEditing ? "Edit Sub Admin" : "Admin Control"}
        </h1>
        <Link
          href="/admin/sub-admins"
          className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Sub Admin List &rarr;
        </Link>
      </div>
      <p className="mt-2 text-red-900">
        {isEditing
          ? "Update permissions or reset password for this sub-admin."
          : "Create a sub-admin and assign access to specific sections."}
      </p>

      <div className="mt-6 max-w-xl rounded-2xl border border-red-100 bg-white p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-red-950">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              className="w-full rounded-[20px] border border-red-200 px-4 py-2.5 text-sm text-red-950 outline-none focus:border-red-400"
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
                placeholder={isEditing ? "Leave blank to keep current password" : "Min. 6 characters"}
                aria-label="Password"
                className="w-full rounded-[20px] border border-red-200 px-4 py-2.5 pr-12 text-sm text-red-950 outline-none focus:border-red-400"
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-red-950">
                Assign access ({permissions.length}/{ALL_SIDEBAR_SECTIONS.length})
              </p>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="font-semibold text-red-950 underline hover:text-red-700"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="font-semibold text-red-950 underline hover:text-red-700"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {ALL_SIDEBAR_SECTIONS.map((option) => (
                <label
                  key={option.key}
                  className="flex items-center gap-2 text-sm text-red-900 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(option.key)}
                    onChange={() => togglePermission(option.key)}
                    className="h-4 w-4 accent-neutral-900"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}

          <div className="flex items-center gap-3 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
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
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
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
    <Suspense fallback={<div className="p-8 text-sm text-red-900">Loading...</div>}>
      <AdminControlInner />
    </Suspense>
  );
}
