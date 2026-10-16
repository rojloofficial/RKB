"use client";

import Image from "next/image";
import { useEffect, useState, useRef, useMemo } from "react";
import Button from "@/components/ui/button";
import { TextInput, TextArea, Select, FileInput } from "@/components/ui/field";
import { cityPlaces } from "@/lib/places";
import { SERVICES, TO_SERVE, PLACE_OF_SERVICE, DEFAULT_SERVICE_RATES, MAX_IMAGES, type AdForm } from "./types";

type CityOption = { name: string; slug: string; state?: string };

type StateOption = { name: string; slug: string };

export default function PostAdSection({
  form,
  setForm,
  formError,
  formLoading,
  imageUploading = false,
  uploadProgress = 0,
  uploadingCount = 0,
  editingId,
  hasExistingFreeAd = false,
  existingFreeAdTitle = "",
  onImageChange,
  onRemoveImage,
  onSubmit,
}: {
  form: AdForm;
  setForm: React.Dispatch<React.SetStateAction<AdForm>>;
  formError: string;
  formLoading: boolean;
  imageUploading?: boolean;
  uploadProgress?: number;
  uploadingCount?: number;
  editingId: string | null;
  hasExistingFreeAd?: boolean;
  existingFreeAdTitle?: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  const [allCities, setAllCities] = useState<CityOption[]>(cityPlaces);
  const [serverCities, setServerCities] = useState<CityOption[]>([]);
  const [cityLoading, setCityLoading] = useState<boolean>(false);
  const [showStatePrompt, setShowStatePrompt] = useState<boolean>(false);
  const [isStateHighlighted, setIsStateHighlighted] = useState<boolean>(false);
  const stateSelectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    fetch("/api/states")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.states) && data.states.length > 0) {
          setStateOptions(
            data.states.map((s: { name: string; slug: string }) => ({
              name: s.name,
              slug: s.slug,
            }))
          );
        }
      })
      .catch(() => {});

    fetch("/api/cities")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.cities) && data.cities.length > 0) {
          setAllCities(
            data.cities.map((c: { name: string; slug: string; state?: string }) => ({
              name: c.name,
              slug: c.slug,
              state: c.state,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const localMatches = useMemo(() => {
    if (!form.state || !form.state.trim()) return [];
    const targetState = form.state.trim().toLowerCase();
    return allCities.filter(
      (c) => c.state && c.state.trim().toLowerCase() === targetState
    );
  }, [allCities, form.state]);

  useEffect(() => {
    if (!form.state || !form.state.trim()) {
      return;
    }

    let ignore = false;
    queueMicrotask(() => {
      if (!ignore) {
        setCityLoading(true);
      }
    });
    fetch(`/api/cities?state=${encodeURIComponent(form.state.trim())}`)
      .then((r) => r.json())
      .then((data) => {
        if (!ignore && Array.isArray(data.cities)) {
          const fetchedCities: CityOption[] = data.cities.map(
            (c: { name: string; slug: string; state?: string }) => ({
              name: c.name,
              slug: c.slug,
              state: c.state,
            })
          );
          setServerCities(fetchedCities);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setCityLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [form.state]);

  const stateCities = useMemo(() => {
    if (!form.state || !form.state.trim()) return [];
    const seen = new Set<string>();
    const combined: CityOption[] = [];
    for (const c of [...serverCities, ...localMatches]) {
      const key = c.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(c);
      }
    }
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [form.state, serverCities, localMatches]);

  function update<K extends keyof AdForm>(key: K, value: AdForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }) as AdForm);
  }

  function updateRate(
    index: number,
    field: "incall" | "outcall",
    value: string
  ) {
    const rates = form.serviceRates ?? DEFAULT_SERVICE_RATES;
    const next = rates.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    );
    update("serviceRates", next);
  }

  function handleStateChange(selectedState: string) {
    update("state", selectedState);
    if (selectedState !== form.state) {
      update("city", "");
    }
    setShowStatePrompt(false);
    setIsStateHighlighted(false);
  }

  function handleCityClickWhenDisabled() {
    setShowStatePrompt(true);
    setIsStateHighlighted(true);
    if (stateSelectRef.current) {
      stateSelectRef.current.focus();
    }
    setTimeout(() => {
      setIsStateHighlighted(false);
    }, 2500);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Free Ad Policy Banner */}
      {!editingId && (
        <div
          className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${
            hasExistingFreeAd
              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl sm:text-2xl mt-0.5 shrink-0">
              {hasExistingFreeAd ? "⚠️" : "🎁"}
            </span>
            <div className="space-y-1">
              <h4 className="font-bold text-sm sm:text-base text-white">
                {hasExistingFreeAd
                  ? "Free Ad Slot (1/1) Already In Use"
                  : "1 Free Ad Included With Account"}
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
                {hasExistingFreeAd
                  ? `You already have an active free listing ${existingFreeAdTitle ? `("${existingFreeAdTitle}")` : ""} visible on the city page. You can post this new listing, but you will need to activate a promotion package to display it on the city directory.`
                  : "Every account can post 1 completely free ad! It will be published and immediately visible in city listings without any payment."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Personal Information */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white">Profile Basics</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Display Name <span className="text-amber-400">*</span>
            </label>
            <TextInput
              onlyLetters
              value={form.name}
              onChange={(e) => update("name", e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
              placeholder="e.g. Priya Sharma"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Age
            </label>
            <TextInput
              onlyNumbers
              maxLength={3}
              value={form.age ?? ""}
              onChange={(e) => update("age", e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="e.g. 24"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
            Advertisement Title <span className="text-amber-400">*</span>
          </label>
          <TextInput
            value={form.title ?? ""}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Premium Friendly Companion in South Delhi"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
            About Yourself <span className="text-amber-400">*</span>
          </label>
          <TextArea
            value={form.about}
            onChange={(e) => update("about", e.target.value)}
            placeholder="Describe your services, languages, experience, and what makes your listing special..."
            rows={4}
            required
          />
        </div>
      </section>

      {/* Location */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white">Location Details</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              State <span className="text-amber-400">*</span>
            </label>
            {stateOptions.length > 0 ? (
              <Select
                ref={stateSelectRef}
                value={form.state ?? ""}
                onChange={(e) => handleStateChange(e.target.value)}
                className={
                  isStateHighlighted
                    ? "ring-2 ring-amber-500 border-amber-500 bg-amber-500/20 transition-all"
                    : undefined
                }
                required
              >
                <option value="">Select a state</option>
                {stateOptions.map((s) => (
                  <option key={s.slug} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </Select>
            ) : (
              <TextInput
                value={form.state ?? ""}
                onChange={(e) => handleStateChange(e.target.value)}
                placeholder="State"
                required
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              City <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              {!form.state?.trim() && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleCityClickWhenDisabled}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleCityClickWhenDisabled();
                    }
                  }}
                  className="absolute inset-0 z-10 cursor-not-allowed"
                  title="Please select a state first"
                  aria-label="City list is locked. Please select a state first."
                />
              )}
              <Select
                value={form.city}
                disabled={!form.state?.trim()}
                onChange={(e) => update("city", e.target.value)}
                className={
                  !form.state?.trim()
                    ? "cursor-not-allowed opacity-60"
                    : undefined
                }
                required
              >
                {!form.state?.trim() ? (
                  <option value="">Select state first</option>
                ) : (
                  <>
                    <option value="">Select a city</option>
                    {stateCities.map((c, idx) => (
                      <option key={`${c.slug}-${idx}`} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {stateCities.length === 0 && (
                      <option value="" disabled>
                        {cityLoading
                          ? "Loading cities..."
                          : "No cities listed for this state"}
                      </option>
                    )}
                  </>
                )}
              </Select>
            </div>
            {showStatePrompt && !form.state?.trim() && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-amber-400 animate-pulse">
                <span>⚠️</span>
                <span>Please select a state first to view cities.</span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Pin Code
            </label>
            <TextInput
              onlyNumbers
              maxLength={6}
              value={form.pincode ?? ""}
              onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="e.g. 110001"
            />
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white">Category & Service Offering</h3>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
            Primary Category <span className="text-amber-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((svc) => (
              <button
                key={svc}
                type="button"
                onClick={() => update("category", svc)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  form.category === svc
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {svc}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
            To Serve
          </label>
          <div className="flex flex-wrap gap-2">
            {TO_SERVE.map((svc) => {
              const selected = form.toServe?.includes(svc) ?? false;
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() =>
                    update(
                      "toServe",
                      selected
                        ? (form.toServe ?? []).filter((s) => s !== svc)
                        : [...(form.toServe ?? []), svc]
                    )
                  }
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    selected
                      ? "border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-sm"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {selected ? "✓ " : ""}{svc}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
            Place Of Service
          </label>
          <div className="flex flex-wrap gap-2">
            {PLACE_OF_SERVICE.map((svc) => {
              const selected = form.placeOfService?.includes(svc) ?? false;
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() =>
                    update(
                      "placeOfService",
                      selected
                        ? (form.placeOfService ?? []).filter((s) => s !== svc)
                        : [...(form.placeOfService ?? []), svc]
                    )
                  }
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    selected
                      ? "border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-sm"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {selected ? "📍 " : ""}{svc}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Service Rates */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Service Rates</h3>
            <p className="text-xs text-slate-400">
              Enter transparent session prices in INR (₹) displayed on your public profile.
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-400">INR (₹)</span>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
          <table className="w-full min-w-[320px] text-left text-xs sm:text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Incall Rate (₹)</th>
                <th className="px-4 py-3 font-semibold">Outcall Rate (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(form.serviceRates ?? DEFAULT_SERVICE_RATES).map((rate, i) => (
                <tr key={rate.duration} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">
                    {rate.duration}
                  </td>
                  <td className="px-4 py-3">
                    <TextInput
                      onlyNumbers
                      value={rate.incall}
                      onChange={(e) => updateRate(i, "incall", e.target.value.replace(/\D/g, ""))}
                      className="!w-28 text-center"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <TextInput
                      onlyNumbers
                      value={rate.outcall}
                      onChange={(e) => updateRate(i, "outcall", e.target.value.replace(/\D/g, ""))}
                      className="!w-28 text-center"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Contact */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white">Direct Contact Channels</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Phone Number <span className="text-amber-400">*</span>
            </label>
            <TextInput
              onlyNumbers
              maxLength={15}
              value={form.phone}
              onChange={(e) => update("phone", e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 9876543210"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              WhatsApp Number <span className="text-amber-400">*</span>
            </label>
            <TextInput
              onlyNumbers
              maxLength={15}
              value={form.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 9876543210"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Telegram Username (Optional)
            </label>
            <TextInput
              value={form.telegram}
              onChange={(e) => update("telegram", e.target.value)}
              placeholder="e.g. @your_username"
            />
          </div>
        </div>
      </section>

      {/* Images */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Photos & Media</h3>
            <p className="text-xs text-slate-400">High quality photos generate up to 5x more inquiries.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-bold text-amber-400">
            {form.images.length}/{MAX_IMAGES} uploaded
          </span>
        </div>

        <FileInput
          type="file"
          accept="image/*"
          multiple
          disabled={imageUploading || form.images.length >= MAX_IMAGES}
          onChange={onImageChange}
          className="file:!text-white disabled:cursor-not-allowed disabled:opacity-60"
        />

        {/* Upload Loading Progress Bar */}
        {imageUploading && (
          <div className="mt-3 space-y-2 rounded-2xl border border-amber-500/30 bg-slate-950/80 p-4 shadow-lg">
            <div className="flex items-center justify-between text-xs font-semibold text-white">
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin text-amber-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span>
                  Uploading {uploadingCount > 1 ? `${uploadingCount} images` : "image"}...
                </span>
              </span>
              <span className="font-mono font-bold text-amber-400">
                {Math.round(uploadProgress)}%
              </span>
            </div>

            {/* Visual Progress Bar Track & Indicator */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-300 ease-out"
                style={{ width: `${Math.max(6, Math.min(100, uploadProgress))}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400">
              {uploadProgress < 30
                ? "Compressing image..."
                : uploadProgress < 95
                ? "Uploading to storage..."
                : "Finalizing..."}
            </p>
          </div>
        )}

        {form.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {form.images.map((src, i) => (
              <div
                key={i}
                className="group relative h-40 overflow-hidden rounded-xl border border-white/10 bg-slate-950 sm:h-48"
              >
                <Image
                  src={src}
                  alt={`Preview ${i + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(min-width: 640px) 33vw, 50vw"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(i)}
                  aria-label="Remove image"
                  className="absolute right-2 top-2 rounded-full bg-black/80 p-1.5 text-xs font-bold text-white transition hover:bg-red-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {formError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs sm:text-sm font-semibold text-red-400" role="alert">
          ⚠️ {formError}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/40 p-4">
        <input
          type="checkbox"
          id="terms-accepted"
          name="termsAccepted"
          checked={form.termsAccepted ?? false}
          onChange={(e) => update("termsAccepted", e.target.checked)}
          required
          className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-amber-500 focus:ring-amber-500"
        />
        <label htmlFor="terms-accepted" className="text-xs sm:text-sm text-slate-300">
          I confirm that all information provided is accurate and agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline hover:text-amber-300">
            Terms and Conditions
          </a>{" "}
          <span className="text-amber-400 font-bold">*</span>
        </label>
      </div>

      <Button
        type="submit"
        variant="solid"
        fullWidth
        size="lg"
        disabled={formLoading || imageUploading}
        className="!text-white font-black shadow-lg shadow-orange-500/20"
      >
        {formLoading
          ? "Saving..."
          : imageUploading
          ? "Uploading Images..."
          : editingId
          ? "Update Advertisement"
          : hasExistingFreeAd
          ? "Create Ad & Choose Promotion →"
          : "Publish Free Advertisement"}
      </Button>
    </form>
  );
}
