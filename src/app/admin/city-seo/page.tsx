"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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

type ParentCitySeo = {
  title?: string;
  description?: string;
  primaryKeyword?: string;
  popularSearches?: string[];
  content?: Array<{ type: BlockType | string; text: string }>;
  faqs?: Array<{ question: string; answer: string }>;
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
  const editArea = params.get("area") || "";
  const isAreaEdit = Boolean(editArea);
  const isEdit = Boolean(editSlug);

  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const [allCities, setAllCities] = useState<
    { name: string; slug: string; state?: string }[]
  >([]);
  const [activeSlug, setActiveSlug] = useState(editSlug || "");
  const [stateName, setStateName] = useState("");

  // Local Area & Parent City specific state
  const [parentCityName, setParentCityName] = useState("");
  const [parentCitySeo, setParentCitySeo] = useState<ParentCitySeo | null>(null);
  const [areaMode, setAreaMode] = useState<"inherit" | "individual">("individual");
  const [cityLocalAreas, setCityLocalAreas] = useState<
    Array<{ name: string; slug: string; mode?: string }>
  >([]);

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
  const [jsonPasteText, setJsonPasteText] = useState("");
  const [jsonStatusMsg, setJsonStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

        // CASE A: Editing a Local Area (e.g. ?city=mumbai&area=andheri-west)
        if (isAreaEdit && editSlug && editArea) {
          const matchedCity = fetchedCities.find((c) => c.slug === editSlug);
          const pName = matchedCity?.name || editSlug;
          setParentCityName(pName);

          // Fetch parent city SEO
          const parentSeo = (seoRes.seo ?? []).find(
            (s: { slug: string; urlSlug?: string }) =>
              s.slug === editSlug || s.urlSlug === editSlug
          );
          setParentCitySeo(parentSeo || null);

          // Fetch local area info and its custom SEO
          const [areaListRes, localSeoRes] = await Promise.all([
            fetch(`/api/admin/local-areas?citySlug=${encodeURIComponent(editSlug)}`, {
              credentials: "include",
            }).then((r) => r.json()).catch(() => ({ localAreas: [] })),
            fetch(
              `/api/admin/local-area-seo?citySlug=${encodeURIComponent(
                editSlug
              )}&areaSlug=${encodeURIComponent(editArea)}`,
              { credentials: "include" }
            ).then((r) => r.json()).catch(() => ({})),
          ]);

          const localAreaRecord = (areaListRes.localAreas ?? []).find(
            (a: { slug: string; name: string }) => a.slug.toLowerCase() === editArea.toLowerCase()
          );
          const aName = localAreaRecord?.name || editArea;
          setName(aName);
          setUrlSlug(`${editSlug}/${editArea}`);

          const existingAreaSeo = localSeoRes.seo;
          if (existingAreaSeo) {
            setAreaMode(existingAreaSeo.mode || "individual");
            setTitle(existingAreaSeo.title ?? "");
            setDescription(existingAreaSeo.description ?? "");
            setPrimaryKeyword(existingAreaSeo.primaryKeyword ?? "");
            setPopularSearches(existingAreaSeo.popularSearches ?? []);
            setCanonicalUrl(existingAreaSeo.canonicalUrl ?? "");
            setFeaturedImage(existingAreaSeo.featuredImage ?? "");
            setImageAlt(existingAreaSeo.imageAlt ?? "");
            setContent(
              Array.isArray(existingAreaSeo.content) && existingAreaSeo.content.length
                ? normalizeBlocks(existingAreaSeo.content)
                : [
                    { id: uid(), type: "h2", text: "" },
                    { id: uid(), type: "p", text: "" },
                  ]
            );
            setFaqs(Array.isArray(existingAreaSeo.faqs) ? existingAreaSeo.faqs : []);
            setStatus(existingAreaSeo.status === "published" ? "published" : "draft");
          } else {
            // Default prefill for local area
            setAreaMode("inherit");
            setTitle(`Best Places & Services in ${aName}, ${pName} | RKB`);
            setDescription(
              `Explore top verified places, services, and attractions in ${aName}, ${pName} on RKB.`
            );
            setPrimaryKeyword(`${aName} ${pName}`);
            setPopularSearches([
              `${aName} services`,
              `${aName} ${pName}`,
              `Verified ads in ${aName}`,
            ]);
            setContent([
              { id: uid(), type: "h2", text: `${aName}, ${pName}` },
              { id: uid(), type: "p", text: "" },
            ]);
            setFaqs([]);
            setStatus("draft");
          }
        } else if (editSlug || activeSlug) {
          // CASE B: Editing a City (e.g. ?city=mumbai)
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

          // Load local areas of this city for the Local Areas card section
          try {
            const [areasRes, areaSeoRes] = await Promise.all([
              fetch(`/api/admin/local-areas?citySlug=${encodeURIComponent(targetSlug)}`, {
                credentials: "include",
              }).then((r) => r.json()),
              fetch(`/api/admin/local-area-seo?citySlug=${encodeURIComponent(targetSlug)}`, {
                credentials: "include",
              }).then((r) => r.json()),
            ]);

            const areas = areasRes.localAreas ?? [];
            const areaSeoList = areaSeoRes.seoList ?? [];
            const areaSeoMap = new Map<string, string>();
            areaSeoList.forEach((s: { areaSlug: string; mode?: string }) => {
              areaSeoMap.set(s.areaSlug.toLowerCase(), s.mode || "inherit");
            });

            setCityLocalAreas(
              areas.map((a: { name: string; slug: string }) => ({
                name: a.name,
                slug: a.slug,
                mode: areaSeoMap.get(a.slug.toLowerCase()) || "inherit",
              }))
            );
          } catch {
            setCityLocalAreas([]);
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
        setError("Failed to load details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSlug, editArea]);

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

  function getSampleJsonString(): string {
    const cityName = name.trim() || "Mumbai";
    const sample = {
      name: cityName,
      state: stateName.trim() || "Maharashtra",
      title:
        title ||
        `Best Escort & Call Girl Services in ${cityName} | RKB`,
      description:
        description ||
        `Find top verified escorts and independent call girls in ${cityName}. 100% genuine photos, safe booking, 24/7 service.`,
      urlSlug: urlSlug || slugify(cityName),
      primaryKeyword: primaryKeyword || `call girls in ${cityName.toLowerCase()}`,
      popularSearches: popularSearches.length
        ? popularSearches
        : [
            `escorts in ${cityName.toLowerCase()}`,
            `${cityName.toLowerCase()} call girls`,
            `independent escorts ${cityName.toLowerCase()}`,
            `vip escort service in ${cityName.toLowerCase()}`,
            `hotel delivery call girl ${cityName.toLowerCase()}`,
          ],
      canonicalUrl:
        canonicalUrl ||
        `https://rojloo.vercel.app/places/${urlSlug || slugify(cityName)}`,
      featuredImage: featuredImage || "",
      imageAlt: imageAlt || `${cityName} city guide`,
      status: "draft",
      content: content.length
        ? content.map((c) => ({ type: c.type, text: c.text }))
        : [
            {
              type: "h2",
              text: `Top Escort Services in ${cityName}`,
            },
            {
              type: "p",
              text: `${cityName} offers unmatched nightlife and top-tier services across all major localities with verified contacts.`,
            },
            {
              type: "h2",
              text: "Why Choose Verified Services on RKB",
            },
            {
              type: "p",
              text: "Safety, genuine photos, and direct WhatsApp contact make booking fast and secure.",
            },
          ],
      faqs: faqs.length
        ? faqs.map((f) => ({ question: f.question, answer: f.answer }))
        : [
            {
              question: `How do I contact service providers in ${cityName}?`,
              answer:
                "You can browse verified advertiser profiles and connect directly via phone call, WhatsApp, or Telegram.",
            },
            {
              question: "Are advertiser photos verified?",
              answer:
                "Yes, our team verifies advertiser profile photos to ensure authentic listings.",
            },
          ],
    };

    return JSON.stringify(sample, null, 2);
  }

  function downloadSampleJson() {
    const cityName = name.trim() || "Mumbai";
    const sampleStr = getSampleJsonString();
    const blob = new Blob([sampleStr], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(cityName)}-seo-sample.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function applyJsonString(rawText: string): boolean {
    const trimmed = rawText.trim();
    if (!trimmed) {
      const msg = "Please enter or paste JSON text first.";
      setJsonStatusMsg({ type: "error", text: msg });
      setError(msg);
      return false;
    }

    setError("");
    setSuccess("");

    try {
      const data = JSON.parse(trimmed);

      if (!data || typeof data !== "object") {
        const msg = "The JSON content is empty or not a valid JSON object.";
        setJsonStatusMsg({ type: "error", text: msg });
        setError(msg);
        return false;
      }

      // 1. City Name & State
      const parsedName = String(
        data.name || data.cityName || data.city || ""
      ).trim();
      if (parsedName) {
        setName(parsedName);
        const match = allCities.find(
          (c) =>
            c.name.toLowerCase() === parsedName.toLowerCase() ||
            c.slug.toLowerCase() === slugify(parsedName)
        );
        if (match) {
          setActiveSlug(match.slug);
          if (match.state) setStateName(match.state);
        }
      }

      const parsedState = String(data.state || data.stateName || "").trim();
      if (parsedState) setStateName(parsedState);

      // 2. Title & Description
      const parsedTitle = String(
        data.title || data.seoTitle || data.metaTitle || ""
      ).trim();
      if (parsedTitle) setTitle(parsedTitle);

      const parsedDesc = String(
        data.description ||
          data.metaDescription ||
          data.meta_description ||
          ""
      ).trim();
      if (parsedDesc) setDescription(parsedDesc);

      // 3. Slug
      const parsedSlug = String(
        data.urlSlug || data.url_slug || data.slug || ""
      ).trim();
      if (parsedSlug) {
        setUrlSlug(slugify(parsedSlug));
        setSlugManual(true);
      } else if (parsedTitle && !urlSlug) {
        setUrlSlug(slugify(parsedTitle));
      } else if (parsedName && !urlSlug) {
        setUrlSlug(slugify(parsedName));
      }

      // 4. Keywords
      const parsedPrimary = String(
        data.primaryKeyword ||
          data.primary_keyword ||
          data.keyword ||
          data.keywords ||
          ""
      ).trim();
      if (parsedPrimary) setPrimaryKeyword(parsedPrimary);

      const rawPop = data.popularSearches || data.popular_searches || data.searches;
      const rawSec = data.secondaryKeywords || data.secondary_keywords;
      const rawLong = data.longTailKeywords || data.long_tail_keywords;

      const combinedKeywords: string[] = [];

      const parseToArray = (val: unknown): string[] => {
        if (Array.isArray(val)) {
          return val.map(String).map((s) => s.trim()).filter(Boolean);
        } else if (typeof val === "string" && val.trim()) {
          return val.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
        }
        return [];
      };

      if (rawPop) combinedKeywords.push(...parseToArray(rawPop));
      if (rawSec) combinedKeywords.push(...parseToArray(rawSec));
      if (rawLong) combinedKeywords.push(...parseToArray(rawLong));

      if (combinedKeywords.length > 0) {
        setPopularSearches(Array.from(new Set(combinedKeywords)));
      }

      // 5. Canonical & Images
      const parsedCanonical = String(
        data.canonicalUrl || data.canonical_url || data.canonical || ""
      ).trim();
      if (parsedCanonical) setCanonicalUrl(parsedCanonical);

      const parsedImage = String(
        data.featuredImage || data.featured_image || data.image || ""
      ).trim();
      if (parsedImage) setFeaturedImage(parsedImage);

      const parsedAlt = String(
        data.imageAlt || data.image_alt || data.alt || ""
      ).trim();
      if (parsedAlt) setImageAlt(parsedAlt);

      // 6. Content Blocks (support blocks array, strings array, markdown, sections)
      const newBlocks: ContentBlock[] = [];
      const rawContent =
        data.content || data.blocks || data.body || data.sections;

      if (Array.isArray(rawContent)) {
        for (const item of rawContent) {
          if (typeof item === "string") {
            const str = item.trim();
            if (!str) continue;
            if (str.startsWith("### ")) {
              newBlocks.push({ id: uid(), type: "h3", text: str.slice(4).trim() });
            } else if (str.startsWith("## ") || str.startsWith("# ")) {
              newBlocks.push({ id: uid(), type: "h2", text: str.replace(/^#+\s*/, "").trim() });
            } else {
              newBlocks.push({ id: uid(), type: "p", text: str });
            }
          } else if (typeof item === "object" && item !== null) {
            const bType: BlockType =
              item.type === "h1" || item.tag === "h1" || item.heading === 1 || item.type === "h2" || item.tag === "h2" || item.heading === 2
                ? "h2"
                : item.type === "h3" || item.tag === "h3" || item.heading === 3
                ? "h3"
                : "p";
            const bText = String(
              item.text ||
                item.content ||
                item.value ||
                item.body ||
                item.title ||
                ""
            ).trim();
            if (bText) {
              newBlocks.push({
                id: item.id || uid(),
                type: bType,
                text: bText,
              });
            }
          }
        }
      } else if (typeof rawContent === "string" && rawContent.trim()) {
        const paragraphs = rawContent.split(/\r?\n\r?\n/);
        for (const p of paragraphs) {
          const trimmed = p.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith("### ")) {
            newBlocks.push({ id: uid(), type: "h3", text: trimmed.slice(4).trim() });
          } else if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
            newBlocks.push({ id: uid(), type: "h2", text: trimmed.replace(/^#+\s*/, "").trim() });
          } else {
            newBlocks.push({ id: uid(), type: "p", text: trimmed });
          }
        }
      }

      if (newBlocks.length > 0) {
        setContent(newBlocks);
      }

      // 7. FAQs
      const newFaqs: FaqItem[] = [];
      const rawFaqs = data.faqs || data.faq || data.questions;
      if (Array.isArray(rawFaqs)) {
        for (const f of rawFaqs) {
          if (typeof f === "object" && f !== null) {
            const question = String(
              f.question || f.q || f.title || ""
            ).trim();
            const answer = String(
              f.answer ||
                f.a ||
                f.solution ||
                f.description ||
                f.content ||
                ""
            ).trim();
            if (question || answer) {
              newFaqs.push({
                id: f.id || uid(),
                question,
                answer,
              });
            }
          }
        }
      }

      if (newFaqs.length > 0) {
        setFaqs(newFaqs);
      }

      if (data.status === "published" || data.status === "draft") {
        setStatus(data.status);
      }

      const successMsg = `JSON arranged successfully onto the form! Populated City, SEO Title, Description, Keywords, ${newBlocks.length} content block(s), and ${newFaqs.length} FAQ(s).`;
      setJsonStatusMsg({ type: "success", text: successMsg });
      setSuccess(successMsg);
      return true;
    } catch (err) {
      const errMsg = `Failed to parse JSON: ${
        err instanceof Error ? err.message : "Invalid JSON syntax"
      }`;
      setJsonStatusMsg({ type: "error", text: errMsg });
      setError(errMsg);
      return false;
    }
  }

  async function handleJsonFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setJsonPasteText(text);
      applyJsonString(text);
    } catch (err) {
      setError(
        `Failed to read file: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      if (e.target) e.target.value = "";
    }
  }

  function handleApplyPastedJson() {
    applyJsonString(jsonPasteText);
  }

  function handleClearJson() {
    setJsonPasteText("");
    setJsonStatusMsg(null);
  }

  function handleLoadSampleJson() {
    const sample = getSampleJsonString();
    setJsonPasteText(sample);
    setJsonStatusMsg(null);
  }

  function copyFromParentCity() {
    if (!parentCitySeo) return;
    const aName = name || editArea || "";
    const cName = parentCityName || editSlug || "";

    let adaptedTitle = parentCitySeo.title || "";
    if (adaptedTitle) {
      if (adaptedTitle.toLowerCase().includes(cName.toLowerCase())) {
        adaptedTitle = adaptedTitle.replace(
          new RegExp(cName, "gi"),
          `${aName}, ${cName}`
        );
      } else {
        adaptedTitle = `${aName}, ${adaptedTitle}`;
      }
    } else {
      adaptedTitle = `Best Places & Services in ${aName}, ${cName} | RKB`;
    }

    let adaptedDesc = parentCitySeo.description || "";
    if (adaptedDesc) {
      if (adaptedDesc.toLowerCase().includes(cName.toLowerCase())) {
        adaptedDesc = adaptedDesc.replace(
          new RegExp(cName, "gi"),
          `${aName}, ${cName}`
        );
      } else {
        adaptedDesc = `In ${aName}, ${cName}: ${adaptedDesc}`;
      }
    } else {
      adaptedDesc = `Explore top verified places and local classifieds in ${aName}, ${cName} on RKB.`;
    }

    setTitle(adaptedTitle);
    setDescription(adaptedDesc);
    setPrimaryKeyword(`${aName} ${parentCitySeo.primaryKeyword || cName}`);
    setPopularSearches(
      Array.from(
        new Set([
          `${aName} services`,
          `${aName} ${cName}`,
          ...(parentCitySeo.popularSearches ?? []).map((s: string) =>
            s.replace(new RegExp(cName, "gi"), `${aName}, ${cName}`)
          ),
        ])
      ).slice(0, 8)
    );

    const adaptedContent = (parentCitySeo.content ?? []).map((b: { type: BlockType | string; text: string }) => ({
      id: uid(),
      type: (b.type === "h1" ? "h2" : ["h2", "h3", "p"].includes(b.type) ? b.type : "p") as BlockType,
      text: b.text.replace(new RegExp(cName, "gi"), `${aName}, ${cName}`),
    }));
    setContent(
      adaptedContent.length > 0
        ? adaptedContent
        : [
            { id: uid(), type: "h2", text: `${aName}, ${cName}` },
            { id: uid(), type: "p", text: "" },
          ]
    );

    const adaptedFaqs = (parentCitySeo.faqs ?? []).map((f: { question: string; answer: string }) => ({
      id: uid(),
      question: f.question.replace(new RegExp(cName, "gi"), `${aName}, ${cName}`),
      answer: f.answer.replace(new RegExp(cName, "gi"), `${aName}, ${cName}`),
    }));
    setFaqs(adaptedFaqs);

    setAreaMode("individual");
    setSuccess(`Content copied and adapted from parent city ${cName}!`);
    setTimeout(() => setSuccess(""), 4000);
  }

  async function save(publish: boolean): Promise<string | null> {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const targetName = name.trim();
      if (!targetName) {
        setError(isAreaEdit ? "Local area name is required." : "City name is required.");
        setSaving(false);
        return null;
      }

      // 1. If editing Local Area SEO
      if (isAreaEdit) {
        const sRes = await fetch("/api/admin/local-area-seo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            citySlug: editSlug,
            cityName: parentCityName || editSlug,
            areaSlug: editArea,
            areaName: targetName,
            mode: areaMode,
            title,
            description,
            keywords: primaryKeyword,
            primaryKeyword,
            popularSearches,
            secondaryKeywords: popularSearches,
            canonicalUrl:
              canonicalUrl.trim() ||
              `https://rojloo.vercel.app/places/${editSlug}/${editArea}`,
            featuredImage,
            imageAlt,
            content,
            faqs,
            status: publish ? "published" : "draft",
          }),
        });

        const sData = await sRes.json();
        if (!sRes.ok) {
          setError(sData.error || "Failed to save Local Area SEO.");
          setSaving(false);
          return null;
        }

        setStatus(publish ? "published" : "draft");
        setSuccess(
          publish
            ? "Local Area SEO published successfully!"
            : "Local Area SEO draft saved successfully!"
        );
        setTimeout(() => setSuccess(""), 4000);
        return editArea;
      }

      // 2. Editing City SEO
      // Check if city exists in loaded cities
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

      // If brand new city, create via /api/admin/cities
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
        setError(sData.error || "Failed to save SEO.");
        setSaving(false);
        return null;
      }

      setActiveSlug(slug);
      setStatus(publish ? "published" : "draft");
      setSuccess(
        publish ? "Published successfully!" : "Draft saved successfully!"
      );
      if (typeof window !== "undefined") {
        window.history.replaceState(
          null,
          "",
          `/admin/city-seo?city=${encodeURIComponent(slug)}`
        );
      }

      setTimeout(() => setSuccess(""), 4000);
      return slug;
    } catch {
      setError("Something went wrong. Please try again.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function preview() {
    setError("");
    const targetName = name.trim();

    if (isAreaEdit) {
      const savedSlug = await save(false);
      if (savedSlug || editArea) {
        window.open(`/places/${editSlug}/${editArea}?preview=true`, "_blank");
      }
      return;
    }

    const targetSlug =
      activeSlug || editSlug || urlSlug.trim() || slugify(targetName);
    if (!targetSlug && !targetName) {
      setError("Please enter a city name before previewing.");
      return;
    }

    // Auto-save draft before previewing so latest changes are immediately reflected
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
    { label: "Top page H1 exists", ok: Boolean(name.trim() || title.trim()) },
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
              {isAreaEdit
                ? `Local Area SEO — ${name || editArea}, ${parentCityName || editSlug}`
                : isEdit
                ? `SEO Editor — ${name || editSlug}`
                : "Add New City & SEO"}
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {isAreaEdit
              ? `Configure and optimize search engine metadata for ${name || editArea} (${parentCityName || editSlug}).`
              : "Write and optimize SEO metadata, content blocks, and FAQs for the city page."}
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
            {isAreaEdit && (
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                  areaMode === "individual"
                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                    : "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                }`}
              >
                {areaMode === "individual" ? "Mode: Individual SEO" : "Mode: Inherits City"}
              </span>
            )}
          </div>

          {isAreaEdit && (
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <Link
                href={`/admin/city-seo?city=${encodeURIComponent(editSlug)}`}
                className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition"
              >
                &larr; Back to {parentCityName || "City"} SEO
              </Link>
              <div className="inline-flex rounded-xl border border-white/10 bg-slate-900/90 p-0.5">
                <button
                  type="button"
                  onClick={() => setAreaMode("inherit")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                    areaMode === "inherit"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Same as City (Inherit)
                </button>
                <button
                  type="button"
                  onClick={() => setAreaMode("individual")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                    areaMode === "individual"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Individual SEO Content
                </button>
              </div>
              {parentCitySeo && (
                <button
                  type="button"
                  onClick={copyFromParentCity}
                  className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition cursor-pointer"
                >
                  📋 Copy Content from {parentCityName || "City"}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleJsonFileSelect}
          />
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-white/10 transition cursor-pointer"
            title="Upload a .json file to automatically fill all SEO fields, content blocks, and FAQs"
          >
            <span>📁</span> Upload JSON
          </button>
          <button
            type="button"
            onClick={downloadSampleJson}
            className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition cursor-pointer"
            title="Download an example JSON format template"
          >
            <span>⬇</span> Sample JSON
          </button>
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

      {isEdit && (
        <Link
          href="/admin/city"
          className="mt-4 inline-block text-sm font-bold text-amber-400 underline-offset-2 hover:underline"
        >
          &larr; Back to Cities
        </Link>
      )}

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
          {/* JSON Paste & Auto-Fill Section */}
          <section className="rounded-2xl border border-amber-500/30 bg-slate-900/80 p-4 sm:p-6 shadow-xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-3 mb-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Paste SEO JSON Content</span>
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                    Fast Fill
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Paste JSON file text here to automatically arrange and fill the full SEO form below.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleLoadSampleJson}
                  className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10 transition cursor-pointer"
                  title="Insert sample JSON format into textarea"
                >
                  Load Sample
                </button>
                {jsonPasteText && (
                  <button
                    type="button"
                    onClick={handleClearJson}
                    className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <textarea
                  rows={6}
                  value={jsonPasteText}
                  onChange={(e) => {
                    setJsonPasteText(e.target.value);
                    if (jsonStatusMsg) setJsonStatusMsg(null);
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text");
                    if (pasted && pasted.trim().startsWith("{")) {
                      setTimeout(() => {
                        applyJsonString(pasted);
                      }, 50);
                    }
                  }}
                  placeholder={`Paste your JSON file text here...\nExample:\n{\n  "name": "Mumbai",\n  "state": "Maharashtra",\n  "title": "Best Places & Services in Mumbai | RKB",\n  "description": "Find top verified profiles and classifieds in Mumbai...",\n  "primaryKeyword": "services in mumbai",\n  "popularSearches": ["mumbai services", "top verified in mumbai"],\n  "content": [\n    { "type": "h2", "text": "Top Classifieds in Mumbai" },\n    { "type": "p", "text": "Mumbai offers unmatched nightlife..." }\n  ],\n  "faqs": [\n    { "question": "How do I contact providers in Mumbai?", "answer": "Browse verified profiles..." }\n  ]\n}`}
                  className="w-full font-mono text-xs sm:text-sm rounded-xl border border-white/15 bg-slate-800/90 p-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition resize-y leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleApplyPastedJson}
                  disabled={!jsonPasteText.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-5 py-2 text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <span>Apply JSON to Form</span>
                </button>

                <p className="text-[11px] text-slate-400">
                  Tip: Pasting valid JSON will auto-arrange and fill all fields on the page.
                </p>
              </div>

              {jsonStatusMsg && (
                <div
                  className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium animate-in fade-in ${
                    jsonStatusMsg.type === "success"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {jsonStatusMsg.text}
                </div>
              )}
            </div>
          </section>

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

      {/* LOCAL AREAS OF THIS CITY LIST WITH EDIT SEO BUTTONS */}
      {!isAreaEdit && editSlug && (
        <section className="mt-10 rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-7 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">
                  Local Areas in {name || editSlug}
                </h2>
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                  {cityLocalAreas.length} Areas
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Click <strong>Edit SEO</strong> on any local area to customize its individual SEO content or configure parent-child inheritance.
              </p>
            </div>
            <Link
              href="/admin/dynamic-seo"
              className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-bold text-slate-200 transition flex items-center gap-1.5"
            >
              <span>⚡</span> Manage in Dynamic SEO
            </Link>
          </div>

          {cityLocalAreas.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500 italic">
              No local areas recorded under {name || editSlug}. You can add local areas in State/City management.
            </p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cityLocalAreas.map((area) => {
                const isCustom = area.mode === "individual";
                return (
                  <div
                    key={area.slug}
                    className={`flex items-center justify-between gap-2 rounded-xl border p-3.5 transition ${
                      isCustom
                        ? "border-purple-500/30 bg-purple-500/10"
                        : "border-white/10 bg-slate-800/40 hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isCustom ? (
                          <span
                            className="h-2 w-2 rounded-full bg-emerald-400 shrink-0"
                            title="Individual Custom SEO active"
                          />
                        ) : (
                          <span
                            className="h-2 w-2 rounded-full bg-sky-400 shrink-0"
                            title="Inherits Parent City SEO"
                          />
                        )}
                        <p className="font-bold text-sm text-white truncate">
                          {area.name}, {name || editSlug}
                        </p>
                      </div>
                      <span className="block text-xs text-slate-400 mt-0.5">
                        {isCustom ? "Individual SEO" : "Inherits City SEO"}
                      </span>
                    </div>
                    <Link
                      href={`/admin/city-seo?city=${encodeURIComponent(
                        editSlug
                      )}&area=${encodeURIComponent(area.slug)}`}
                      className="rounded-lg border border-purple-500/40 bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/30 transition shrink-0"
                    >
                      Edit SEO
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
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
