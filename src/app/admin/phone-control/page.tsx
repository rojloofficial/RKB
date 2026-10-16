"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";
import { formatDisplayDateTime } from "@/lib/date";

type StateItem = {
  _id?: string;
  name: string;
  slug: string;
};

type CityItem = {
  _id?: string;
  name: string;
  slug: string;
  state?: string;
  region?: string;
};

type OverrideItem = {
  _id: string;
  vipEmail: string;
  city: string;
  state?: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  deleteUserPhone: boolean;
  active: boolean;
  createdBy?: "admin" | "vip";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

type CityPhoneStats = {
  totalAds: number;
  totalPhones: number;
  uniquePhones: number;
};

export default function AdminPhoneControlPage() {
  const router = useRouter();
  const me = useAdminContext();

  const [states, setStates] = useState<StateItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [overrides, setOverrides] = useState<OverrideItem[]>([]);
  const [cityStats, setCityStats] = useState<Record<string, CityPhoneStats>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [telegram, setTelegram] = useState("");
  const [deleteUserPhone, setDeleteUserPhone] = useState(false);

  // Filter / search for override list
  const [searchQuery, setSearchQuery] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Auth guard
  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }
    if (me.role !== "main" && (!me.permissions || !me.permissions.includes("phone-control"))) {
      router.replace("/admin");
      return;
    }
    loadData();
  }, [me, router]);

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/phone-control", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        const stateList: StateItem[] = Array.isArray(data.states) ? data.states : [];
        stateList.sort((a, b) => a.name.localeCompare(b.name));
        setStates(stateList);

        const cityList: CityItem[] = Array.isArray(data.cities) ? data.cities : [];
        cityList.sort((a, b) => a.name.localeCompare(b.name));
        setCities(cityList);

        const overrideList: OverrideItem[] = Array.isArray(data.overrides) ? data.overrides : [];
        setOverrides(overrideList);

        setCityStats(data.cityStats || {});
      } else {
        setError(data.error || "Failed to load phone control data.");
      }
    } catch {
      setError("Failed to load phone control data.");
    } finally {
      setLoading(false);
    }
  }

  // Filtered cities based on selected state
  const availableCities = useMemo(() => {
    if (!selectedState) return cities;
    return cities.filter(
      (c) => (c.state ?? "").trim().toLowerCase() === selectedState.trim().toLowerCase()
    );
  }, [cities, selectedState]);

  // Handle state change
  function handleStateChange(stateVal: string) {
    setSelectedState(stateVal);
    // If the currently selected city doesn't belong to this state, reset city
    if (stateVal && selectedCity) {
      const cityObj = cities.find(
        (c) => c.name.toLowerCase() === selectedCity.trim().toLowerCase()
      );
      if (cityObj && (cityObj.state ?? "").trim().toLowerCase() !== stateVal.trim().toLowerCase()) {
        setSelectedCity("");
        resetFormInputs();
      }
    }
  }

  // Handle city selection
  function handleCityChange(cityVal: string) {
    setSelectedCity(cityVal);
    if (!cityVal) {
      resetFormInputs();
      return;
    }

    // Automatically set state if known from city object
    const cityObj = cities.find(
      (c) => c.name.toLowerCase() === cityVal.trim().toLowerCase()
    );
    if (cityObj?.state && !selectedState) {
      setSelectedState(cityObj.state);
    }

    // Check if an override already exists for this city
    const existing = overrides.find(
      (o) => o.city.toLowerCase() === cityVal.trim().toLowerCase()
    );
    if (existing) {
      setPhone(existing.phone || "");
      setWhatsapp(existing.whatsapp || "");
      setTelegram(existing.telegram || "");
      setDeleteUserPhone(Boolean(existing.deleteUserPhone));
    } else {
      resetFormInputs();
    }
  }

  function resetFormInputs() {
    setPhone("");
    setWhatsapp("");
    setTelegram("");
    setDeleteUserPhone(false);
  }

  // Stats for the currently selected city
  const selectedCityStats = useMemo(() => {
    if (!selectedCity) return null;
    return cityStats[selectedCity.trim().toLowerCase()] || { totalAds: 0, totalPhones: 0, uniquePhones: 0 };
  }, [selectedCity, cityStats]);

  // Is the currently selected city already overridden?
  const existingOverrideForSelectedCity = useMemo(() => {
    if (!selectedCity) return null;
    return overrides.find(
      (o) => o.city.toLowerCase() === selectedCity.trim().toLowerCase()
    );
  }, [selectedCity, overrides]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      if (!selectedCity.trim()) {
        throw new Error("Please select a city.");
      }

      if (!phone.trim() && !whatsapp.trim() && !telegram.trim() && !deleteUserPhone) {
        throw new Error(
          "Please enter at least a Phone No., WhatsApp, Telegram, or choose to delete/hide original user numbers."
        );
      }

      const cityObj = cities.find(
        (c) => c.name.toLowerCase() === selectedCity.trim().toLowerCase()
      );
      const stateToSave = selectedState || cityObj?.state || "";

      const payload = {
        city: selectedCity.trim(),
        state: stateToSave,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        telegram: telegram.trim(),
        deleteUserPhone,
      };

      const res = await fetch("/api/admin/phone-control", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save phone override.");
      }

      setSuccess(`Phone & contact override for "${selectedCity}" saved successfully!`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save phone override.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, cityName: string) {
    if (
      !confirm(
        `Remove contact override for ${cityName}? Ads in ${cityName} will immediately revert to displaying their original user numbers.`
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      const res = await fetch("/api/admin/phone-control", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete override.");
      }

      setSuccess(`Override for ${cityName} removed. Original user numbers restored.`);
      if (selectedCity.toLowerCase() === cityName.toLowerCase()) {
        resetFormInputs();
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove override.");
    }
  }

  function handleEditOverride(item: OverrideItem) {
    if (item.state) {
      setSelectedState(item.state);
    }
    setSelectedCity(item.city);
    setPhone(item.phone || "");
    setWhatsapp(item.whatsapp || "");
    setTelegram(item.telegram || "");
    setDeleteUserPhone(Boolean(item.deleteUserPhone));

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Filter overrides list
  const filteredOverrides = useMemo(() => {
    if (!searchQuery.trim()) return overrides;
    const q = searchQuery.trim().toLowerCase();
    return overrides.filter(
      (o) =>
        o.city.toLowerCase().includes(q) ||
        (o.state && o.state.toLowerCase().includes(q)) ||
        o.phone.includes(q) ||
        o.whatsapp.includes(q) ||
        o.telegram.toLowerCase().includes(q)
    );
  }, [overrides, searchQuery]);

  if (!me || !me.authenticated) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 shadow-inner">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </span>
            <span>Phone No. Control</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
            Override contact numbers on posted ads by State and City. Set custom Phone Number, WhatsApp, and Telegram, or choose to delete/hide original users&apos; contact details. Overrides take top priority on ads until removed.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-900/80 border border-amber-500/30 px-5 py-3 text-right shadow-xl">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Active Overrides
            </div>
            <div className="text-2xl font-black text-white">
              {overrides.length}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300 font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-rose-400 hover:text-rose-200 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="mt-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-300 font-semibold flex items-center justify-between">
          <span>{success}</span>
          <button
            onClick={() => setSuccess("")}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Control / Assignment Form Card */}
      <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-5">
          <div>
            <h2 className="text-xl font-black text-white">
              {existingOverrideForSelectedCity ? "Update City Override" : "Create City Override"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select a state and city to inspect contact statistics and apply overriding phone numbers.
            </p>
          </div>
          {existingOverrideForSelectedCity && (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/40 px-3.5 py-1 text-xs font-bold text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Existing Override Active for {selectedCity}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Location Selectors: State & City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* State Dropdown */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-1.5">
                Select State
              </label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition"
              >
                <option value="" className="bg-slate-900 text-slate-300">-- All States ({states.length} available) --</option>
                {states.map((s) => (
                  <option key={s.slug || s.name} value={s.name} className="bg-slate-900 text-white">
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Filter city list by state, or leave as All States.
              </p>
            </div>

            {/* City Dropdown */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-1.5">
                Select City <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                required
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition"
              >
                <option value="" className="bg-slate-900 text-slate-300">-- Select City ({availableCities.length} available) --</option>
                {availableCities.map((c) => (
                  <option key={c.slug || c.name} value={c.name} className="bg-slate-900 text-white">
                    {c.name} {c.state ? `(${c.state})` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Ads posted in this city will have their contact numbers overridden.
              </p>
            </div>
          </div>

          {/* Selected City Numbers / Ad Count Statistics Display */}
          {selectedCity && selectedCityStats && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-500/30 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    City Phone & Ad Statistics
                  </div>
                  <h3 className="text-lg font-black text-white mt-0.5">
                    {selectedCity} {selectedState ? `(${selectedState})` : ""}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="rounded-xl bg-slate-900/90 border border-white/10 px-4 py-2 text-center shadow-md">
                    <div className="text-xs text-slate-400 font-semibold">Total User Ads</div>
                    <div className="text-xl font-black text-amber-400">
                      {selectedCityStats.totalAds}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-900/90 border border-white/10 px-4 py-2 text-center shadow-md">
                    <div className="text-xs text-slate-400 font-semibold">Ads With Phone</div>
                    <div className="text-xl font-black text-white">
                      {selectedCityStats.totalPhones}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-900/90 border border-white/10 px-4 py-2 text-center shadow-md">
                    <div className="text-xs text-slate-400 font-semibold">Unique User Numbers</div>
                    <div className="text-xl font-black text-amber-400">
                      {selectedCityStats.uniquePhones}
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Overriding will replace user contact numbers across all{" "}
                <strong className="text-amber-400">{selectedCityStats.totalAds}</strong> ads posted in <strong className="text-white">{selectedCity}</strong>.
              </p>
            </div>
          )}

          {/* Number Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Phone No */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-1.5">
                Overriding Phone No.
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onKeyDown={(e) => {
                  if (
                    e.ctrlKey ||
                    e.metaKey ||
                    [
                      "Backspace",
                      "Delete",
                      "Tab",
                      "Escape",
                      "Enter",
                      "ArrowLeft",
                      "ArrowRight",
                      "Home",
                      "End",
                    ].includes(e.key)
                  ) return;
                  if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                }}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 9876543210"
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
              />
              <p className="mt-1 text-xs text-slate-500">
                Shown as caller phone number on all ads in this city.
              </p>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-1.5">
                Overriding WhatsApp Number
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={whatsapp}
                onKeyDown={(e) => {
                  if (
                    e.ctrlKey ||
                    e.metaKey ||
                    [
                      "Backspace",
                      "Delete",
                      "Tab",
                      "Escape",
                      "Enter",
                      "ArrowLeft",
                      "ArrowRight",
                      "Home",
                      "End",
                    ].includes(e.key)
                  ) return;
                  if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                }}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 9876543210"
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
              />
              <p className="mt-1 text-xs text-slate-500">
                Used for the WhatsApp chat button on all ads in this city.
              </p>
            </div>

            {/* Telegram */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-1.5">
                Overriding Telegram
              </label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="e.g. @adminhandle or https://t.me/handle"
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
              />
              <p className="mt-1 text-xs text-slate-500">
                Used for the Telegram contact button on ads in this city.
              </p>
            </div>
          </div>

          {/* Delete User Phone No Option */}
          <div className="rounded-2xl bg-slate-800/60 border border-white/10 p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteUserPhone}
                onChange={(e) => setDeleteUserPhone(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 text-amber-500 accent-amber-500 focus:ring-0"
              />
              <div>
                <span className="text-sm font-bold text-white block">
                  Delete / Hide original users&apos; phone numbers on ads in this city
                </span>
                <span className="text-xs text-slate-400 block mt-1 leading-relaxed">
                  When enabled, all posted ads in <strong className="text-amber-400">{selectedCity || "the selected city"}</strong> will hide original users&apos; phone numbers and only show the overriding numbers set above. If any of phone, WhatsApp, or Telegram are left empty, that contact method will be hidden from the ad.
                </span>
              </div>
            </label>
          </div>

          {/* Submit & Reset Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              {existingOverrideForSelectedCity && (
                <button
                  type="button"
                  onClick={() =>
                    handleDelete(
                      existingOverrideForSelectedCity._id,
                      existingOverrideForSelectedCity.city
                    )
                  }
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
                >
                  Remove Override for {selectedCity}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedCity("");
                  resetFormInputs();
                }}
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={saving || !selectedCity}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition flex items-center gap-2 active:scale-[0.98]"
              >
                {saving && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                )}
                {existingOverrideForSelectedCity ? "Update Override" : "Save Override"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* List of Numbers Overriding User Numbers by Admin */}
      <div className="mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <span>List of Numbers Overriding User Numbers</span>
              <span className="rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30">
                {overrides.length} {overrides.length === 1 ? "City" : "Cities"}
              </span>
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Active admin overrides. These replace original user phone numbers on the live website. Removing an override immediately restores original numbers.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, state, or phone..."
              className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        {loading ? (
          <div className="mt-4">
            <AdminTableSkeleton
              headers={["City & State", "Overriding Phone", "WhatsApp", "Telegram", "Mode", "Affected Ads", "Actions"]}
            />
          </div>
        ) : filteredOverrides.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
            {searchQuery
              ? `No overrides match "${searchQuery}".`
              : "No contact overrides are currently configured by admin. Ads in all cities are currently displaying their original posted user numbers."}
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 border-b border-white/10 text-xs uppercase font-bold text-amber-400">
                  <tr>
                    <th className="px-5 py-3.5">City & State</th>
                    <th className="px-5 py-3.5">Overriding Phone</th>
                    <th className="px-5 py-3.5">WhatsApp</th>
                    <th className="px-5 py-3.5">Telegram</th>
                    <th className="px-5 py-3.5">Mode</th>
                    <th className="px-5 py-3.5">City Numbers</th>
                    <th className="px-5 py-3.5">Updated</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOverrides.map((item) => {
                    const stats = cityStats[item.city.toLowerCase()] || {
                      totalAds: 0,
                      totalPhones: 0,
                      uniquePhones: 0,
                    };

                    return (
                      <tr key={item._id} className="hover:bg-slate-800/40 transition">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white text-base">{item.city}</div>
                          {item.state && (
                            <div className="text-xs text-slate-400">{item.state}</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {item.phone ? (
                            <span className="font-mono font-bold text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30">
                              {item.phone}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Not set</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {item.whatsapp ? (
                            <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                              {item.whatsapp}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Not set</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {item.telegram ? (
                            <span className="font-mono text-xs font-semibold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded border border-sky-500/30">
                              {item.telegram}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Not set</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              item.deleteUserPhone
                                ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                item.deleteUserPhone ? "bg-rose-400" : "bg-emerald-400"
                              }`}
                            />
                            {item.deleteUserPhone ? "User Numbers Hidden" : "Numbers Overridden"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs font-bold text-white">
                            {stats.totalAds} Ads
                          </div>
                          <div className="text-xs text-slate-400">
                            {stats.uniquePhones} unique numbers
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400">
                          {formatDisplayDateTime(item.updatedAt || item.createdAt)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditOverride(item)}
                              className="rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item._id, item.city)}
                              className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
                            >
                              Remove
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
      </div>
    </div>
  );
}
