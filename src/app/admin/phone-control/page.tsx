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
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-red-100">
        <div>
          <h1 className="text-3xl font-black text-red-950 flex items-center gap-3">
            <svg
              className="w-8 h-8 text-red-800"
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
            Phone No. Control
          </h1>
          <p className="mt-1 text-sm text-red-900 max-w-3xl">
            Override contact numbers on posted ads by State and City. Set custom Phone Number, WhatsApp, and Telegram, or choose to delete/hide original users&apos; contact details. Overrides take top priority on ads until removed.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-2.5 text-right">
            <div className="text-xs font-semibold text-red-800 uppercase tracking-wider">
              Active Overrides
            </div>
            <div className="text-2xl font-black text-red-950">
              {overrides.length}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl bg-red-100 border border-red-200 p-4 text-sm text-red-900 font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-red-700 hover:text-red-900 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="mt-6 rounded-xl bg-green-100 border border-green-200 p-4 text-sm text-green-900 font-semibold flex items-center justify-between">
          <span>{success}</span>
          <button
            onClick={() => setSuccess("")}
            className="text-green-700 hover:text-green-900 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Control / Assignment Form Card */}
      <div className="mt-8 rounded-3xl border border-red-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-red-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-red-950">
              {existingOverrideForSelectedCity ? "Update City Override" : "Create City Override"}
            </h2>
            <p className="text-xs text-red-700 mt-0.5">
              Select a state and city to inspect contact statistics and apply overriding phone numbers.
            </p>
          </div>
          {existingOverrideForSelectedCity && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-900">
              <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
              Existing Override Active for {selectedCity}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Location Selectors: State & City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* State Dropdown */}
            <div>
              <label className="block text-sm font-bold text-red-950 mb-1.5">
                Select State
              </label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-red-950 outline-none focus:border-red-400"
              >
                <option value="">-- All States ({states.length} available) --</option>
                {states.map((s) => (
                  <option key={s.slug || s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-red-600">
                Filter city list by state, or leave as All States.
              </p>
            </div>

            {/* City Dropdown */}
            <div>
              <label className="block text-sm font-bold text-red-950 mb-1.5">
                Select City <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                required
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-red-950 outline-none focus:border-red-400"
              >
                <option value="">-- Select City ({availableCities.length} available) --</option>
                {availableCities.map((c) => (
                  <option key={c.slug || c.name} value={c.name}>
                    {c.name} {c.state ? `(${c.state})` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-red-600">
                Ads posted in this city will have their contact numbers overridden.
              </p>
            </div>
          </div>

          {/* Selected City Numbers / Ad Count Statistics Display */}
          {selectedCity && selectedCityStats && (
            <div className="rounded-2xl bg-gradient-to-r from-red-50 via-pink-50 to-red-50 border border-red-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-red-800">
                    City Phone & Ad Statistics
                  </div>
                  <h3 className="text-lg font-black text-red-950 mt-0.5">
                    {selectedCity} {selectedState ? `(${selectedState})` : ""}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="rounded-xl bg-white border border-red-200 px-4 py-2 text-center shadow-xs">
                    <div className="text-xs text-red-700 font-semibold">Total User Ads</div>
                    <div className="text-xl font-black text-red-950">
                      {selectedCityStats.totalAds}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border border-red-200 px-4 py-2 text-center shadow-xs">
                    <div className="text-xs text-red-700 font-semibold">Ads With Phone</div>
                    <div className="text-xl font-black text-red-950">
                      {selectedCityStats.totalPhones}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border border-red-200 px-4 py-2 text-center shadow-xs">
                    <div className="text-xs text-red-700 font-semibold">Unique User Numbers</div>
                    <div className="text-xl font-black text-red-950">
                      {selectedCityStats.uniquePhones}
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-red-800">
                Overriding will replace user contact numbers across all{" "}
                <strong>{selectedCityStats.totalAds}</strong> ads posted in <strong>{selectedCity}</strong>.
              </p>
            </div>
          )}

          {/* Number Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Phone No */}
            <div>
              <label className="block text-sm font-bold text-red-950 mb-1.5">
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
                className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-950 outline-none focus:border-red-400"
              />
              <p className="mt-1 text-xs text-red-600">
                Shown as caller phone number on all ads in this city.
              </p>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-bold text-red-950 mb-1.5">
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
                className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-950 outline-none focus:border-red-400"
              />
              <p className="mt-1 text-xs text-red-600">
                Used for the WhatsApp chat button on all ads in this city.
              </p>
            </div>

            {/* Telegram */}
            <div>
              <label className="block text-sm font-bold text-red-950 mb-1.5">
                Overriding Telegram
              </label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="e.g. @adminhandle or https://t.me/handle"
                className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm text-red-950 outline-none focus:border-red-400"
              />
              <p className="mt-1 text-xs text-red-600">
                Used for the Telegram contact button on ads in this city.
              </p>
            </div>
          </div>

          {/* Delete User Phone No Option */}
          <div className="rounded-2xl bg-red-50/70 border border-red-200 p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteUserPhone}
                onChange={(e) => setDeleteUserPhone(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-red-300 text-red-800 accent-red-800"
              />
              <div>
                <span className="text-sm font-bold text-red-950 block">
                  Delete / Hide original users&apos; phone numbers on ads in this city
                </span>
                <span className="text-xs text-red-700 block mt-0.5 leading-relaxed">
                  When enabled, all posted ads in <strong>{selectedCity || "the selected city"}</strong> will hide original users&apos; phone numbers and only show the overriding numbers set above. If any of phone, WhatsApp, or Telegram are left empty, that contact method will be hidden from the ad.
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
                  className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-800 hover:bg-red-100 transition"
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
                className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={saving || !selectedCity}
                className="rounded-xl bg-neutral-950 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition flex items-center gap-2"
              >
                {saving && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
            <h2 className="text-2xl font-black text-red-950 flex items-center gap-2">
              List of Numbers Overriding User Numbers
              <span className="rounded-full bg-red-100 px-3 py-0.5 text-xs font-bold text-red-900 border border-red-200">
                {overrides.length} {overrides.length === 1 ? "City" : "Cities"}
              </span>
            </h2>
            <p className="mt-1 text-xs text-red-700">
              Active admin overrides. These replace original user phone numbers on the live website. Removing an override immediately restores original numbers.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, state, or phone..."
              className="w-full rounded-xl border border-red-200 bg-white px-4 py-2 text-xs text-red-950 outline-none focus:border-red-400"
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
          <div className="mt-4 rounded-2xl border border-red-200 bg-white p-8 text-center text-sm text-red-800">
            {searchQuery
              ? `No overrides match "${searchQuery}".`
              : "No contact overrides are currently configured by admin. Ads in all cities are currently displaying their original posted user numbers."}
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-red-950">
                <thead className="bg-red-50/70 border-b border-red-100 text-xs uppercase font-bold text-red-900">
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
                <tbody className="divide-y divide-red-100">
                  {filteredOverrides.map((item) => {
                    const stats = cityStats[item.city.toLowerCase()] || {
                      totalAds: 0,
                      totalPhones: 0,
                      uniquePhones: 0,
                    };

                    return (
                      <tr key={item._id} className="hover:bg-red-50/40 transition">
                        <td className="px-5 py-4">
                          <div className="font-bold text-red-950 text-base">{item.city}</div>
                          {item.state && (
                            <div className="text-xs text-red-700">{item.state}</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {item.phone ? (
                            <span className="font-mono font-bold text-red-950 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                              {item.phone}
                            </span>
                          ) : (
                            <span className="text-red-400 text-xs italic">Not set</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {item.whatsapp ? (
                            <span className="font-mono text-xs font-semibold text-green-800 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                              {item.whatsapp}
                            </span>
                          ) : (
                            <span className="text-red-400 text-xs italic">Not set</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {item.telegram ? (
                            <span className="font-mono text-xs font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                              {item.telegram}
                            </span>
                          ) : (
                            <span className="text-red-400 text-xs italic">Not set</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              item.deleteUserPhone
                                ? "bg-red-100 text-red-900 border border-red-200"
                                : "bg-green-100 text-green-900 border border-green-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                item.deleteUserPhone ? "bg-red-700" : "bg-green-600"
                              }`}
                            />
                            {item.deleteUserPhone ? "User Numbers Hidden" : "Numbers Overridden"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs font-bold text-red-950">
                            {stats.totalAds} Ads
                          </div>
                          <div className="text-xs text-red-700">
                            {stats.uniquePhones} unique numbers
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-red-800">
                          {formatDisplayDateTime(item.updatedAt || item.createdAt)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditOverride(item)}
                              className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item._id, item.city)}
                              className="rounded-lg bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-red-800 hover:bg-red-100 transition"
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
