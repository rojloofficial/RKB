"use client";

import { useEffect, useState } from "react";
import { useVipContext } from "@/components/vip/use-vip-context";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";
import { formatDisplayDateTime } from "@/lib/date";

type OverrideItem = {
  _id: string;
  vipEmail: string;
  city: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  deleteUserPhone: boolean;
  active: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export default function VipPhoneControlPage() {
  const me = useVipContext();
  const [cities, setCities] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<OverrideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [selectedCity, setSelectedCity] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [telegram, setTelegram] = useState("");
  const [deleteUserPhone, setDeleteUserPhone] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch("/api/vip/phone-control", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        const cityList = Array.isArray(data.cities) ? data.cities : [];
        setCities(cityList);
        if (cityList.length > 0) {
          setSelectedCity((prev) => prev || cityList[0]);
        }
        setOverrides(Array.isArray(data.overrides) ? data.overrides : []);
      }
    } catch {
      setError("Failed to load contact control data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (me && !me.authenticated) {
      if (typeof window !== "undefined") {
        window.location.replace("/vip/login");
      }
    }
  }, [me]);

  useEffect(() => {
    if (!me || !me.authenticated) return;
    let active = true;

    fetch("/api/vip/phone-control", { credentials: "include" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!active) return;
        if (ok) {
          const cityList = Array.isArray(data.cities) ? data.cities : [];
          setCities(cityList);
          if (cityList.length > 0) {
            setSelectedCity((prev) => prev || cityList[0]);
          }
          setOverrides(Array.isArray(data.overrides) ? data.overrides : []);
        } else {
          setError(data.error || "Failed to load contact control data.");
        }
      })
      .catch(() => {
        if (active) setError("Failed to load contact control data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [me]);

  function handleSelectCity(cityVal: string) {
    setSelectedCity(cityVal);
    // If an override already exists for this city, pre-fill the form
    const existing = overrides.find(
      (o) => o.city.toLowerCase() === cityVal.trim().toLowerCase()
    );
    if (existing) {
      setPhone(existing.phone || "");
      setWhatsapp(existing.whatsapp || "");
      setTelegram(existing.telegram || "");
      setDeleteUserPhone(Boolean(existing.deleteUserPhone));
    } else {
      setPhone("");
      setWhatsapp("");
      setTelegram("");
      setDeleteUserPhone(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      if (!applyToAll && !selectedCity.trim()) {
        throw new Error("Please select a city.");
      }

      if (!phone.trim() && !whatsapp.trim() && !telegram.trim() && !deleteUserPhone) {
        throw new Error("Please provide at least a Phone No., WhatsApp, Telegram, or choose to delete user numbers.");
      }

      const payload = {
        city: selectedCity.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        telegram: telegram.trim(),
        deleteUserPhone,
        applyToAll,
      };

      const res = await fetch("/api/vip/phone-control", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save contact control.");
      }

      setSuccess(
        applyToAll
          ? "Contact override applied to all your assigned cities successfully!"
          : `Contact override for ${selectedCity} saved successfully!`
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contact control.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, cityName: string) {
    if (!confirm(`Remove contact override for ${cityName}? Ads will return to their original user numbers.`)) {
      return;
    }

    try {
      const res = await fetch("/api/vip/phone-control", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove override.");
      }

      setSuccess(`Contact override removed for ${cityName}. Original user numbers restored.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove override.");
    }
  }

  if (!me || !me.authenticated) return null;

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-red-950">Phone No. & Contact Control</h1>
          <p className="mt-2 text-red-900 max-w-3xl">
            Control contact details on ads in your assigned cities. Set your own Phone Number, WhatsApp, and Telegram, or hide/delete original users&apos; phone numbers. When your VIP access date expires, all ads will automatically return to showing their original posted numbers.
          </p>
        </div>
        <span className="rounded-full bg-pink-100 px-3.5 py-1.5 text-xs font-bold text-red-900 border border-red-200">
          {cities.length} Assigned {cities.length === 1 ? "City" : "Cities"}
        </span>
      </div>

      {error && <div className="mt-4 rounded-xl bg-red-100 p-3 text-sm text-red-800 font-semibold">{error}</div>}
      {success && <div className="mt-4 rounded-xl bg-green-100 p-3 text-sm text-green-900 font-semibold">{success}</div>}

      {/* Control Form Card */}
      <div className="mt-8 rounded-2xl border border-red-200 bg-white p-5 sm:p-7 shadow-sm">
        <h2 className="text-xl font-bold text-red-950">Configure Contact Numbers</h2>
        <p className="mt-1 text-xs text-red-700">
          VIP can only change contact numbers for cities within their assigned access.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
          {/* City Selection */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-red-950">
              Select City to Control
            </label>
            <select
              value={selectedCity}
              onChange={(e) => handleSelectCity(e.target.value)}
              disabled={applyToAll || cities.length === 0}
              className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-red-950 outline-none focus:border-red-400 disabled:bg-gray-100"
              required={!applyToAll}
            >
              {cities.length === 0 ? (
                <option value="">No assigned cities available</option>
              ) : (
                cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))
              )}
            </select>

            {cities.length > 1 && (
              <label className="mt-2.5 flex items-center gap-2 text-xs font-medium text-red-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="rounded border-red-300 text-red-800 accent-red-800"
                />
                Apply these contact details to all my assigned cities ({cities.length} cities)
              </label>
            )}
          </div>

          {/* Phone No */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-red-950">
              Your Phone Number
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
              className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
              placeholder="e.g. 9876543210"
            />
            <p className="mt-1 text-xs text-red-600">Replaces the caller number on ads in this city.</p>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-red-950">
              Your WhatsApp Number
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
              className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
              placeholder="e.g. 9876543210"
            />
            <p className="mt-1 text-xs text-red-600">Replaces the WhatsApp contact button on ads.</p>
          </div>

          {/* Telegram */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-red-950">
              Your Telegram Username / Link
            </label>
            <input
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-red-950 outline-none focus:border-red-400"
              placeholder="e.g. @vipuser or https://t.me/vipuser"
            />
            <p className="mt-1 text-xs text-red-600">Replaces the Telegram button on ads.</p>
          </div>

          {/* Delete User Phone No Option */}
          <div className="md:col-span-2 rounded-xl bg-red-50/80 border border-red-200 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteUserPhone}
                onChange={(e) => setDeleteUserPhone(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-red-300 text-red-800 accent-red-800"
              />
              <div>
                <span className="text-sm font-bold text-red-950 block">
                  Delete / Hide original users&apos; phone numbers from ads
                </span>
                <span className="text-xs text-red-700 block mt-0.5 leading-relaxed">
                  When enabled, original users&apos; contact numbers are hidden from callers and replaced with your numbers above. Once your VIP date expires, all ads will automatically revert to their original user numbers.
                </span>
              </div>
            </label>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving || cities.length === 0}
              className="rounded-xl bg-neutral-950 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition"
            >
              {saving ? "Saving..." : "Save Contact Control"}
            </button>
          </div>
        </form>
      </div>

      {/* Active Overrides Section */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-red-950">Active City Overrides</h2>
        <p className="mt-1 text-xs text-red-700">
          Currently active contact modifications. These automatically expire when your VIP assignment expires.
        </p>

        {loading ? (
          <div className="mt-4">
            <AdminTableSkeleton headers={["City", "Phone", "WhatsApp", "Telegram", "Status", "Expires", "Actions"]} />
          </div>
        ) : overrides.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-white p-6 text-center text-sm text-red-800">
            No active contact overrides. Ads in your assigned cities are currently displaying original user contact info.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overrides.map((item) => (
              <div
                key={item._id}
                className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-red-100 pb-3">
                    <span className="text-base font-bold text-red-950">{item.city}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        item.deleteUserPhone
                          ? "bg-red-100 text-red-900 border border-red-200"
                          : "bg-green-100 text-green-900 border border-green-200"
                      }`}
                    >
                      {item.deleteUserPhone ? "User Numbers Hidden" : "Overridden"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <p className="text-red-950">
                      <strong>Phone:</strong> {item.phone || <span className="text-red-400">None</span>}
                    </p>
                    <p className="text-red-950">
                      <strong>WhatsApp:</strong> {item.whatsapp || <span className="text-red-400">None</span>}
                    </p>
                    <p className="text-red-950">
                      <strong>Telegram:</strong> {item.telegram || <span className="text-red-400">None</span>}
                    </p>
                    <p className="text-red-700 pt-2 border-t border-red-100">
                      <strong>Expires:</strong> {formatDisplayDateTime(item.expiresAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-red-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectCity(item.city)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Edit &uarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item._id, item.city)}
                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-200 transition"
                  >
                    Remove Override
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
