"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { uploadImage } from "@/lib/compress";
import { AdminCitySeoSkeleton } from "@/components/skeletons/admin-skeletons";
import { formatDisplayDate } from "@/lib/date";

type BlockType = "h2" | "h3" | "p";

type ContentBlock = {
  id: string;
  type: BlockType;
  text: string;
};

function normalizeBlocks(blocks: unknown[]): ContentBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((item, idx) => {
    const b = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const rawType = String(b.type || "");
    const resolvedType: BlockType =
      rawType === "h1"
        ? "h2"
        : rawType === "h2" || rawType === "h3" || rawType === "p"
        ? (rawType as BlockType)
        : "p";
    return {
      id: String(b.id || `b_${Date.now()}_${idx}`),
      type: resolvedType,
      text: String(b.text || ""),
    };
  });
}

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uid(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function Counter({ value, min, max }: { value: number; min: number; max: number }) {
  const ok = value >= min && value <= max;
  const over = value > max;
  return (
    <span
      className={`text-xs font-semibold ${
        ok ? "text-emerald-400" : over ? "text-rose-400" : "text-amber-400"
      }`}
    >
      {value} / {min}-{max} chars
    </span>
  );
}

function TagInput({
  label,
  placeholder,
  tags,
  onChange,
  hint,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (next: string[]) => void;
  hint?: string;
}) {
  const [val, setVal] = useState("");

  function add() {
    const v = val.trim();
    if (!v) return;
    const pieces = v.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    const nextTags = [...tags];
    for (const piece of pieces) {
      if (!nextTags.some((t) => t.toLowerCase() === piece.toLowerCase())) {
        nextTags.push(piece);
      }
    }
    onChange(nextTags);
    setVal("");
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-200">{label}</span>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-slate-800/90 px-3 py-2.5">
        {tags.map((t, i) => (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1 text-xs font-bold text-slate-950 shadow-sm"
          >
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
              className="text-slate-900 hover:text-black font-extrabold"
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-white placeholder-slate-500 outline-none text-sm"
          value={val}
          placeholder={placeholder}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
      </div>
      {hint && <span className="mt-1.5 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-200">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition";

type CityEntry = {
  name: string;
  slug: string;
  state?: string;
};

type SeoEntry = {
  slug: string;
  name?: string;
  title?: string;
  description?: string;
  keywords?: string;
  urlSlug?: string;
  primaryKeyword?: string;
  popularSearches?: string[];
  secondaryKeywords?: string[];
  longTailKeywords?: string[];
  canonicalUrl?: string;
  featuredImage?: string;
  imageAlt?: string;
  content?: ContentBlock[];
  faqs?: FaqItem[];
  status?: "draft" | "published";
  updatedAt?: string;
};

function CitySeoContent() {
  const params = useSearchParams();
  const router = useRouter();
  const queryCity = params.get("city") || "";

  const [allCities, setAllCities] = useState<CityEntry[]>([]);
  const [allSeo, setAllSeo] = useState<SeoEntry[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>(queryCity);
  const [lastSavedDate, setLastSavedDate] = useState<string | undefined>(undefined);

  const [name, setName] = useState("");
  const [stateName, setStateName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urlSlug, setUrlSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [content, setContent] = useState<ContentBlock[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [faqDragIndex, setFaqDragIndex] = useState<number | null>(null);

  /**
   * Helper to find SEO record for a city using case-insensitive slug or name match
   */
  const findSeoForCity = useCallback(
    (targetSlugOrName: string, cities: CityEntry[], seoList: SeoEntry[]) => {
      const norm = targetSlugOrName.toLowerCase().trim();
      const normSlug = slugify(targetSlugOrName);

      const city = cities.find(
        (c) =>
          c.slug.toLowerCase().trim() === norm ||
          slugify(c.name) === normSlug ||
          c.name.toLowerCase().trim() === norm
      );

      const citySlug = city?.slug.toLowerCase().trim();
      const cityName = city?.name.toLowerCase().trim();

      const seo = seoList.find((s) => {
        const sSlug = String(s.slug || "").toLowerCase().trim();
        const sUrl = String(s.urlSlug || "").toLowerCase().trim();
        const sName = String(s.name || "").toLowerCase().trim();
        return (
          sSlug === norm ||
          sSlug === normSlug ||
          sUrl === norm ||
          sUrl === normSlug ||
          sName === norm ||
          (citySlug && (sSlug === citySlug || sUrl === citySlug)) ||
          (cityName && sName === cityName)
        );
      });

      return { city, seo };
    },
    []
  );

  /**
   * Load a city and its SEO (draft or published) into the form
   */
  const loadCityIntoForm = useCallback(
    (target: string, cities: CityEntry[], seoList: SeoEntry[]) => {
      if (!target.trim()) return;

      const { city, seo } = findSeoForCity(target, cities, seoList);

      const resolvedName = city?.name || seo?.name || target;
      const resolvedState = city?.state || "";
      const resolvedSlug = city?.slug || seo?.slug || slugify(target);

      setName(resolvedName);
      setStateName(resolvedState);
      setActiveSlug(resolvedSlug);

      if (seo) {
        setTitle(seo.title ?? "");
        setDescription(seo.description ?? "");
        setUrlSlug(seo.urlSlug ?? resolvedSlug);
        setSlugManual(Boolean(seo.urlSlug && seo.urlSlug !== resolvedSlug));
        setPrimaryKeyword(seo.primaryKeyword ?? "");

        const rawPopular = seo.popularSearches;
        const combinedKeywords = Array.from(
          new Set([
            ...(Array.isArray(rawPopular) ? rawPopular : []),
            ...(Array.isArray(seo.secondaryKeywords) ? seo.secondaryKeywords : []),
            ...(Array.isArray(seo.longTailKeywords) ? seo.longTailKeywords : []),
          ])
        )
          .map((s) => String(s).trim())
          .filter(Boolean);

        setPopularSearches(combinedKeywords);
        setCanonicalUrl(seo.canonicalUrl ?? "");
        setFeaturedImage(seo.featuredImage ?? "");
        setImageAlt(seo.imageAlt ?? "");
        setContent(
          Array.isArray(seo.content) && seo.content.length > 0
            ? normalizeBlocks(seo.content)
            : [
                { id: uid(), type: "h2", text: "" },
                { id: uid(), type: "p", text: "" },
              ]
        );
        setFaqs(Array.isArray(seo.faqs) ? seo.faqs : []);
        setStatus(seo.status === "published" ? "published" : "draft");
        setLastSavedDate(seo.updatedAt);
      } else {
        // Fresh state for unconfigured city
        setTitle("");
        setDescription("");
        setUrlSlug(resolvedSlug);
        setSlugManual(false);
        setPrimaryKeyword("");
        setPopularSearches([]);
        setCanonicalUrl("");
        setFeaturedImage("");
        setImageAlt("");
        setContent([
          { id: uid(), type: "h2", text: "" },
          { id: uid(), type: "p", text: "" },
        ]);
        setFaqs([]);
        setStatus("draft");
        setLastSavedDate(undefined);
      }
    },
    [findSeoForCity]
  );

  // Initial load of all cities and SEO entries
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [citiesRes, seoRes] = await Promise.all([
          fetch("/api/admin/cities", { credentials: "include" }).then((r) =>
            r.json()
          ),
          fetch("/api/admin/city-seo", { credentials: "include" }).then((r) =>
            r.json()
          ),
        ]);
        if (cancelled) return;

        const fetchedCities = (citiesRes.cities ?? []) as CityEntry[];
        const seenSlugSet = new Set<string>();
        const uniqueCities = fetchedCities.filter((c) => {
          const s = (c.slug || "").toLowerCase().trim();
          if (!s || seenSlugSet.has(s)) return false;
          seenSlugSet.add(s);
          return true;
        });
        setAllCities(uniqueCities);

        const fetchedSeo = (seoRes.seo ?? []) as SeoEntry[];
        setAllSeo(fetchedSeo);

        // Load targeted city from query param if available, otherwise first city or empty
        const initialTarget = queryCity || (uniqueCities[0]?.slug ?? "");
        if (initialTarget) {
          loadCityIntoForm(initialTarget, uniqueCities, fetchedSeo);
        }
      } catch {
        setError("Failed to load city SEO details. Please refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryCity, loadCityIntoForm]);

  /**
   * Handle switching city from dropdown selector
   */
  function handleSelectCity(targetSlug: string) {
    if (!targetSlug) return;
    setError("");
    setSuccess("");
    loadCityIntoForm(targetSlug, allCities, allSeo);
    // Sync browser URL without full re-render
    window.history.replaceState(
      {},
      "",
      `/admin/city-seo?city=${encodeURIComponent(targetSlug)}`
    );
  }

  function handleCityNameChange(val: string) {
    setName(val);
    const trimmed = val.trim().toLowerCase();
    const match = allCities.find(
      (c) => c.name.toLowerCase() === trimmed || c.slug.toLowerCase() === trimmed
    );
    if (match) {
      if (match.state) setStateName(match.state);
      setActiveSlug(match.slug);
      if (!slugManual) setUrlSlug(match.slug);
      // Load SEO for matched city if available
      loadCityIntoForm(match.slug, allCities, allSeo);
    } else {
      if (!slugManual && val.trim()) setUrlSlug(slugify(val));
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManual) setUrlSlug(slugify(value));
  }

  function addBlock(type: BlockType) {
    setContent((prev) => [...prev, { id: uid(), type, text: "" }]);
  }

  function updateBlock(id: string, patch: Partial<ContentBlock>) {
    setContent((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b))
    );
  }

  function removeBlock(id: string) {
    setContent((prev) => prev.filter((b) => b.id !== id));
  }

  function reorder(from: number, to: number) {
    setContent((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function addFaq() {
    setFaqs((prev) => [...prev, { id: uid(), question: "", answer: "" }]);
  }

  function updateFaq(id: string, patch: Partial<FaqItem>) {
    setFaqs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  }

  function removeFaq(id: string) {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  }

  function reorderFaq(from: number, to: number) {
    setFaqs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function handleImage(file: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file);
      setFeaturedImage(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save(publish: boolean): Promise<string | null> {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const targetName = name.trim();
      if (!targetName) {
        setError("City name is required.");
        setSaving(false);
        return null;
      }

      let slug = activeSlug || slugify(targetName);
      const existing = allCities.find(
        (c) =>
          c.name.toLowerCase() === targetName.toLowerCase() ||
          c.slug.toLowerCase() === slug.toLowerCase()
      );
      if (existing) {
        slug = existing.slug;
      }

      // If city is brand new and not yet in cities collection, create city first
      if (!existing) {
        const resolvedState = stateName.trim() || "India";
        const cRes = await fetch("/api/admin/cities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: targetName,
            state: resolvedState,
            region: resolvedState,
            country: "India",
            famousFood: "",
            seoDescription: description.trim(),
          }),
        });
        const cData = await cRes.json();
        if (!cRes.ok && !cData.error?.toLowerCase().includes("already exists")) {
          setError(cData.error || "Failed to add city.");
          setSaving(false);
          return null;
        }
        slug = cData.city?.slug || slugify(targetName);
        // Add to in-memory cities list
        setAllCities((prev) => [
          ...prev,
          { name: targetName, slug, state: resolvedState },
        ]);
      }

      const finalUrlSlug = (
        urlSlug.trim() ||
        slugify(title) ||
        slugify(targetName) ||
        slug
      ).toLowerCase();

      const newStatus = publish ? "published" : "draft";

      const sRes = await fetch("/api/admin/city-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug,
          name: targetName || slug,
          title,
          description,
          keywords: primaryKeyword,
          urlSlug: finalUrlSlug,
          primaryKeyword,
          popularSearches,
          secondaryKeywords: popularSearches,
          longTailKeywords: [],
          canonicalUrl:
            canonicalUrl.trim() ||
            `https://rojloo.vercel.app/places/${finalUrlSlug}`,
          featuredImage,
          imageAlt,
          content,
          faqs,
          status: newStatus,
        }),
      });

      const sData = await sRes.json();
      if (!sRes.ok) {
        setError(sData.error || "Failed to save SEO content.");
        setSaving(false);
        return null;
      }

      const updatedRecord: SeoEntry = sData.seo || {
        slug,
        name: targetName,
        title,
        description,
        urlSlug: finalUrlSlug,
        primaryKeyword,
        popularSearches,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      // Update in-memory allSeo state so any subsequent switch or reload has latest saved draft
      setAllSeo((prev) => {
        const next = prev.filter(
          (s) => s.slug.toLowerCase().trim() !== slug.toLowerCase().trim()
        );
        next.push(updatedRecord);
        return next;
      });

      setActiveSlug(slug);
      setStatus(newStatus);
      setLastSavedDate(updatedRecord.updatedAt || new Date().toISOString());

      // Update URL to current city slug
      window.history.replaceState(
        {},
        "",
        `/admin/city-seo?city=${encodeURIComponent(slug)}`
      );

      setSuccess(
        publish
          ? `City SEO for "${targetName}" published live successfully!`
          : `City SEO draft for "${targetName}" saved successfully! This draft will open automatically whenever you revisit this city.`
      );
      setTimeout(() => setSuccess(""), 5000);
      return finalUrlSlug;
    } catch {
      setError("An error occurred while saving SEO.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function preview() {
    const targetSlug = urlSlug.trim() || activeSlug || slugify(name);
    if (!targetSlug) {
      setError("Please select or enter a city name before previewing.");
      return;
    }

    const savedSlug = await save(false);
    const slugToOpen = savedSlug || targetSlug;
    if (slugToOpen) {
      window.open(`/places/${slugToOpen}?preview=true`, "_blank");
    }
  }

  const titleLen = title.length;
  const descLen = description.length;
  const contentText = content.map((b) => b.text).join(" ");
  const wordCount = contentText.trim() ? contentText.trim().split(/\s+/).length : 0;
  const h2Count = content.filter((b) => b.type === "h2").length;
  const h3Count = content.filter((b) => b.type === "h3").length;

  const keyword = primaryKeyword.trim().toLowerCase();
  const keywordUsage = keyword
    ? (
        (contentText.toLowerCase().match(new RegExp(keyword, "g")) || [])
          .length +
        (title.toLowerCase().match(new RegExp(keyword, "g")) || []).length +
        (description.toLowerCase().match(new RegExp(keyword, "g")) || []).length
      )
    : 0;

  const checks = [
    { label: "SEO title exists", ok: titleLen > 0 },
    { label: "Meta description exists", ok: descLen > 0 },
    { label: "Primary keyword exists", ok: primaryKeyword.trim().length > 0 },
    { label: "URL slug exists", ok: urlSlug.trim().length > 0 },
    { label: "Top page heading exists", ok: Boolean(name.trim() || title.trim()) },
    { label: "At least one H2 heading exists", ok: h2Count >= 1 },
    { label: "Content has sufficient length", ok: wordCount >= 300 },
    { label: "Image has alt text", ok: Boolean(featuredImage && imageAlt.trim()) },
    { label: "Canonical URL exists", ok: canonicalUrl.trim().length > 0 },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round((passed / checks.length) * 100);

  // SEO status map for dropdown indicator
  const citySeoStatusMap = useMemo(() => {
    const map = new Map<string, { status: "published" | "draft" | "not_done"; updatedAt?: string }>();
    for (const s of allSeo) {
      const key = String(s.slug || "").toLowerCase().trim();
      map.set(key, {
        status: s.status === "published" ? "published" : "draft",
        updatedAt: s.updatedAt,
      });
    }
    return map;
  }, [allSeo]);

  // Sorted cities for dropdown: Pending cities (Drafts & Not Done) first, Updated SEO (Published) at the end of the list
  const sortedCitiesForDropdown = useMemo(() => {
    return [...allCities].sort((a, b) => {
      const aInfo = citySeoStatusMap.get(a.slug.toLowerCase().trim());
      const bInfo = citySeoStatusMap.get(b.slug.toLowerCase().trim());
      const aDone = aInfo?.status === "published" ? 1 : 0;
      const bDone = bInfo?.status === "published" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone; // 0 (pending) comes first, 1 (updated) placed at the last of the list
      if (aInfo?.status === "draft" && bInfo?.status !== "draft") return -1;
      if (bInfo?.status === "draft" && aInfo?.status !== "draft") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [allCities, citySeoStatusMap]);

  if (loading) {
    return <AdminCitySeoSkeleton />;
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 min-w-0 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/city"
              className="text-xs font-semibold text-slate-400 hover:text-amber-400 transition flex items-center gap-1"
            >
              &larr; Back to City List
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 shadow-inner">
              <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <span>
              SEO Editor &mdash;{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                {name || "Select City"}
              </span>
            </span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Write, optimize, and save drafts or publish SEO metadata, content blocks, and FAQs for this city.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 text-xs sm:text-sm font-bold text-amber-300 disabled:opacity-60 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>💾</span>
            {saving ? "Saving Draft..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={preview}
            disabled={saving || (!activeSlug && !urlSlug && !name.trim())}
            className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-200 disabled:opacity-60 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>👁️</span>
            Preview
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-5 py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-60 transition cursor-pointer active:scale-[0.98] flex items-center gap-1.5"
          >
            <span>🚀</span>
            {saving ? "Publishing..." : "Publish Live"}
          </button>
        </div>
      </div>

      {/* Draft / Live Status Banner */}
      <div className="mt-4">
        {status === "draft" && lastSavedDate ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-200">
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] shrink-0" />
              <div>
                <strong className="text-amber-300">Saved Draft Loaded:</strong> Last saved on{" "}
                <span className="font-semibold text-white">{formatDisplayDate(lastSavedDate)}</span>.
                You are currently editing this draft. Click &ldquo;Save Draft&rdquo; to update it or &ldquo;Publish Live&rdquo; to launch it.
              </div>
            </div>
            <span className="hidden sm:inline-block rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300 uppercase tracking-wide">
              Draft
            </span>
          </div>
        ) : status === "published" ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm text-emerald-200">
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0" />
              <div>
                <strong className="text-emerald-300">Published Live:</strong> This city page is live on the public website
                {lastSavedDate ? ` (Last updated ${formatDisplayDate(lastSavedDate)})` : ""}. Any changes saved will update the live site.
              </div>
            </div>
            <span className="hidden sm:inline-block rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300 uppercase tracking-wide">
              Live
            </span>
          </div>
        ) : (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm text-rose-200">
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] shrink-0" />
              <div>
                <strong className="text-rose-300">New Setup:</strong> No SEO content has been saved for &ldquo;{name || "this city"}&rdquo; yet.
                Fill in the details below and save as draft or publish live.
              </div>
            </div>
            <span className="hidden sm:inline-block rounded-md bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-300 uppercase tracking-wide">
              Not Set
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-sm font-semibold text-rose-300" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-sm font-semibold text-emerald-300" role="status">
          {success}
        </div>
      )}

      {/* Main Grid: Left Form Controls, Right SEO Preview & Score */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* City Selector & Linked Info Card */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📍</span> City Selection &amp; Hierarchy
              </h2>
              {allCities.some((c) => c.slug.toLowerCase() === activeSlug.toLowerCase()) && (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                  ✓ Official City Linked
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* Quick City Switcher Dropdown */}
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Switch City (Select from directory to edit SEO)
                </span>
                <select
                  className={inputClass}
                  value={activeSlug}
                  onChange={(e) => handleSelectCity(e.target.value)}
                >
                  <option value="">-- Choose a city to edit SEO --</option>
                  {sortedCitiesForDropdown.map((c) => {
                    const statusInfo = citySeoStatusMap.get(c.slug.toLowerCase().trim());
                    const dot =
                      statusInfo?.status === "published"
                        ? "🟢"
                        : statusInfo?.status === "draft"
                        ? "🟡"
                        : "🔴";
                    const statusLabel =
                      statusInfo?.status === "published"
                        ? "Done"
                        : statusInfo?.status === "draft"
                        ? "Draft"
                        : "No SEO";

                    return (
                      <option key={c.slug} value={c.slug} className="bg-slate-900 text-white">
                        {dot} {c.name} {c.state ? `(${c.state})` : ""} &mdash; [{statusLabel}]
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City Name" hint="Edit or type official city name">
                  <input
                    list="city-suggestions-list"
                    className={inputClass}
                    value={name}
                    onChange={(e) => handleCityNameChange(e.target.value)}
                    placeholder="e.g. Mumbai"
                  />
                  <datalist id="city-suggestions-list">
                    {allCities.map((c, idx) => (
                      <option key={`${c.slug}-${idx}`} value={c.name}>
                        {c.state ? `${c.name} (${c.state})` : c.name}
                      </option>
                    ))}
                  </datalist>
                </Field>

                <Field label="State / Region" hint="Parent state for regional grouping">
                  <input
                    className={inputClass}
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="e.g. Maharashtra"
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* SEO Metadata Settings */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <h2 className="mb-4 text-lg font-bold text-white flex items-center gap-2">
              <span>🔍</span> SEO Metadata &amp; Keywords
            </h2>
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-200">SEO Title</span>
                  <Counter value={titleLen} min={50} max={60} />
                </div>
                <input
                  className={inputClass}
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder={`Best Places & Services in ${name || "City"} | RKB`}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-200">Meta Description</span>
                  <Counter value={descLen} min={140} max={160} />
                </div>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short, compelling summary shown in search results."
                />
              </div>

              <Field label="URL Slug" hint="Auto-generated from title or city slug. Editable.">
                <input
                  className={inputClass}
                  value={urlSlug}
                  onChange={(e) => {
                    setSlugManual(true);
                    setUrlSlug(e.target.value);
                  }}
                  placeholder="city-name"
                />
              </Field>

              <Field label="Primary Keyword" hint="Main target keyword phrase for this city">
                <input
                  className={inputClass}
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                  placeholder={`e.g. ${name ? name.toLowerCase() : "city"} services`}
                />
              </Field>

              <TagInput
                label="Popular Searches"
                placeholder="Type keyword and press Enter (or comma)"
                tags={popularSearches}
                onChange={setPopularSearches}
                hint="Add popular and trending search terms for this city. These appear under 'Most Searched in {city}' on the published city page."
              />

              <Field label="Canonical URL">
                <input
                  className={inputClass}
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://example.com/places/city"
                />
              </Field>

              <div>
                <span className="mb-1.5 block text-sm font-bold text-slate-200">Featured Image</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImage(file);
                  }}
                  className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-slate-200 hover:file:bg-white/15 cursor-pointer"
                />
                {uploading && <span className="text-xs text-amber-400 mt-1 block">Uploading...</span>}
                {featuredImage && (
                  <div className="mt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredImage}
                      alt={imageAlt || "Featured preview"}
                      className="h-32 w-auto rounded-xl border border-white/10 object-cover shadow-md"
                    />
                  </div>
                )}
              </div>

              <Field label="Image Alt Text">
                <input
                  className={inputClass}
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Describe the image for SEO and accessibility"
                />
              </Field>
            </div>
          </section>

          {/* Content Blocks Section */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📝</span> Content Blocks Editor
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Structure rich headings and descriptive content for the city guide.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addBlock("h2")}
                  className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  + Add Heading
                </button>
                <button
                  type="button"
                  onClick={() => addBlock("p")}
                  className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  + Add Paragraph
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {content.map((block, i) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== i) reorder(dragIndex, i);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`flex gap-2 rounded-xl border border-white/10 bg-slate-800/60 p-2.5 transition ${
                    dragIndex === i ? "opacity-50" : ""
                  }`}
                >
                  <span className="flex cursor-grab items-center px-1 text-slate-500" title="Drag to reorder">
                    ⠿
                  </span>
                  <select
                    value={block.type}
                    onChange={(e) =>
                      updateBlock(block.id, { type: e.target.value as BlockType })
                    }
                    className="rounded-lg border border-white/15 bg-slate-800 px-2 py-2 text-sm text-white outline-none focus:border-amber-500"
                  >
                    <option value="h2" className="bg-slate-900">H2 &mdash; Heading 2</option>
                    <option value="h3" className="bg-slate-900">H3 &mdash; Heading 3</option>
                    <option value="p" className="bg-slate-900">Paragraph</option>
                  </select>
                  <textarea
                    value={block.text}
                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                    placeholder="Write your content here..."
                    rows={block.type === "p" ? 3 : 1}
                    className={`flex-1 rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-white outline-none focus:border-amber-500 placeholder-slate-500 ${
                      block.type === "h2"
                        ? "text-lg font-bold"
                        : block.type === "h3"
                        ? "text-base font-semibold"
                        : "text-sm leading-relaxed"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    aria-label="Delete block"
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-300 transition cursor-pointer self-start"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {content.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/15 bg-slate-800/30 p-6 text-center">
                  <p className="text-sm font-medium text-slate-400">
                    No content blocks yet. Click &ldquo;+ Add Heading&rdquo; or &ldquo;+ Add Paragraph&rdquo; above.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* FAQ Editor Section */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>💬</span> FAQ Section
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Frequently asked questions displayed as an interactive accordion on the city page.
                </p>
              </div>
              <button
                type="button"
                onClick={addFaq}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition cursor-pointer"
              >
                + Add FAQ
              </button>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div
                  key={faq.id}
                  draggable
                  onDragStart={() => setFaqDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (faqDragIndex !== null && faqDragIndex !== i) {
                      reorderFaq(faqDragIndex, i);
                    }
                    setFaqDragIndex(null);
                  }}
                  onDragEnd={() => setFaqDragIndex(null)}
                  className={`flex flex-col gap-2.5 rounded-xl border border-white/10 bg-slate-800/60 p-3 sm:p-4 transition ${
                    faqDragIndex === i ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex cursor-grab items-center px-1 text-slate-500 font-mono text-sm"
                        title="Drag to reorder"
                      >
                        ⠿
                      </span>
                      <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-400">
                        FAQ #{i + 1}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFaq(faq.id)}
                      aria-label="Delete FAQ"
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300 transition cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Question:
                    </label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) =>
                        updateFaq(faq.id, { question: e.target.value })
                      }
                      placeholder={`e.g. How do I contact service providers in ${name || "this city"}?`}
                      className="w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm font-semibold text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Solution / Answer:
                    </label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) =>
                        updateFaq(faq.id, { answer: e.target.value })
                      }
                      placeholder="Write the detailed answer here..."
                      rows={3}
                      className="w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition leading-relaxed"
                    />
                  </div>
                </div>
              ))}

              {faqs.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/15 bg-slate-800/30 p-6 text-center">
                  <p className="text-sm font-medium text-slate-400">
                    No FAQs added yet. Click &ldquo;+ Add FAQ&rdquo; above to add questions and answers.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: PREVIEWS & SCORE */}
        <div className="space-y-6">
          {/* SEO Score Gauge */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#334155" strokeWidth="3.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3.5"
                    strokeDasharray={`${(score / 100) * 100} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">
                  {score}%
                </span>
              </div>
              <div>
                <p className="text-base font-bold text-white">SEO Health Score</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {passed} of {checks.length} essential checks passed
                </p>
              </div>
            </div>
          </section>

          {/* Google Search Snippet Preview */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <h2 className="mb-3 text-base font-bold text-white flex items-center gap-2">
              <span>🌐</span> Google SERP Preview
            </h2>
            <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
              <p className="text-xs text-emerald-400 font-mono truncate">{`https://example.com/places/${urlSlug || slugify(name) || "city-slug"}`}</p>
              <p className="mt-1 text-base font-semibold text-sky-400 hover:underline cursor-pointer line-clamp-1">
                {title || `Best Places & Services in ${name || "City"} | RKB`}
              </p>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed line-clamp-2">
                {description || "Explore trusted services, verified listings, and local classifieds in this city."}
              </p>
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-slate-400 font-mono">
              <div className="flex justify-between">
                <span>Title Length:</span>
                <span className="text-slate-200">{titleLen} chars</span>
              </div>
              <div className="flex justify-between">
                <span>Description Length:</span>
                <span className="text-slate-200">{descLen} chars</span>
              </div>
              <div className="flex justify-between">
                <span>Primary Keyword Matches:</span>
                <span className="text-amber-400 font-bold">{keywordUsage} times</span>
              </div>
              <div className="flex justify-between">
                <span>Content Word Count:</span>
                <span className="text-slate-200">{wordCount} words</span>
              </div>
              <div className="flex justify-between">
                <span>Headings Count:</span>
                <span className="text-slate-200">H2: {h2Count} &bull; H3: {h3Count}</span>
              </div>
            </div>
          </section>

          {/* SEO Checklist */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <h2 className="mb-3 text-base font-bold text-white flex items-center gap-2">
              <span>✅</span> SEO Optimization Checklist
            </h2>
            <ul className="space-y-2.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold ${
                      c.ok ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {c.ok ? "✓" : "!"}
                  </span>
                  <span className={c.ok ? "text-slate-200 font-medium" : "text-slate-400"}>{c.label}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function AdminCitySeo() {
  return (
    <Suspense fallback={<AdminCitySeoSkeleton />}>
      <CitySeoContent />
    </Suspense>
  );
}
