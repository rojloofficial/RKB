"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { formatDisplayDateTime } from "@/lib/date";
import { AdminStatSkeleton } from "@/components/skeletons/admin-skeletons";

type NotFoundItem = {
  _id: string;
  path: string;
  hits: number;
  firstSeen: string;
  lastSeen: string;
  referrers?: string[];
  userAgent?: string;
  ip?: string;
  resolved: boolean;
};

export default function AdminNotFoundPage() {
  const router = useRouter();
  const me = useAdminContext();

  const [logs, setLogs] = useState<NotFoundItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(`/api/admin/not-found?${params.toString()}`, {
        credentials: "include",
      });

      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setTotalCount(data.totalCount || 0);
      setTotalHits(data.totalHits || 0);
      setUnresolvedCount(data.unresolvedCount || 0);
      setResolvedCount(data.resolvedCount || 0);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load 404 error logs.");
    } finally {
      setLoading(false);
    }
  }, [filter, router, searchTerm]);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }
    let active = true;
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (searchTerm.trim()) params.set("search", searchTerm.trim());

    fetch(`/api/admin/not-found?${params.toString()}`, {
      credentials: "include",
    })
      .then((res) => {
        if (res.status === 401) {
          router.replace("/admin/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!active || !data) return;
        setLogs(data.logs || []);
        setTotalCount(data.totalCount || 0);
        setTotalHits(data.totalHits || 0);
        setUnresolvedCount(data.unresolvedCount || 0);
        setResolvedCount(data.resolvedCount || 0);
        setError("");
      })
      .catch((err) => {
        if (active) {
          console.error(err);
          setError("Failed to load 404 error logs.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filter, me, router, searchTerm]);

  async function handleToggleResolved(item: NotFoundItem) {
    try {
      setProcessingId(item._id);
      const res = await fetch("/api/admin/not-found", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item._id, resolved: !item.resolved }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this 404 log entry?")) return;
    try {
      setProcessingId(id);
      const res = await fetch("/api/admin/not-found", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to delete log:", err);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleClearAll() {
    if (!window.confirm("Are you sure you want to clear ALL 404 error logs? This cannot be undone.")) return;
    try {
      setClearing(true);
      const res = await fetch("/api/admin/not-found", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to clear logs:", err);
    } finally {
      setClearing(false);
    }
  }

  function handleCopy(path: string, id: string) {
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <main className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-6 sm:space-y-8 min-w-0">
      {/* Header with Title and Actions */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-red-200/60 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100/80 text-rose-800 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            Error Tracking
          </div>
          <h1 className="text-2xl font-black tracking-tight text-red-950 sm:text-3xl lg:text-4xl">
            404 Pages Monitor
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-red-900/80 max-w-2xl">
            Track all broken links, mistyped addresses, and missing pages visited by users in real-time. You can investigate, test, and mark them as resolved once fixed or redirected.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-950 shadow-sm transition hover:bg-red-50 active:scale-95 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 text-red-700 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh Data
          </button>
          {logs.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearing}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800 shadow-sm transition hover:bg-rose-100 active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-rose-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {clearing ? "Clearing..." : "Clear All Logs"}
            </button>
          )}
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        <div className="rounded-2xl border border-red-100 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800/70">Unique URLs</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-red-950">
            {loading ? <AdminStatSkeleton /> : totalCount}
          </div>
          <p className="mt-1 text-xs text-red-700/60 font-medium">Distinct broken paths</p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800/70">Total 404 Hits</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-rose-600">
            {loading ? <AdminStatSkeleton /> : totalHits}
          </div>
          <p className="mt-1 text-xs text-red-700/60 font-medium">Total user occurrences</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Needs Fix</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-950">
            {loading ? <AdminStatSkeleton /> : unresolvedCount}
          </div>
          <p className="mt-1 text-xs text-amber-800/70 font-medium">Require redirect or page</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Resolved</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-950">
            {loading ? <AdminStatSkeleton /> : resolvedCount}
          </div>
          <p className="mt-1 text-xs text-emerald-800/70 font-medium">Marked as handled</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-red-100 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "all"
                ? "bg-neutral-900 text-white shadow-sm"
                : "text-neutral-900 hover:bg-neutral-100 bg-neutral-50"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unresolved")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "unresolved"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-amber-900 hover:bg-amber-50 bg-amber-50/40"
            }`}
          >
            Needs Fix ({unresolvedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("resolved")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "resolved"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-900 hover:bg-emerald-50 bg-emerald-50/40"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search broken URL path..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-red-200 bg-red-50/30 pl-10 pr-8 py-2 text-xs text-red-950 placeholder-red-400 focus:border-red-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2 text-xs text-red-400 hover:text-red-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Logs Table Card */}
      <div className="rounded-2xl border border-red-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto" aria-busy="true" aria-label="Loading 404 logs">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-red-100 bg-red-50/60 text-[11px] font-bold uppercase tracking-wider text-red-900/80">
                <tr>
                  <th className="px-5 py-4">Broken URL / Requested Path</th>
                  <th className="px-4 py-4 text-center">Hits</th>
                  <th className="px-4 py-4">Last Seen</th>
                  <th className="px-5 py-4">Traffic Source / Referrer</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4">
                      <div className="h-4 w-48 animate-pulse rounded bg-pink-200/60 motion-reduce:animate-none" />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="mx-auto h-4 w-12 animate-pulse rounded bg-pink-200/60 motion-reduce:animate-none" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-28 animate-pulse rounded bg-pink-200/60 motion-reduce:animate-none" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-36 animate-pulse rounded bg-pink-200/60 motion-reduce:animate-none" />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="mx-auto h-6 w-20 animate-pulse rounded-full bg-pink-200/60 motion-reduce:animate-none" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="ml-auto h-7 w-20 animate-pulse rounded-full bg-pink-200/60 motion-reduce:animate-none" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-24 text-center px-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-inner">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-red-950">No 404 Errors Found</h3>
            <p className="mt-1.5 text-xs text-red-800/70 max-w-sm mx-auto">
              {searchTerm || filter !== "all"
                ? "No 404 log records match your current filter criteria."
                : "No users have hit broken URLs yet! Your site navigation and page routes are healthy."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-red-100 bg-red-50/60 text-[11px] font-bold uppercase tracking-wider text-red-900/80">
                <tr>
                  <th className="px-5 py-4">Broken URL / Requested Path</th>
                  <th className="px-4 py-4 text-center">Hits</th>
                  <th className="px-4 py-4">Last Seen</th>
                  <th className="px-5 py-4">Traffic Source / Referrer</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100/60">
                {logs.map((item) => (
                  <tr
                    key={item._id}
                    className={`transition-colors hover:bg-red-50/40 ${
                      item.resolved ? "bg-emerald-50/20" : ""
                    }`}
                  >
                    {/* Broken Path */}
                    <td className="px-5 py-4 max-w-xs sm:max-w-md">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-xs font-semibold text-red-950 bg-red-50/80 px-2 py-1 rounded-lg border border-red-100 truncate max-w-xs sm:max-w-sm block"
                          title={item.path}
                        >
                          {item.path}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.path, item._id)}
                          title="Copy path to clipboard"
                          className="flex-shrink-0 p-1 rounded-md text-red-400 hover:text-red-700 hover:bg-red-100 transition"
                        >
                          {copiedId === item._id ? (
                            <span className="text-[10px] font-bold text-emerald-600">Copied!</span>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </button>
                        <a
                          href={item.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open URL in new tab to test"
                          className="flex-shrink-0 p-1 rounded-md text-red-400 hover:text-red-700 hover:bg-red-100 transition"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>
                    </td>

                    {/* Hits */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center rounded-full bg-rose-100/90 px-3 py-1 text-xs font-black text-rose-800 border border-rose-200 shadow-sm">
                        {item.hits} {item.hits === 1 ? "hit" : "hits"}
                      </span>
                    </td>

                    {/* Last Seen */}
                    <td className="px-4 py-4 text-red-900/80 whitespace-nowrap font-medium">
                      {formatDisplayDateTime(item.lastSeen)}
                    </td>

                    {/* Referrer */}
                    <td className="px-5 py-4 text-red-800/70 max-w-xs truncate">
                      {item.referrers && item.referrers.length > 0 ? (
                        <span className="font-mono text-[11px]" title={item.referrers.join(", ")}>
                          {item.referrers[item.referrers.length - 1]}
                        </span>
                      ) : (
                        <span className="italic text-gray-400 text-[11px]">Direct Entry / Bookmark</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      {item.resolved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          Needs Fix
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={processingId === item._id}
                          onClick={() => handleToggleResolved(item)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition active:scale-95 ${
                            item.resolved
                              ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                              : "border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                          }`}
                        >
                          {item.resolved ? "Reopen" : "Mark Fixed"}
                        </button>
                        <button
                          type="button"
                          disabled={processingId === item._id}
                          onClick={() => handleDelete(item._id)}
                          className="rounded-xl border border-red-200 p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800 transition active:scale-95"
                          title="Delete log entry"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}