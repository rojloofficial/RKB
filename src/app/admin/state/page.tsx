"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminStateHierarchySkeleton } from "@/components/skeletons/admin-skeletons";

type StateRecord = {
  _id?: string;
  name: string;
  slug: string;
};

type CityRow = {
  _id?: string;
  name: string;
  region: string;
  state?: string;
  source?: "Custom" | "Static";
};

type LocalAreaRow = {
  _id?: string;
  name: string;
  slug: string;
  cityName: string;
  citySlug: string;
  stateName?: string;
};

type JsonSummary = {
  totalStates: number;
  totalCities: number;
  totalLocalAreas: number;
  newStates: number;
  newCities: number;
  newLocalAreas: number;
};

const COUNTRY_OPTIONS = ["India"];

// UI-only sentinel values for inline creation options
const ADD_CITY_VALUE = "__ADD_CITY__";
const ADD_LOCAL_AREA_VALUE = "__ADD_LOCAL_AREA__";

function normalizeState(s?: string): string {
  return (s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Dependency-free fuzzy matching:
 * Matches direct substring, token words, and character sequence.
 */
function fuzzyMatch(target: string, query: string): boolean {
  if (!query) return true;
  if (!target) return false;
  const t = target.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  // 1. Direct substring
  if (t.includes(q)) return true;

  // 2. Token / word-level match (all words in query must be in target)
  const tokens = q.split(/[\s\-_,]+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => t.includes(token))) {
    return true;
  }

  // 3. Subsequence matching (letters in query appear in order in target)
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
  const [states, setStates] = useState<StateRecord[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [allLocalAreas, setAllLocalAreas] = useState<LocalAreaRow[]>([]);
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
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());

  // Cascading Location Selector State: State -> City -> Local Area
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedLocalArea, setSelectedLocalArea] = useState("");

  // Inline Creation Form States
  const [newCityName, setNewCityName] = useState("");
  const [creatingCity, setCreatingCity] = useState(false);
  const [newLocalAreaName, setNewLocalAreaName] = useState("");
  const [creatingLocalArea, setCreatingLocalArea] = useState(false);

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

  // Load all States, Cities, and Local Areas
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes, aRes] = await Promise.all([
        fetch("/api/admin/states", { credentials: "include" }),
        fetch("/api/admin/cities", { credentials: "include" }),
        fetch("/api/admin/local-areas", { credentials: "include" }),
      ]);
      if (sRes.ok) setStates((await sRes.json()).states ?? []);
      if (cRes.ok) setCities((await cRes.json()).cities ?? []);
      if (aRes.ok) setAllLocalAreas((await aRes.json()).localAreas ?? []);
    } catch {
      setError("Failed to load data. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  // State Collapse Toggle
  function toggleState(stateKey: string) {
    setExpandedStates((prev) => {
      const next = new Set(prev);
      if (next.has(stateKey)) {
        next.delete(stateKey);
      } else {
        next.add(stateKey);
      }
      return next;
    });
  }

  // City Collapse Toggle
  function toggleCity(cityKey: string) {
    setExpandedCities((prev) => {
      const next = new Set(prev);
      if (next.has(cityKey)) {
        next.delete(cityKey);
      } else {
        next.add(cityKey);
      }
      return next;
    });
  }

  // Expand / Collapse All
  function handleExpandAll() {
    const allStateKeys = new Set(states.map((s) => s._id ?? s.slug ?? s.name));
    const allCityKeys = new Set(
      cities.map((c) => `${c.state ?? ""}-${c.name}`)
    );
    setExpandedStates(allStateKeys);
    setExpandedCities(allCityKeys);
  }

  function handleCollapseAll() {
    setExpandedStates(new Set());
    setExpandedCities(new Set());
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

        const matchingCities = stateCities
          .map((city) => {
            const cityKey = `${state.name}-${city.name}`;
            const cityMatches = fuzzyMatch(city.name, q);

            const cityAreas = allLocalAreas.filter(
              (a) =>
                a.cityName.toLowerCase() === city.name.toLowerCase() &&
                (!a.stateName ||
                  a.stateName.toLowerCase() === state.name.toLowerCase())
            );

            const matchingAreas = cityAreas.filter((area) =>
              fuzzyMatch(area.name, q)
            );

            const hasAreaMatch = matchingAreas.length > 0;
            const isCityVisible =
              !q || stateMatches || cityMatches || hasAreaMatch;

            return {
              city,
              cityKey,
              cityMatches,
              cityAreas,
              matchingAreas,
              hasAreaMatch,
              isCityVisible,
            };
          })
          .filter((c) => c.isCityVisible);

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
  }, [states, cities, allLocalAreas, debouncedSearch]);

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
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        setError((data.error as string) || "Failed to add state.");
        return;
      }
      setStateName("");
      setSuccess("State added successfully.");
      await load();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
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
      setSelectedLocalArea("");
      await load();
    } catch {
      setError("Failed to delete state.");
    }
  }

  // Local Area Delete
  async function handleDeleteLocalArea(id?: string) {
    if (!id) return;
    if (!confirm("Delete this local area?")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/local-areas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data.error as string) || "Failed to delete local area.");
        return;
      }
      setSuccess("Local area deleted.");
      await load();
    } catch {
      setError("Failed to delete local area.");
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
        `Import complete! Processed ${summary.totalStates} states (${summary.newStates} new), ${summary.totalCities} cities (${summary.newCities} new), and ${summary.totalLocalAreas} local areas (${summary.newLocalAreas} new).`
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
      setSelectedLocalArea("");
      setNewCityName("");
      setNewLocalAreaName("");
      setSuccess(
        (data.message as string) ||
          "All states, cities, and local areas have been permanently deleted."
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
    setSelectedLocalArea("");
    setNewCityName("");
    setNewLocalAreaName("");
    setError("");
  }

  function handleCitySelect(newCity: string) {
    setSelectedCity(newCity);
    setSelectedLocalArea("");
    setNewLocalAreaName("");
    setNewCityName("");
    setError("");
  }

  function handleLocalAreaSelect(newArea: string) {
    setSelectedLocalArea(newArea);
    setNewLocalAreaName("");
    setError("");
  }

  // Inline Add City Handler (triggered when + Add City is selected)
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
      // Expand the state where city was added so admin sees it immediately
      setExpandedStates((prev) => new Set(prev).add(selectedState));
      await load();
      // Select the newly created city and close inline form
      setSelectedCity(trimmed);
      setSelectedLocalArea("");
    } catch {
      setError("An error occurred while creating city.");
    } finally {
      setCreatingCity(false);
    }
  }

  // Inline Add Local Area Handler (triggered when + Add Local Area is selected)
  async function handleInlineAddLocalArea(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newLocalAreaName.trim();
    if (
      !selectedState ||
      !selectedCity ||
      selectedCity === ADD_CITY_VALUE ||
      !trimmed ||
      creatingLocalArea
    ) {
      return;
    }
    setCreatingLocalArea(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/local-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmed,
          cityName: selectedCity,
          stateName: selectedState,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) || "Failed to add local area.");
        return;
      }

      setSuccess(`Local area "${trimmed}" added successfully to ${selectedCity}.`);
      setNewLocalAreaName("");
      // Expand state and city in hierarchy
      setExpandedStates((prev) => new Set(prev).add(selectedState));
      setExpandedCities((prev) =>
        new Set(prev).add(`${selectedState}-${selectedCity}`)
      );
      await load();
      // Select the newly created local area and close inline form
      setSelectedLocalArea(trimmed);
    } catch {
      setError("An error occurred while adding local area.");
    } finally {
      setCreatingLocalArea(false);
    }
  }

  // Available Cities for currently selected State
  const citiesForSelectedState = useMemo(() => {
    if (!selectedState) return [];
    const sLower = selectedState.trim().toLowerCase();
    const sNorm = normalizeState(selectedState);
    return cities.filter((c) => {
      if (!c.state) return false;
      const cLower = c.state.trim().toLowerCase();
      return cLower === sLower || normalizeState(c.state) === sNorm;
    });
  }, [cities, selectedState]);

  // Available Local Areas for currently selected City & State
  const areasForSelectedCity = useMemo(() => {
    if (!selectedCity || selectedCity === ADD_CITY_VALUE) return [];
    const cLower = selectedCity.toLowerCase();
    const sLower = selectedState.toLowerCase();
    const sNorm = normalizeState(selectedState);
    return allLocalAreas.filter(
      (a) =>
        a.cityName.toLowerCase() === cLower &&
        (!a.stateName ||
          a.stateName.toLowerCase() === sLower ||
          normalizeState(a.stateName) === sNorm)
    );
  }, [allLocalAreas, selectedCity, selectedState]);

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
    <main className="p-4 sm:p-6 lg:p-10 min-w-0">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-red-950">States & Locations</h1>
          <p className="mt-2 text-red-900">
            Add states, manage cities, and manage local areas within each city.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white">
            Total States: {states.length}
          </span>
          <span className="rounded-full bg-pink-100 px-4 py-2 text-sm font-semibold text-red-950">
            Total Cities: {cities.length}
          </span>
          <span className="rounded-full bg-pink-100 px-4 py-2 text-sm font-semibold text-red-950">
            Total Areas: {allLocalAreas.length}
          </span>
          <button
            type="button"
            onClick={() => {
              setShowDeleteAllModal(true);
              setDeleteAllConfirmed(false);
            }}
            className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-xs font-bold text-red-800 hover:bg-red-100 hover:text-red-950 transition-colors"
          >
            Delete All Locations
          </button>
        </div>
      </div>

      {/* Search Bar + Controls */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            className="w-full rounded-xl border border-pink-200 bg-pink-50 px-3 py-2.5 text-red-950 outline-none focus:border-red-500 placeholder:text-red-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Fuzzy search State, City, or Area..."
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-xs font-bold text-red-500 hover:text-red-800"
              title="Clear search"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExpandAll}
            className="rounded-full border border-pink-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-900 hover:bg-pink-50"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="rounded-full border border-pink-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-900 hover:bg-pink-50"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Add State Form + Upload JSON Button */}
      <form
        onSubmit={addState}
        className="mt-6 flex flex-col gap-3 rounded-2xl border border-red-100 bg-white p-4 sm:p-5 lg:flex-row lg:items-end"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-red-900">
            New State
          </span>
          <input
            className="w-full rounded-xl border border-pink-200 bg-pink-50 px-3 py-2.5 text-red-950 outline-none focus:border-red-500"
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
            placeholder="State name"
            required
          />
        </label>
        <button
          type="submit"
          disabled={submitting || loading}
          className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Adding..." : "Add State"}
        </button>
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            type="button"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-red-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? "Processing..." : "Upload JSON"}
          </button>
          <button
            type="button"
            disabled={downloadingBackup || loading}
            onClick={handleDownloadBackup}
            className="rounded-full border border-pink-300 bg-pink-50 px-4 py-2.5 text-sm font-semibold text-red-950 hover:bg-pink-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingBackup ? "Exporting..." : "Download JSON Backup"}
          </button>
        </div>
      </form>

      {/* Cascading Location Selector + Inline Creation Options */}
      <section className="mt-4 rounded-2xl border border-red-100 bg-white p-5 shadow-xs">
        <h2 className="text-base font-bold text-red-950 mb-3">Location Selector</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* 1. State Dropdown */}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-red-900">
              State
            </span>
            <select
              className="w-full rounded-xl border border-pink-200 bg-pink-50 px-3 py-2.5 text-sm text-red-950 outline-none focus:border-red-500"
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

          {/* 2. City Dropdown */}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-red-900">
              City
            </span>
            <select
              className="w-full rounded-xl border border-pink-200 bg-pink-50 px-3 py-2.5 text-sm text-red-950 outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              value={selectedCity}
              onChange={(e) => handleCitySelect(e.target.value)}
              disabled={!selectedState}
            >
              <option value="">
                {!selectedState ? "-- Select State First --" : "-- Select City --"}
              </option>
              {citiesForSelectedState.map((c) => (
                <option key={`${c.source}-${c._id}`} value={c.name}>
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
                    className="font-bold text-red-600"
                  >
                    + Add City
                  </option>
                </>
              )}
            </select>
          </label>

          {/* 3. Local Area Dropdown */}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-red-900">
              Local Area
            </span>
            <select
              className="w-full rounded-xl border border-pink-200 bg-pink-50 px-3 py-2.5 text-sm text-red-950 outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              value={selectedLocalArea}
              onChange={(e) => handleLocalAreaSelect(e.target.value)}
              disabled={!selectedCity || selectedCity === ADD_CITY_VALUE}
            >
              <option value="">
                {!selectedCity || selectedCity === ADD_CITY_VALUE
                  ? "-- Select City First --"
                  : "-- Select Local Area --"}
              </option>
              {areasForSelectedCity.map((a) => (
                <option key={a._id ?? a.slug} value={a.name}>
                  {a.name}
                </option>
              ))}
              {selectedCity && selectedCity !== ADD_CITY_VALUE && (
                <>
                  <option disabled value="">
                    ────────────
                  </option>
                  <option
                    value={ADD_LOCAL_AREA_VALUE}
                    className="font-bold text-red-600"
                  >
                    + Add Local Area
                  </option>
                </>
              )}
            </select>
          </label>
        </div>

        {/* Inline Add City Form — Appears ONLY when + Add City is selected */}
        {selectedCity === ADD_CITY_VALUE && (
          <form
            onSubmit={handleInlineAddCity}
            className="mt-4 rounded-xl border border-pink-200 bg-pink-50/60 p-4"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-950">
                Add New City to <span className="text-red-600">{selectedState}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCity("")}
                className="text-xs font-medium text-red-600 hover:text-red-900"
              >
                Cancel
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="flex-1 min-w-[200px] rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm text-red-950 outline-none focus:border-red-500 placeholder:text-red-400"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder="Enter city name..."
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={creatingCity || !newCityName.trim()}
                className="rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creatingCity ? "Adding..." : "Add City"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedCity("")}
                className="rounded-full border border-pink-200 bg-white px-4 py-2 text-xs font-semibold text-red-950 hover:bg-pink-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Inline Add Local Area Form — Appears ONLY when + Add Local Area is selected */}
        {selectedLocalArea === ADD_LOCAL_AREA_VALUE && (
          <form
            onSubmit={handleInlineAddLocalArea}
            className="mt-4 rounded-xl border border-pink-200 bg-pink-50/60 p-4"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-950">
                Add New Local Area to <span className="text-red-600">{selectedCity}</span>, {selectedState}
              </span>
              <button
                type="button"
                onClick={() => setSelectedLocalArea("")}
                className="text-xs font-medium text-red-600 hover:text-red-900"
              >
                Cancel
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="flex-1 min-w-[200px] rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm text-red-950 outline-none focus:border-red-500 placeholder:text-red-400"
                value={newLocalAreaName}
                onChange={(e) => setNewLocalAreaName(e.target.value)}
                placeholder="Enter local area name..."
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={creatingLocalArea || !newLocalAreaName.trim()}
                className="rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creatingLocalArea ? "Adding..." : "Add Local Area"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedLocalArea("")}
                className="rounded-full border border-pink-200 bg-white px-4 py-2 text-xs font-semibold text-red-950 hover:bg-pink-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Feedback Messages */}
      {error && <p className="mt-4 text-sm font-medium text-red-700">{error}</p>}
      {success && <p className="mt-4 text-sm font-medium text-emerald-700">{success}</p>}

      {/* JSON Import Confirmation Modal */}
      {importSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-black text-red-950">Confirm JSON Import</h3>
            <p className="mt-2 text-sm text-red-900">
              The JSON file was successfully validated. Review the detected locations below:
            </p>
            <div className="mt-4 space-y-2 rounded-xl bg-pink-50 p-4 text-sm text-red-950">
              <div className="flex justify-between">
                <span>States:</span>
                <span className="font-bold">
                  {importSummary.totalStates} ({importSummary.newStates} new)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cities:</span>
                <span className="font-bold">
                  {importSummary.totalCities} ({importSummary.newCities} new)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Local Areas:</span>
                <span className="font-bold">
                  {importSummary.totalLocalAreas} ({importSummary.newLocalAreas} new)
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={importing}
                onClick={cancelImport}
                className="rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-red-950 hover:bg-pink-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={confirmImport}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {importing ? "Importing..." : "Confirm & Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Locations Double-Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border-2 border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <span className="text-xl">⚠️</span>
              <h3 className="text-xl font-black text-red-950">Delete All Locations?</h3>
            </div>

            <p className="mt-3 text-sm text-red-900">
              This is a permanent destructive action. It will immediately and irreversibly delete:
            </p>

            <ul className="mt-3 space-y-1.5 rounded-xl bg-red-50 p-3.5 text-sm text-red-950 border border-red-200">
              <li className="flex justify-between">
                <span>• All States:</span>
                <span className="font-bold text-red-700">{states.length}</span>
              </li>
              <li className="flex justify-between">
                <span>• All Cities:</span>
                <span className="font-bold text-red-700">{cities.length}</span>
              </li>
              <li className="flex justify-between">
                <span>• All Local Areas:</span>
                <span className="font-bold text-red-700">{allLocalAreas.length}</span>
              </li>
            </ul>

            <p className="mt-3 text-xs font-semibold text-red-700">
              This action cannot be undone. All user-facing location dropdowns, listings, and places will have zero locations until new data is imported.
            </p>

            {/* Explicit double-confirmation checkbox */}
            <label className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-pink-50/50 p-3 text-xs font-medium text-red-950 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteAllConfirmed}
                onChange={(e) => setDeleteAllConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
              />
              <span>
                I understand that all states, cities, and local areas will be permanently deleted.
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
                className="rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-red-950 hover:bg-pink-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deleteAllConfirmed || deletingAll}
                onClick={handleDeleteAllLocations}
                className="rounded-full bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {deletingAll ? "Deleting Everything..." : "Delete Everything"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hierarchical States, Cities & Local Areas Cards */}
      <div className="mt-8">
        <h2 className="text-xl font-black text-red-950 mb-4">
          All States, Cities & Local Areas
          {isSearching && (
            <span className="ml-2 text-xs font-normal text-red-700">
              (Filtered by: &ldquo;{debouncedSearch}&rdquo;)
            </span>
          )}
        </h2>

        {loading ? (
          <AdminStateHierarchySkeleton />
        ) : states.length === 0 ? (
          <p className="text-red-900">No states added yet.</p>
        ) : filteredHierarchy.length === 0 ? (
          <p className="text-red-900">No matching states, cities, or local areas.</p>
        ) : (
          <div className="space-y-4">
            {filteredHierarchy.map(({ state, stateKey, matchingCities }) => {
              // Auto-expand if search query active, otherwise check manual state set
              const isStateExpanded =
                isSearching || expandedStates.has(stateKey);

              return (
                <StateHierarchyCard
                  key={stateKey}
                  state={state}
                  isExpanded={isStateExpanded}
                  isSearching={isSearching}
                  matchingCities={matchingCities}
                  expandedCities={expandedCities}
                  onToggleState={() => toggleState(stateKey)}
                  onToggleCity={toggleCity}
                  onDeleteLocalArea={handleDeleteLocalArea}
                  onChanged={load}
                  onRemoveState={removeState}
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
  isSearching,
  matchingCities,
  expandedCities,
  onToggleState,
  onToggleCity,
  onDeleteLocalArea,
  onChanged,
  onRemoveState,
}: {
  state: StateRecord;
  isExpanded: boolean;
  isSearching: boolean;
  matchingCities: Array<{
    city: CityRow;
    cityKey: string;
    cityMatches: boolean;
    cityAreas: LocalAreaRow[];
    matchingAreas: LocalAreaRow[];
    hasAreaMatch: boolean;
  }>;
  expandedCities: Set<string>;
  onToggleState: () => void;
  onToggleCity: (cityKey: string) => void;
  onDeleteLocalArea: (id?: string) => Promise<void>;
  onChanged: () => void;
  onRemoveState: (id?: string) => void;
}) {
  const [cityName, setCityName] = useState("");
  const [country, setCountry] = useState("India");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalAreasInState = matchingCities.reduce(
    (acc, curr) => acc + curr.cityAreas.length,
    0
  );

  async function addCity(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: cityName,
          country,
          state: state.name,
        }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        setError((data.error as string) || "Failed to add city.");
        return;
      }
      setCityName("");
      setCountry("India");
      onChanged();
    } catch {
      setError("Something went wrong. Please try again.");
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
      onChanged();
    } catch {
      setError("Failed to delete city.");
    }
  }

  return (
    <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
      {/* State Header with Accessible Collapse/Expand Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleState}
            aria-expanded={isExpanded}
            aria-label={`Toggle ${state.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-pink-200 bg-pink-50 text-xs font-bold text-red-950 transition-colors hover:bg-pink-100"
          >
            {isExpanded ? "▼" : "▶"}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2
                onClick={onToggleState}
                className="cursor-pointer text-xl font-black text-red-950 hover:text-red-700"
              >
                {state.name}
              </h2>
              <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-semibold text-red-900">
                {matchingCities.length} {matchingCities.length === 1 ? "City" : "Cities"}
              </span>
              {totalAreasInState > 0 && (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-800">
                  {totalAreasInState} {totalAreasInState === 1 ? "Area" : "Areas"}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemoveState(state._id || state.slug || state.name)}
          className="rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
        >
          Delete State
        </button>
      </div>

      {/* Collapsible Content: Add City Form + Cities List */}
      {isExpanded && (
        <div className="mt-5 border-t border-pink-100 pt-4">
          {/* Add City Form */}
          <form onSubmit={addCity} className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-red-900">
                City Name
              </span>
              <input
                className="w-full rounded-xl border border-pink-200 bg-pink-50 px-3 py-2.5 text-red-950 outline-none focus:border-red-500 text-sm"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="City name"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-red-900">
                Country
              </span>
              <select
                className="w-full rounded-xl border border-pink-200 bg-pink-50 px-3 py-2.5 text-red-950 outline-none focus:border-red-500 text-sm"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Adding..." : "Add City"}
              </button>
            </div>
          </form>

          {error && (
            <p className="mt-3 text-sm font-medium text-red-700">{error}</p>
          )}

          {/* Cities & Local Areas List */}
          <div className="mt-5 space-y-3">
            {matchingCities.length === 0 ? (
              <p className="text-xs text-red-900 italic">No cities in this state yet.</p>
            ) : (
              matchingCities.map(
                ({
                  city,
                  cityKey,
                  cityAreas,
                  hasAreaMatch,
                }) => {
                  const isCityExpanded =
                    (isSearching && hasAreaMatch) ||
                    expandedCities.has(cityKey);

                  return (
                    <CityHierarchyItem
                      key={`${city.source}-${city._id || city.name}`}
                      city={city}
                      stateName={state.name}
                      cityAreas={cityAreas}
                      isExpanded={isCityExpanded}
                      onToggleCity={() => onToggleCity(cityKey)}
                      onDeleteCity={() => removeCity(city._id || city.name)}
                      onDeleteLocalArea={onDeleteLocalArea}
                      onChanged={onChanged}
                    />
                  );
                }
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function CityHierarchyItem({
  city,
  stateName,
  cityAreas,
  isExpanded,
  onToggleCity,
  onDeleteCity,
  onDeleteLocalArea,
  onChanged,
}: {
  city: CityRow;
  stateName: string;
  cityAreas: LocalAreaRow[];
  isExpanded: boolean;
  onToggleCity: () => void;
  onDeleteCity: () => void;
  onDeleteLocalArea: (id?: string) => Promise<void>;
  onChanged: () => void;
}) {
  const [newArea, setNewArea] = useState("");
  const [addingArea, setAddingArea] = useState(false);
  const [areaError, setAreaError] = useState("");

  async function handleAddArea(e: React.FormEvent) {
    e.preventDefault();
    if (!newArea.trim() || addingArea) return;
    setAddingArea(true);
    setAreaError("");
    try {
      const res = await fetch("/api/admin/local-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newArea.trim(),
          cityName: city.name,
          stateName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAreaError((data.error as string) || "Failed to add local area.");
        return;
      }
      setNewArea("");
      onChanged();
    } catch {
      setAreaError("Failed to add local area.");
    } finally {
      setAddingArea(false);
    }
  }

  return (
    <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-3.5 transition-colors">
      {/* City Header with Expand/Collapse Icon */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={onToggleCity}
            aria-expanded={isExpanded}
            aria-label={`Toggle ${city.name}`}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-pink-200 bg-white text-[10px] font-bold text-red-950 hover:bg-pink-100"
          >
            {isExpanded ? "▼" : "▶"}
          </button>
          <span
            onClick={onToggleCity}
            className="cursor-pointer font-bold text-sm text-red-950 hover:text-red-700"
          >
            {city.name}
          </span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-red-900 border border-pink-100">
            {cityAreas.length} {cityAreas.length === 1 ? "Area" : "Areas"}
          </span>
        </div>

        <button
          type="button"
          onClick={onDeleteCity}
          className="rounded-full bg-neutral-950 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-neutral-800"
        >
          Delete City
        </button>
      </div>

      {/* Collapsible Local Areas Section */}
      {isExpanded && (
        <div className="mt-3 pl-4 sm:pl-8">
          <div className="rounded-xl border-l-2 border-pink-300 bg-pink-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-950">
                Local Areas {cityAreas.length > 0 && `(${cityAreas.length})`}
              </h4>
            </div>

            {/* Local Areas List */}
            {cityAreas.length === 0 ? (
              <p className="text-xs italic text-red-700">No local areas</p>
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {cityAreas.map((area) => (
                  <li
                    key={area._id ?? area.slug}
                    className="flex items-center justify-between gap-2 rounded-lg border border-pink-200 bg-white px-3 py-1.5 text-xs text-red-950 shadow-2xs"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="text-red-500 font-bold">•</span>
                      <span className="font-medium truncate">{area.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteLocalArea(area._id)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-red-500 hover:bg-red-100 hover:text-red-800 font-bold text-sm transition-colors"
                      title={`Delete ${area.name}`}
                      aria-label={`Delete ${area.name}`}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Quick Add Area Inline Form */}
            <form onSubmit={handleAddArea} className="mt-3 flex flex-wrap gap-2 pt-1">
              <input
                className="flex-1 min-w-[180px] rounded-xl border border-pink-200 bg-white px-3 py-1.5 text-xs text-red-950 outline-none focus:border-red-500 placeholder:text-red-400"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Local area name..."
                required
              />
              <button
                type="submit"
                disabled={addingArea || !newArea.trim()}
                className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addingArea ? "Adding..." : "Add Local Area"}
              </button>
            </form>
            {areaError && (
              <p className="text-xs font-medium text-red-700">{areaError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

