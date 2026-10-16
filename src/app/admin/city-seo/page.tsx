"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { uploadImage } from "@/lib/compress";
import { AdminCitySeoSkeleton } from "@/components/skeletons/admin-skeletons";

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

function CitySeoContent() {
  const params = useSearchParams();
  const editSlug = params.get("city") || "";
  const isEdit = Boolean(editSlug);

  const [allCities, setAllCities] = useState<
    { name: string; slug: string; state?: string }[]
  >([]);
  const [activeSlug, setActiveSlug] = useState(editSlug || "");
  const [stateName, setStateName] = useState("");

  const [name, setName] = useState("");
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

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [faqDragIndex, setFaqDragIndex] = useState<number | null>(null);

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

        const fetchedCities = (citiesRes.cities ?? []) as {
          name: string;
          slug: string;
          state?: string;
        }[];
        const seenSlugSet = new Set<string>();
        const uniqueCities = fetchedCities.filter((c) => {
          const s = (c.slug || "").toLowerCase().trim();
          if (!s || seenSlugSet.has(s)) return false;
          seenSlugSet.add(s);
          return true;
        });
        setAllCities(uniqueCities);

        if (editSlug || activeSlug) {
          const targetSlug = editSlug || activeSlug;
          const city = fetchedCities.find((c) => c.slug === targetSlug);
          if (city) {
            setName(city.name);
            if (city.state) setStateName(city.state);
          }

          const seo = (seoRes.seo ?? []).find(
            (s: { slug: string; urlSlug?: string }) =>
              s.slug === targetSlug || s.urlSlug === targetSlug
          );
          if (seo) {
            if (!name && seo.name) setName(seo.name);
            setTitle(seo.title ?? "");
            setDescription(seo.description ?? "");
            setUrlSlug(seo.urlSlug ?? targetSlug);
            setPrimaryKeyword(seo.primaryKeyword ?? "");
            const rawPopular = (seo as { popularSearches?: string[] }).popularSearches;
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
              Array.isArray(seo.content) && seo.content.length
                ? normalizeBlocks(seo.content)
                : [
                    { id: uid(), type: "h2", text: "" },
                    { id: uid(), type: "p", text: "" },
                  ]
            );
            setFaqs(Array.isArray(seo.faqs) ? seo.faqs : []);
            setStatus(seo.status === "published" ? "published" : "draft");
          } else {
            setUrlSlug(targetSlug);
            setContent([
              { id: uid(), type: "h2", text: "" },
              { id: uid(), type: "p", text: "" },
            ]);
            setFaqs([]);
            setPopularSearches([]);
          }
        } else {
          setContent([
            { id: uid(), type: "h2", text: "" },
            { id: uid(), type: "p", text: "" },
          ]);
          setFaqs([]);
          setPopularSearches([]);
        }
      } catch {
        setError("Failed to load city SEO details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editSlug, activeSlug]);

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

      let slug = activeSlug || editSlug || "";
      if (!slug) {
        const existing = allCities.find(
          (c) =>
            c.name.toLowerCase() === targetName.toLowerCase() ||
            c.slug.toLowerCase() === slugify(targetName).toLowerCase()
        );
        if (existing) {
          slug = existing.slug;
        }
      }

      if (!slug) {
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
        if (
          !cRes.ok &&
          !cData.error?.toLowerCase().includes("already exists")
        ) {
          setError(cData.error || "Failed to add city.");
          setSaving(false);
          return null;
        }
        slug = cData.city?.slug || slugify(targetName);
      }

      const finalUrlSlug = (
        urlSlug.trim() ||
        slugify(title) ||
        slugify(targetName) ||
        slug
      ).toLowerCase();

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
          status: publish ? "published" : "draft",
        }),
      });

      const sData = await sRes.json();
      if (!sRes.ok) {
        setError(sData.error || "Failed to save SEO content.");
        setSaving(false);
        return null;
      }

      setActiveSlug(slug);
      setStatus(publish ? "published" : "draft");
      setSuccess(
        publish
          ? "City SEO published successfully!"
          : "City SEO draft saved successfully!"
      );
      setTimeout(() => setSuccess(""), 4000);
      return finalUrlSlug;
    } catch {
      setError("An error occurred while saving SEO.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function preview() {
    const targetSlug = urlSlug.trim() || activeSlug || editSlug || slugify(name);
    if (!targetSlug) {
      setError("Please enter a city name or URL slug before previewing.");
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

  if (loading) {
    return <AdminCitySeoSkeleton />;
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 min-w-0 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 shadow-inner">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <span>
              {isEdit
                ? `SEO Editor — ${name || editSlug}`
                : "Add New City & SEO"}
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Write and optimize SEO metadata, content blocks, and FAQs for the city page.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                status === "published"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
              }`}
            >
              {status === "published" ? "Published" : "Draft"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-60 transition cursor-pointer"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={preview}
            disabled={saving || (!activeSlug && !editSlug && !urlSlug && !name.trim())}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-60 transition cursor-pointer"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-5 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-60 transition cursor-pointer active:scale-[0.98]"
          >
            {saving ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      <Link
        href="/admin/city"
        className="mt-4 inline-block text-sm font-bold text-amber-400 underline-offset-2 hover:underline"
      >
        &larr; Back to City List
      </Link>

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

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">City Information</h2>
              {allCities.some((c) => c.name.toLowerCase() === name.trim().toLowerCase()) && (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                  ✓ Existing City Linked
                </span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City Name" hint="Select or type city name">
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

              <Field label="State / Region" hint="State for this city">
                <input
                  className={inputClass}
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="e.g. Maharashtra"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <h2 className="mb-4 text-lg font-bold text-white">SEO Settings</h2>
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
                  placeholder="Best Places & Services in City | RKB"
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

              <Field label="URL Slug" hint="Auto-generated from the title. Editable.">
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

              <Field label="Primary Keyword">
                <input
                  className={inputClass}
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                  placeholder="city services"
                />
              </Field>

              <TagInput
                label="Popular Searches"
                placeholder="Type keyword and press Enter (or comma)"
                tags={popularSearches}
                onChange={setPopularSearches}
                hint="Add popular and trending search terms for this city. These will appear under 'Most Search in {city name}' on the published city page."
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
                  className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-slate-200 hover:file:bg-white/15"
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

          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white">Content Editor</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addBlock("h2")}
                  className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
                >
                  + Add Heading
                </button>
                <button
                  type="button"
                  onClick={() => addBlock("p")}
                  className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
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
                  className={`flex gap-2 rounded-xl border border-white/10 bg-slate-800/60 p-2.5 ${
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
                    <option value="h2" className="bg-slate-900">H2 — Heading 2</option>
                    <option value="h3" className="bg-slate-900">H3 — Heading 3</option>
                    <option value="p" className="bg-slate-900">Paragraph</option>
                  </select>
                  <textarea
                    value={block.text}
                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                    placeholder="Write your content here..."
                    rows={block.type === "p" ? 3 : 1}
                    className={`flex-1 rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-white outline-none focus:border-amber-500 placeholder-slate-500 ${
                      block.type === "h2"
                        ? "text-xl font-bold"
                        : block.type === "h3"
                        ? "text-lg font-semibold"
                        : "text-base"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    aria-label="Delete block"
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-300 transition"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {content.length === 0 && (
                <p className="text-sm text-slate-500">
                  No content blocks yet. Use “Add Heading” or “Add Paragraph”.
                </p>
              )}
            </div>
          </section>

          {/* FAQ Editor Section */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">
                  FAQ Editor (Frequently Asked Questions)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Add questions &amp; solutions for this city page. Users can click questions to expand solutions in an accordion.
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
                  className={`flex flex-col gap-2.5 rounded-xl border border-white/10 bg-slate-800/60 p-3 sm:p-4 ${
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
                        Q#{i + 1}
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
                      placeholder="e.g. How do I contact service providers in this city?"
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
                      placeholder="Write the detailed solution or answer here..."
                      rows={3}
                      className="w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition leading-relaxed"
                    />
                  </div>
                </div>
              ))}

              {faqs.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/15 bg-slate-800/30 p-6 text-center">
                  <p className="text-sm font-medium text-slate-400">
                    No FAQs added yet. Click &ldquo;+ Add FAQ&rdquo; above to add questions and solutions.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20">
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
                  {score}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">SEO Score</p>
                <p className="text-xs text-slate-400">
                  {passed} of {checks.length} checks passed
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <h2 className="mb-3 text-lg font-bold text-white">Google Preview</h2>
            <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
              <p className="text-xs text-emerald-400 font-mono">{`example.com/${urlSlug || "url-slug"}`}</p>
              <p className="mt-1 text-base font-semibold text-sky-400 hover:underline cursor-pointer">
                {title || "Your SEO title will appear here"}
              </p>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                {description || "Your meta description will appear here as a snippet in search results."}
              </p>
            </div>
            <div className="mt-4 space-y-1 text-xs text-slate-400 font-mono">
              <p>Title: <span className="text-slate-200">{titleLen} chars</span></p>
              <p>Meta description: <span className="text-slate-200">{descLen} chars</span></p>
              <p>Primary keyword usage: <span className="text-amber-400">{keywordUsage} times</span></p>
              <p>Content word count: <span className="text-slate-200">{wordCount}</span></p>
              <p>Headings: <span className="text-slate-200">H2: {h2Count} · H3: {h3Count}</span></p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <h2 className="mb-3 text-lg font-bold text-white">SEO Checklist</h2>
            <ul className="space-y-2.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2.5 text-sm">
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold ${
                      c.ok ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {c.ok ? "✓" : "!"}
                  </span>
                  <span className={c.ok ? "text-slate-200" : "text-slate-400"}>{c.label}</span>
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
