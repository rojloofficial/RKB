"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminStateHierarchySkeleton } from "@/components/skeletons/admin-skeletons";
import { useAdminContext } from "@/components/admin/use-admin-context";

type StateRecord = {
  _id?: string;
  name: string;
  slug: string;
};

type CityRow = {
  _id?: string;
  name: string;
  slug?: string;
  region: string;
  state?: string;
  source?: "Custom" | "Static";
};

type JsonSummary = {
  totalStates: number;
  totalCities: number;
  newStates: number;
  newCities: number;
};

const COUNTRY_OPTIONS = ["India"];

// UI-only sentinel value for inline creation option
const ADD_CITY_VALUE = "__ADD_CITY__";

function normalizeState(s?: string): string {
  return (s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Dependency-free fuzzy matching
 */
function fuzzyMatch(target: string, query: string): boolean {
  if (!query) return true;
  if (!target) return false;
  const t = target.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  // 1. Direct substring
  if (t.includes(q)) return true;

  // 2. Token / word-level match
  const tokens = q.split(/[\s\-_,]+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => t.includes(token))) {
    return true;
  }

  // 3. Subsequence matching
  let tIdx = 0;
  let qIdx = 0;
  while (tIdx < t.length && qIdx < q.length) {
    if (t[tIdx] === q[qIdx]) {
      qIdx++;
    }
    tIdx++;
  }
  return qIdx === q.length;
}

export default function AdminStates() {
  const router = useRouter();
  const me = useAdminContext();
  const [states, setStates] = useState<StateRecord[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateName, setStateName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search input & debounced search term
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Collapsible state tracking
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

  // Cascading Location Selector State: State -> City
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Inline Creation Form States
  const [newCityName, setNewCityName] = useState("");
  const [creatingCity, setCreatingCity] = useState(false);

  // JSON File Upload / Validation state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingPayload, setPendingPayload] = useState<unknown | null>(null);
  const [importSummary, setImportSummary] = useState<JsonSummary | null>(null);
  const [importing, setImporting] = useState(false);

  // Delete All Locations Modal & Safety State
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirmed, setDeleteAllConfirmed] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Backup Export State
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  // Load all States and Cities
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch("/api/admin/states", { credentials: "include" }),
        fetch("/api/admin/cities", { credentials: "include" }),
      ]);
      if (sRes.status === 401 || cRes.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (sRes.ok) setStates((await sRes.json()).states ?? []);
      if (cRes.ok) setCities((await cRes.json()).cities ?? []);
    } catch {
      setError("Failed to load data. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [load, me, router]);

  // Toggle state expansion in hierarchy
  function toggleState(stateKey: string) {
    setExpandedStates((prev) => {
      const next = new Set(prev);
      if (next.has(stateKey)) next.delete(stateKey);
      else next.add(stateKey);
      return next;
    });
  }

  function expandAll() {
    setExpandedStates(new Set(states.map((s) => s._id ?? s.slug ?? s.name)));
  }

  function collapseAll() {
    setExpandedStates(new Set());
  }

  // Hierarchy Fuzzy Filter
  const filteredHierarchy = useMemo(() => {
    const q = debouncedSearch.trim();

    return states
      .map((state) => {
        const stateKey = state._id ?? state.slug ?? state.name;
        const stateMatches = fuzzyMatch(state.name, q);

        const stateCities = cities.filter((c) => {
          if (!c.state) return false;
          const cState = c.state.trim().toLowerCase();
          const sName = state.name.trim().toLowerCase();
          return (
            cState === sName ||
            normalizeState(c.state) === normalizeState(state.name)
          );
        });

        const matchingCities = stateCities.filter(
          (city) => !q || stateMatches || fuzzyMatch(city.name, q)
        );

        const isStateVisible = !q || stateMatches || matchingCities.length > 0;

        return {
          state,
          stateKey,
          stateMatches,
          matchingCities,
          isStateVisible,
        };
      })
      .filter((s) => s.isStateVisible);
  }, [states, cities, debouncedSearch]);

  async function addState(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: stateName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) || "Failed to create state.");
        return;
      }
      setSuccess(`State "${stateName}" created.`);
      setStateName("");
      await load();
    } catch {
      setError("Failed to create state.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeCity(id?: string) {
    if (!id) return;
    if (!confirm("Delete this city?")) return;
    try {
      const res = await fetch("/api/admin/cities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data.error as string) || "Failed to delete city.");
        return;
      }
      setSuccess("City deleted successfully.");
      setSelectedCity("");
      await load();
    } catch {
      setError("Failed to delete city.");
    }
  }

  async function removeState(id?: string) {
    if (!id) return;
    if (!confirm("Delete this state?")) return;
    try {
      const res = await fetch("/api/admin/states", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data.error as string) || "Failed to delete state.");
        return;
      }
      setSuccess("State deleted successfully.");
      setSelectedState("");
      setSelectedCity("");
      await load();
    } catch {
      setError("Failed to delete state.");
    }
  }

  // Handle JSON File Selection & Atomic Pre-Validation
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setImporting(true);

    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setError("Selected file is not valid JSON. Please upload a valid .json file.");
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const res = await fetch("/api/admin/states/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "validate", payload: parsed }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) || "JSON validation failed.");
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setPendingPayload(parsed);
      setImportSummary(data.summary as JsonSummary);
    } catch {
      setError("Failed to process the JSON file.");
    } finally {
      setImporting(false);
    }
  }

  // Confirm and Execute Import
  async function confirmImport() {
    if (!pendingPayload || importing) return;
    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/states/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "confirm", payload: pendingPayload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) || "Import failed.");
        return;
      }

      const summary = data.summary as JsonSummary;
      setSuccess(
        `Import complete! Processed ${summary.totalStates} states (${summary.newStates} new), ${summary.totalCities} cities (${summary.newCities} new).`
      );
      setImportSummary(null);
      setPendingPayload(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch {
      setError("Failed to complete JSON import.");
    } finally {
      setImporting(false);
    }
  }

  function cancelImport() {
    setImportSummary(null);
    setPendingPayload(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Delete All Locations Handler
  async function handleDeleteAllLocations() {
    if (!deleteAllConfirmed || deletingAll) return;
    setDeletingAll(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/states", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) || "Failed to delete all locations.");
        return;
      }

      setShowDeleteAllModal(false);
      setDeleteAllConfirmed(false);
      setSelectedState("");
      setSelectedCity("");
      setNewCityName("");
      setSuccess(
        (data.message as string) ||
          "All states and cities have been permanently deleted."
      );
      await load();
    } catch {
      setError("An error occurred while deleting all locations.");
    } finally {
      setDeletingAll(false);
    }
  }

  // Cascading Selector Handlers
  function handleStateSelect(newState: string) {
    setSelectedState(newState);
    setSelectedCity("");
    setNewCityName("");
    setError("");
  }

  function handleCitySelect(newCity: string) {
    setSelectedCity(newCity);
    setNewCityName("");
    setError("");
  }

  // Inline Add City Handler
  async function handleInlineAddCity(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCityName.trim();
    if (!selectedState || !trimmed || creatingCity) return;
    setCreatingCity(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmed,
          state: selectedState,
          region: selectedState,
          country: "India",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) || "Failed to create city.");
        return;
      }

      setSuccess(`City "${trimmed}" created successfully in ${selectedState}.`);
      setNewCityName("");
      setExpandedStates((prev) => new Set(prev).add(selectedState));
      await load();
      setSelectedCity(trimmed);
    } catch {
      setError("An error occurred while creating city.");
    } finally {
      setCreatingCity(false);
    }
  }

  // Available Cities for currently selected State
  const citiesForSelectedState = useMemo(() => {
    if (!selectedState) return [];
    const sLower = selectedState.toLowerCase();
    const sNorm = normalizeState(selectedState);
    return cities.filter((c) => {
      if (!c.state) return false;
      const cState = c.state.trim().toLowerCase();
      return cState === sLower || normalizeState(c.state) === sNorm;
    });
  }, [cities, selectedState]);

  // Download Location Backup Handler
  async function handleDownloadBackup() {
    if (downloadingBackup) return;
    setDownloadingBackup(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/states/export", {
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError((errData.error as string) || "Failed to download location backup.");
        return;
      }

      const blob = await res.blob();
      const today = new Date().toISOString().split("T")[0];
      const filename = `rojlo-locations-backup-${today}.json`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccess("Location JSON backup downloaded successfully.");
    } catch {
      setError("An error occurred while downloading location backup.");
    } finally {
      setDownloadingBackup(false);
    }
  }

  const isSearching = debouncedSearch.length > 0;

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            States &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Cities</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Add states, manage cities, and structure regional coverage hierarchically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl border border-white/10 bg-slate-800/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs">
            States: {states.length}
          </span>
          <span className="rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-1.5 text-xs font-semibold text-slate-300">
            Cities: {cities.length}
          </span>
          <button
            type="button"
            onClick={() => {
              setShowDeleteAllModal(true);
              setDeleteAllConfirmed(false);
            }}
            className="rounded-xl border border-rose-500/40 bg-rose-500/20 hover:bg-rose-500/30 px-3.5 py-1.5 text-xs font-bold text-rose-300 transition"
          >
            Delete All Locations
          </button>
        </div>
      </div>

      {/* Search Bar + Controls */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Fuzzy search State or City..."
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 hover:text-white"
            >
              &times;
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="rounded-xl border border-white/10 bg-slate-800/70 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-xl border border-white/10 bg-slate-800/70 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Success / Error Messages */}
      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="font-bold text-rose-400 hover:text-rose-200"
          >
            &times;
          </button>
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-300 flex items-center justify-between">
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            className="font-bold text-emerald-400 hover:text-emerald-200"
          >
            &times;
          </button>
        </div>
      )}

      {/* Primary Actions: Add State Form & JSON Import / Export */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Add State Form */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
          <h2 className="text-base font-bold text-white mb-1">Add New State</h2>
          <p className="text-xs text-slate-400 mb-4">
            Register a state or union territory.
          </p>
          <form onSubmit={addState} className="flex flex-wrap gap-2">
            <input
              className="flex-1 min-w-[200px] rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              placeholder="e.g. Maharashtra, Karnataka, Delhi"
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              {submitting ? "Adding..." : "Add State"}
            </button>
          </form>
        </section>

        {/* JSON Import & Backup Box */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-white">Import &amp; Backup</h2>
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={downloadingBackup}
              className="rounded-xl border border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 text-xs font-bold text-amber-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>📥</span>
              {downloadingBackup ? "Preparing..." : "Download Backup"}
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Upload a structured JSON file to bulk-import States and Cities.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-xl border border-white/15 bg-slate-800/90 hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 transition">
              <span>{importing ? "Validating JSON..." : "Select JSON File"}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={importing}
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </section>
      </div>

      {/* JSON Import Preview Modal */}
      {importSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Confirm JSON Hierarchy Import
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Review parsed locations before applying to your database:
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl border border-white/10 bg-slate-800/80 p-3 text-center">
                <span className="block text-xl font-black text-amber-400">
                  {importSummary.totalStates}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  States ({importSummary.newStates} new)
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-800/80 p-3 text-center">
                <span className="block text-xl font-black text-amber-400">
                  {importSummary.totalCities}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  Cities ({importSummary.newCities} new)
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelImport}
                disabled={importing}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={importing}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-orange-500 transition shadow-md"
              >
                {importing ? "Importing..." : "Confirm & Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cascading Location Hierarchy Selector: State -> City */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
        <h2 className="text-base font-bold text-white mb-1">
          Cascading Hierarchy Selector
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Select a State to view or add Cities.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* 1. Country Dropdown */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Country
            </span>
            <select
              className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
              defaultValue="India"
              disabled
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {/* 2. State Dropdown */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              State
            </span>
            <select
              className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
              value={selectedState}
              onChange={(e) => handleStateSelect(e.target.value)}
            >
              <option value="">-- Select State --</option>
              {states.map((s) => (
                <option key={s._id ?? s.slug} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {/* 3. City Dropdown */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              City
            </span>
            <select
              className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 disabled:opacity-40"
              value={selectedCity}
              onChange={(e) => handleCitySelect(e.target.value)}
              disabled={!selectedState}
            >
              <option value="">
                {!selectedState
                  ? "-- Select State First --"
                  : "-- Select City --"}
              </option>
              {citiesForSelectedState.map((c) => (
                <option key={c._id ?? c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              {selectedState && (
                <>
                  <option disabled value="">
                    ────────────
                  </option>
                  <option
                    value={ADD_CITY_VALUE}
                    className="font-bold text-amber-400"
                  >
                    + Add City
                  </option>
                </>
              )}
            </select>
          </label>
        </div>

        {/* Inline Add City Form */}
        {selectedCity === ADD_CITY_VALUE && (
          <form
            onSubmit={handleInlineAddCity}
            className="mt-4 rounded-xl border border-amber-500/30 bg-slate-800/80 p-4"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Add New City to <span className="text-amber-400">{selectedState}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCity("")}
                className="text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="flex-1 min-w-[200px] rounded-xl border border-white/15 bg-slate-900 px-3.5 py-2 text-sm text-white outline-none focus:border-amber-500 placeholder:text-slate-500"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder="Enter city name..."
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={creatingCity || !newCityName.trim()}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 transition"
              >
                {creatingCity ? "Adding..." : "Add City"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedCity("")}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-rose-500/40 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-2">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold text-white">
                Delete All Locations?
              </h3>
            </div>

            <p className="mt-3 text-sm text-slate-300">
              This is a permanent destructive action. It will immediately delete:
            </p>

            <ul className="mt-3 space-y-1.5 rounded-xl bg-rose-500/10 p-3.5 text-sm text-slate-200 border border-rose-500/20">
              <li className="flex justify-between">
                <span>• All States:</span>
                <span className="font-bold text-rose-400">{states.length}</span>
              </li>
              <li className="flex justify-between">
                <span>• All Cities:</span>
                <span className="font-bold text-rose-400">{cities.length}</span>
              </li>
            </ul>

            <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-200 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteAllConfirmed}
                onChange={(e) => setDeleteAllConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-rose-500 cursor-pointer"
              />
              <span>
                I understand that all states and cities will be permanently deleted.
              </span>
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deletingAll}
                onClick={() => {
                  setShowDeleteAllModal(false);
                  setDeleteAllConfirmed(false);
                }}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deleteAllConfirmed || deletingAll}
                onClick={handleDeleteAllLocations}
                className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition"
              >
                {deletingAll ? "Deleting..." : "Delete Everything"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hierarchical States & Cities Cards */}
      <div className="mt-8">
        <h2 className="text-xl font-black text-white mb-4">
          All States &amp; Cities
          {isSearching && (
            <span className="ml-2 text-xs font-normal text-amber-400">
              (Filtered by: &ldquo;{debouncedSearch}&rdquo;)
            </span>
          )}
        </h2>

        {loading ? (
          <AdminStateHierarchySkeleton />
        ) : states.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center text-slate-400 text-sm">
            No states added yet.
          </div>
        ) : filteredHierarchy.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center text-slate-400 text-sm">
            No matching states or cities.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHierarchy.map(({ state, stateKey, matchingCities }) => {
              const isStateExpanded =
                isSearching || expandedStates.has(stateKey);

              return (
                <StateHierarchyCard
                  key={stateKey}
                  state={state}
                  isExpanded={isStateExpanded}
                  matchingCities={matchingCities}
                  onToggleState={() => toggleState(stateKey)}
                  onRemoveCity={removeCity}
                  onRemoveState={removeState}
                  onCityAdded={load}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function StateHierarchyCard({
  state,
  isExpanded,
  matchingCities,
  onToggleState,
  onRemoveCity,
  onRemoveState,
  onCityAdded,
}: {
  state: StateRecord;
  isExpanded: boolean;
  matchingCities: CityRow[];
  onToggleState: () => void;
  onRemoveCity: (id?: string) => Promise<void>;
  onRemoveState: (id?: string) => Promise<void>;
  onCityAdded: () => Promise<void>;
}) {
  const [inlineCityName, setInlineCityName] = useState("");
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  async function handleAddCity(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inlineCityName.trim();
    if (!trimmed || isAddingCity) return;
    setIsAddingCity(true);

    try {
      const res = await fetch("/api/admin/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmed,
          state: state.name,
          region: state.name,
          country: "India",
        }),
      });
      if (res.ok) {
        setInlineCityName("");
        setShowAddForm(false);
        await onCityAdded();
      } else {
        alert("Failed to add city.");
      }
    } catch {
      alert("Failed to add city.");
    } finally {
      setIsAddingCity(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 shadow-xl transition-all">
      {/* State Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleState}
            aria-expanded={isExpanded}
            aria-label={`Toggle ${state.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-xs font-bold text-amber-400 hover:bg-slate-700 transition"
          >
            {isExpanded ? "▼" : "▶"}
          </button>
          <span
            onClick={onToggleState}
            className="cursor-pointer text-lg font-bold text-white hover:text-amber-400 transition"
          >
            {state.name}
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300 border border-white/5">
            {matchingCities.length} {matchingCities.length === 1 ? "City" : "Cities"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="rounded-xl border border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 text-xs font-semibold text-amber-300 transition"
          >
            {showAddForm ? "Cancel" : "+ Add City"}
          </button>
          <button
            type="button"
            onClick={() => onRemoveState(state._id || state.slug || state.name)}
            className="rounded-xl border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-300 transition"
          >
            Delete State
          </button>
        </div>
      </div>

      {/* Inline Add City in State Card */}
      {showAddForm && (
        <form onSubmit={handleAddCity} className="mt-4 flex flex-wrap gap-2 rounded-xl bg-slate-800/80 p-3 border border-amber-500/30">
          <input
            className="flex-1 min-w-[200px] rounded-lg border border-white/15 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:border-amber-500"
            value={inlineCityName}
            onChange={(e) => setInlineCityName(e.target.value)}
            placeholder={`Add city in ${state.name}...`}
            autoFocus
            required
          />
          <button
            type="submit"
            disabled={isAddingCity || !inlineCityName.trim()}
            className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
          >
            {isAddingCity ? "Adding..." : "Add"}
          </button>
        </form>
      )}

      {/* Expanded Cities List */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-white/10">
          {matchingCities.length === 0 ? (
            <p className="text-xs italic text-slate-500 py-2">
              No cities registered in this state yet.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {matchingCities.map((city) => {
                const citySlug =
                  city.slug ||
                  city.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

                return (
                  <div
                    key={city._id || city.name}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-3.5 py-2.5 transition hover:bg-slate-800"
                  >
                    <span className="font-semibold text-sm text-white truncate">
                      {city.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`/places/${encodeURIComponent(citySlug)}`}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-300 transition"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/city-seo?city=${encodeURIComponent(citySlug)}`}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-300 transition"
                      >
                        SEO
                      </Link>
                      <button
                        type="button"
                        onClick={() => onRemoveCity(city._id || city.name)}
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-300 transition"
                        title={`Delete ${city.name}`}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
