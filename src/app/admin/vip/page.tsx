"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/date";

type Assignment = {
  _id?: string;
  type?: "city" | "state";
  stateName?: string;
  cityName?: string;
  citySlug?: string;
  email: string;
  phone?: string;
  status: "pending" | "active" | "inactive" | "expired";
  assignedAt: string;
  expiresAt: string;
  createdAt: string;
};

export default function VipPage() {
  const router = useRouter();
  const me = useAdminContext();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableStates, setAvailableStates] = useState<Array<{ name: string }>>([]);
  const [accessType, setAccessType] = useState<"city" | "state">("city");
  
  // State assignment input
  const [stateName, setStateName] = useState("");
  
  // City assignment inputs (multiple city access via comma separation)
  const [cities, setCities] = useState("");
  const [citySlug, setCitySlug] = useState("");
  
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }
    if (me.role !== "main" && !me.permissions?.includes("vip")) {
      router.replace("/admin");
      return;
    }
    loadAssignments();
    loadStates();
  }, [me, router]);

  async function loadStates() {
    try {
      const res = await fetch("/api/admin/states", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.states) ? data.states : [];
        list.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
        setAvailableStates(list);
      }
    } catch {}
  }

  async function loadAssignments() {
    try {
      const res = await fetch("/api/admin/vip", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load VIP assignments");
      }
      const data = await res.json();
      setAssignments(data.assignments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load VIP assignments");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (!phone.trim()) {
        throw new Error("Please enter the VIP owner's phone number.");
      }

      const payload: Record<string, unknown> = {
        type: accessType,
        email: email.trim(),
        phone: phone.trim(),
        expiresInDays,
      };

      if (accessType === "state") {
        if (!stateName.trim()) {
          throw new Error("Please select a state from the dropdown.");
        }
        payload.stateName = stateName.trim();
      } else {
        const cityList = cities
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean);
        if (cityList.length === 0) {
          throw new Error("Please enter at least one city name.");
        }
        payload.cities = cityList;
        payload.citySlug = citySlug.trim();
      }

      const res = await fetch("/api/admin/vip", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign VIP control");
      }

      const label = accessType === "state" ? `State: ${stateName}` : `Cities: ${cities}`;
      if (data.emailSent === false) {
        setSuccess(`VIP access assigned for ${label}. Notice: Email delivery could not be completed (${data.emailError || "SMTP issue"}). VIP login details: Email: ${email.trim()}, Password: ${phone.trim()}`);
      } else {
        setSuccess(`VIP access assigned for ${label}. Login credentials (email and password) sent to ${email.trim()}.`);
      }

      setStateName("");
      setCities("");
      setCitySlug("");
      setEmail("");
      setPhone("");
      setExpiresInDays(7);
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign VIP control");
    } finally {
      setLoading(false);
    }
  }

  async function handleExtend(id?: string, days = 7) {
    if (!id) return;
    try {
      const res = await fetch("/api/admin/vip", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, extendDays: days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update VIP assignment");
      }
      setSuccess(days > 0 ? `VIP access extended by ${days} days.` : `VIP access reduced by ${Math.abs(days)} days.`);
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update VIP assignment");
    }
  }

  async function handleToggle(id?: string, active?: boolean) {
    if (!id) return;
    try {
      const res = await fetch("/api/admin/vip", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update VIP assignment");
      }
      setSuccess(active ? "VIP access activated." : "VIP access marked inactive.");
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update VIP assignment");
    }
  }

  async function handleDelete(id?: string) {
    if (!id || !confirm("Delete this VIP assignment?")) return;
    try {
      const res = await fetch("/api/admin/vip", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete VIP assignment");
      }
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete VIP assignment");
    }
  }

  function getAssignedDays(item: Assignment) {
    const start = new Date(item.assignedAt).getTime();
    const end = new Date(item.expiresAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return 0;
    return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  }

  if (!me || !me.authenticated) return null;

  return (
    <main className="min-h-screen bg-red-50 p-4 sm:p-6 lg:p-10 min-w-0">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-red-950">VIP Access Control</h1>
            <p className="mt-2 text-red-900">
              Assign City or State level VIP access. The VIP&apos;s phone number serves as their password to access their dedicated VIP Panel.
            </p>
          </div>
          <Link
            href="/api/admin/go-to-vip"
            prefetch={false}
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition shrink-0"
          >
            <span>Go to VIP Dashboard</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {error && <div className="mt-4 rounded-xl bg-red-100 p-3 text-sm text-red-800">{error}</div>}
        {success && (
          <div className="mt-4 rounded-xl bg-green-100 p-4 text-sm text-green-900 font-semibold">
            {success}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-red-200 bg-white p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            {/* Access Type Toggle */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-red-950">
                Assignment Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-red-950">
                  <input
                    type="radio"
                    name="accessType"
                    checked={accessType === "city"}
                    onChange={() => setAccessType("city")}
                    className="accent-red-800"
                  />
                  City Access (Specific cities only)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-red-950">
                  <input
                    type="radio"
                    name="accessType"
                    checked={accessType === "state"}
                    onChange={() => setAccessType("state")}
                    className="accent-red-800"
                  />
                  State Access (Full state & all cities within it)
                </label>
              </div>
            </div>

            {/* State Selection Dropdown */}
            {accessType === "state" ? (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-red-950">
                  Select State
                </label>
                <select
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
                  required
                >
                  <option value="">-- Select a State --</option>
                  {availableStates.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-red-600">
                  The VIP will see this state and all cities belonging to it.
                </p>
              </div>
            ) : (
              /* City input for multiple city access */
              <>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-red-950">City Names</label>
                  <textarea
                    value={cities}
                    onChange={(e) => setCities(e.target.value)}
                    className="min-h-24 w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
                    placeholder="Jaipur, Delhi, Mumbai"
                    required
                  />
                  <p className="mt-1 text-xs text-red-600">Enter city names separated by commas.</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-red-950">City Slug (Optional)</label>
                  <input
                    type="text"
                    value={citySlug}
                    onChange={(e) => setCitySlug(e.target.value)}
                    className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
                    placeholder="jaipur"
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-red-950">VIP Owner Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
                placeholder="vipowner@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-red-950">Phone No. (Used as Password)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
                placeholder="e.g. 9876543210"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-red-950">Expires In (Days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onKeyDown={(e) => {
                  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                }}
                onChange={(e) => setExpiresInDays(Number(e.target.value || 7))}
                className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
              />
            </div>

            <div className="flex items-end md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-neutral-950 px-5 py-3 font-bold text-white hover:bg-neutral-800 disabled:opacity-60 transition"
              >
                {loading ? "Assigning..." : "assign vip access"}
              </button>
            </div>
          </form>
        </div>

        {/* Assignments List */}
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-bold text-red-950">Active VIP Assignments</h2>
          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-red-200 bg-white p-6 text-red-900">
              No VIP assignments yet.
            </div>
          ) : (
            assignments.map((item) => (
              <div key={item._id} className="relative rounded-2xl border border-red-200 bg-white p-4 sm:p-5">
                <div className="absolute right-4 top-4 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-900">
                  {getAssignedDays(item)} days left
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 pr-24">
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-900 uppercase">
                        {item.type === "state" ? "State" : "City"}
                      </span>
                      <h3 className="text-lg font-bold text-red-950">
                        {item.type === "state" ? item.stateName : item.cityName}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.status === "active"
                            ? "bg-green-100 text-green-900"
                            : "bg-red-100 text-red-900"
                        }`}
                      >
                        {item.status === "inactive" ? "Inactive" : "Active"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-red-900 break-all font-medium">Email: {item.email}</p>
                    <p className="text-sm font-bold text-red-950 break-all">Password: {item.phone || "—"}</p>
                    <p className="text-xs text-red-700 mt-1">Assigned: {formatDisplayDate(item.assignedAt)}</p>
                    <p className="text-xs text-red-700">Expires: {formatDisplayDateTime(item.expiresAt)}</p>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-2.5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleExtend(item._id, -7)}
                        className="rounded-lg bg-orange-100 px-3 py-2 text-xs font-semibold text-orange-900 hover:bg-orange-200"
                      >
                        -7 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExtend(item._id, 7)}
                        className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-200"
                      >
                        +7 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(item._id, item.status !== "active")}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                          item.status === "active"
                            ? "bg-yellow-100 text-yellow-900 hover:bg-yellow-200"
                            : "bg-green-100 text-green-900 hover:bg-green-200"
                        }`}
                      >
                        {item.status === "active" ? "Mark Inactive" : "Mark Active"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item._id)}
                        className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-900 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                    <a
                      href={`/api/admin/go-to-vip?email=${encodeURIComponent(item.email)}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition"
                    >
                      Go to VIP Dashboard &rarr;
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
