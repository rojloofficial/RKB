"use client";

import React, { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { BlogPost, BlogCategory, BlogSection, BlogFaq, BLOG_CATEGORIES, slugify } from "@/lib/blog";
import { uploadWatermarkedBlogImage } from "@/lib/blog-image-watermark";

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  // Form Fields State
  const [formTitle, setFormTitle] = useState<string>("");
  const [formSlug, setFormSlug] = useState<string>("");
  const [formCategory, setFormCategory] = useState<BlogCategory>("City Guides");
  const [formExcerpt, setFormExcerpt] = useState<string>("");
  const [formCoverImage, setFormCoverImage] = useState<string>("");
  const [formCoverImageAlt, setFormCoverImageAlt] = useState<string>("");
  const [formAuthorName, setFormAuthorName] = useState<string>("RKB Editorial");
  const [formAuthorRole, setFormAuthorRole] = useState<string>("City Guide Desk");
  const [formStatus, setFormStatus] = useState<"published" | "draft">("published");
  const [formFeatured, setFormFeatured] = useState<boolean>(false);
  const [formTags, setFormTags] = useState<string>("");
  const [formMetaTitle, setFormMetaTitle] = useState<string>("");
  const [formMetaDescription, setFormMetaDescription] = useState<string>("");
  const [formSections, setFormSections] = useState<BlogSection[]>([]);
  const [formFaqs, setFormFaqs] = useState<BlogFaq[]>([]);

  // Fetch posts from API
  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/blogs?limit=100");
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts(data.posts || []);
      } else {
        setError(data.error || "Failed to load posts.");
      }
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchExcerpt = p.excerpt.toLowerCase().includes(q);
      if (!matchTitle && !matchExcerpt) return false;
    }
    return true;
  });

  // Calculate quick stats
  const totalPostsCount = posts.length;
  const publishedCount = posts.filter((p) => p.status === "published").length;
  const draftsCount = posts.filter((p) => p.status === "draft").length;
  const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);

  // Open modal for new post
  const handleOpenCreateModal = () => {
    setEditingPostId(null);
    setFormTitle("");
    setFormSlug("");
    setFormCategory("City Guides");
    setFormExcerpt("");
    setFormCoverImage(
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"
    );
    setFormCoverImageAlt("");
    setFormAuthorName("RKB Editorial");
    setFormAuthorRole("City Guide Desk");
    setFormStatus("published");
    setFormFeatured(false);
    setFormTags("Mumbai, Guide, Local");
    setFormMetaTitle("");
    setFormMetaDescription("");
    setFormSections([
      {
        id: "sec_1",
        heading: "Introduction & Overview",
        content: "Provide a detailed guide with verified local insights...",
        type: "text",
      },
      {
        id: "sec_2",
        heading: "Key Safety & Recommendation Highlights",
        content: "Always check verified ratings and direct contacts.",
        type: "callout",
      },
    ]);
    setFormFaqs([
      {
        id: "faq_1",
        question: "How do I find verified listings in this city?",
        answer: "Visit the RKB Places directory and use local area filters.",
      },
    ]);
    setIsModalOpen(true);
  };

  // Open modal for editing existing post
  const handleOpenEditModal = (post: BlogPost) => {
    setEditingPostId(post._id);
    setFormTitle(post.title);
    setFormSlug(post.slug);
    setFormCategory(post.category);
    setFormExcerpt(post.excerpt);
    setFormCoverImage(post.coverImage);
    setFormCoverImageAlt(post.coverImageAlt || "");
    setFormAuthorName(post.author.name);
    setFormAuthorRole(post.author.role || "");
    setFormStatus(post.status);
    setFormFeatured(Boolean(post.featured));
    setFormTags((post.tags || []).join(", "));
    setFormMetaTitle(post.metaTitle || "");
    setFormMetaDescription(post.metaDescription || "");
    setFormSections(
      post.sections && post.sections.length > 0
        ? post.sections
        : [
            {
              id: "sec_1",
              heading: "Overview",
              content: "",
              type: "text",
            },
          ]
    );
    setFormFaqs(post.faqs || []);
    setIsModalOpen(true);
  };

  // Auto-slug when title changes if creating
  const handleTitleChange = (val: string) => {
    setFormTitle(val);
    if (!editingPostId) {
      setFormSlug(slugify(val));
    }
  };

  // Cover image upload with client-side canvas watermark
  const handleCoverImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const url = await uploadWatermarkedBlogImage(file, "rkb.in");
      setFormCoverImage(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to upload and watermark image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Section image upload with canvas watermark
  const handleSectionImageFileSelect = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const url = await uploadWatermarkedBlogImage(file, "rkb.in");
      const updated = [...formSections];
      updated[idx] = { ...updated[idx], image: url };
      setFormSections(updated);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to upload section image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Section manipulation
  const handleAddSection = () => {
    setFormSections([
      ...formSections,
      {
        id: `sec_${Date.now()}`,
        heading: "",
        content: "",
        type: "text",
      },
    ]);
  };

  const handleUpdateSection = (idx: number, updates: Partial<BlogSection>) => {
    const copy = [...formSections];
    copy[idx] = { ...copy[idx], ...updates };
    setFormSections(copy);
  };

  const handleRemoveSection = (idx: number) => {
    setFormSections(formSections.filter((_, i) => i !== idx));
  };

  // FAQ manipulation
  const handleAddFaq = () => {
    setFormFaqs([
      ...formFaqs,
      {
        id: `faq_${Date.now()}`,
        question: "",
        answer: "",
      },
    ]);
  };

  const handleUpdateFaq = (idx: number, updates: Partial<BlogFaq>) => {
    const copy = [...formFaqs];
    copy[idx] = { ...copy[idx], ...updates };
    setFormFaqs(copy);
  };

  const handleRemoveFaq = (idx: number) => {
    setFormFaqs(formFaqs.filter((_, i) => i !== idx));
  };

  // Save Post (Create or Update)
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("Please provide an article title.");
      return;
    }

    setIsSaving(true);
    const postPayload = {
      title: formTitle.trim(),
      slug: formSlug.trim() || slugify(formTitle),
      category: formCategory,
      excerpt: formExcerpt.trim(),
      coverImage: formCoverImage.trim(),
      coverImageAlt: formCoverImageAlt.trim() || formTitle.trim(),
      author: {
        name: formAuthorName.trim() || "RKB Editorial",
        role: formAuthorRole.trim() || "Content Desk",
      },
      status: formStatus,
      featured: formFeatured,
      tags: formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      metaTitle: formMetaTitle.trim() || formTitle.trim(),
      metaDescription: formMetaDescription.trim() || formExcerpt.trim(),
      sections: formSections.filter((s) => s.content.trim() || s.heading?.trim()),
      faqs: formFaqs.filter((f) => f.question.trim() && f.answer.trim()),
    };

    try {
      let res: Response;
      if (editingPostId) {
        res = await fetch(`/api/admin/blogs/${editingPostId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postPayload),
        });
      } else {
        res = await fetch("/api/admin/blogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postPayload),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setIsModalOpen(false);
        startTransition(() => {
          fetchPosts();
        });
      } else {
        alert(data.error || "Failed to save blog post.");
      }
    } catch {
      alert("Network error occurred while saving post.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Post
  const handleDeletePost = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts((prev) => prev.filter((p) => p._id !== id));
      } else {
        alert(data.error || "Failed to delete post.");
      }
    } catch {
      alert("Network error while deleting post.");
    }
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6 min-w-0 max-w-7xl mx-auto w-full">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
            <h1 className="text-2xl font-black tracking-tight text-white">
              Blog & Article Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create, manage, and publish verified city guides with automated HTML5 canvas watermarking.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer"
        >
          <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Write New Article
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Posts</p>
          <p className="text-2xl font-black text-white mt-1">{totalPostsCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Published</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{publishedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Drafts</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{draftsCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Total Views</p>
          <p className="text-2xl font-black text-white mt-1">{totalViews}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Status Filters */}
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            {["all", "published", "draft"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-semibold capitalize transition-all ${
                  statusFilter === st
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Categories</option>
            {BLOG_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Articles Table / List */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">Loading articles...</div>
        ) : error ? (
          <div className="py-16 text-center text-xs text-rose-400">{error}</div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm font-semibold text-slate-300">No blog posts found</p>
            <p className="text-xs text-slate-500 mt-1">Click &quot;Write New Article&quot; to publish your first post.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-bold">Article</th>
                  <th className="py-3.5 px-4 font-bold">Category</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Views</th>
                  <th className="py-3.5 px-4 font-bold">Date</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredPosts.map((post) => (
                  <tr key={post._id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Thumbnail & Title */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-16 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                          <Image
                            src={post.coverImage}
                            alt={post.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                        <div className="max-w-md">
                          <p className="font-bold text-white line-clamp-1">{post.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1">/{post.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {post.category}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {post.status === "published" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          Draft
                        </span>
                      )}
                    </td>

                    {/* Views */}
                    <td className="py-3 px-4 text-slate-300 font-semibold">{post.views || 0}</td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {post.status === "published" && (
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                            title="View Public Article"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(post)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Article"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post._id, post.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete Article"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

      {/* Comprehensive Editor & Section Builder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-2xl text-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-white">
                  {editingPostId ? "Edit Blog Article" : "Create New Blog Article"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Design rich multi-section articles with automated watermark stamping.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-6 text-xs">
              {/* Primary Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-300 mb-1">
                    Article Title <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Top 10 Local Wellness Retreats in Mumbai"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="auto-generated-slug"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-slate-300 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Category <span className="text-amber-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as BlogCategory)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    {BLOG_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Publication Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "published" | "draft")}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="published">Published (Live)</option>
                    <option value="draft">Draft (Hidden)</option>
                  </select>
                </div>

                {/* Featured Checkbox */}
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="formFeatured"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="formFeatured" className="font-bold text-white select-none cursor-pointer">
                    Feature on Blog Homepage (Hero Banner)
                  </label>
                </div>

                {/* Excerpt */}
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-300 mb-1">Excerpt / Summary</label>
                  <textarea
                    rows={2}
                    value={formExcerpt}
                    onChange={(e) => setFormExcerpt(e.target.value)}
                    placeholder="Short summary displayed on cards and search engines..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-white text-xs focus:border-amber-500 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Cover Image & Watermarker Section */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Cover Image & Canvas Watermark
                  </label>
                  {isUploadingImage && (
                    <span className="text-amber-400 text-[11px] animate-pulse">
                      Watermarking & Uploading...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  {/* Upload button */}
                  <div>
                    <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-xl bg-slate-950 cursor-pointer transition-colors p-3 text-center">
                      <svg className="w-6 h-6 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-bold text-white">Upload & Watermark</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG up to 8MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageFileSelect}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* URL Input & Alt text */}
                  <div className="sm:col-span-2 space-y-2">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Direct Image URL</span>
                      <input
                        type="text"
                        value={formCoverImage}
                        onChange={(e) => setFormCoverImage(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">Image Alt Text</span>
                      <input
                        type="text"
                        value={formCoverImageAlt}
                        onChange={(e) => setFormCoverImageAlt(e.target.value)}
                        placeholder="SEO descriptive alt text"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {formCoverImage && (
                  <div className="relative aspect-[16/7] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 mt-2">
                    <Image
                      src={formCoverImage}
                      alt="Cover Preview"
                      fill
                      className="object-cover"
                      sizes="600px"
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 border border-white/10 text-[10px] font-semibold text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      rkb.in
                    </div>
                  </div>
                )}
              </div>

              {/* Author & Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Author Name</label>
                  <input
                    type="text"
                    value={formAuthorName}
                    onChange={(e) => setFormAuthorName(e.target.value)}
                    placeholder="e.g. Suraj Kumar"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Author Role / Title</label>
                  <input
                    type="text"
                    value={formAuthorRole}
                    onChange={(e) => setFormAuthorRole(e.target.value)}
                    placeholder="e.g. Lead City Explorer"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-300 mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="Mumbai, Hotspots, Nightlife, Travel"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Section Builder */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-sm">Article Content Sections</h3>
                    <p className="text-[11px] text-slate-400">Add paragraphs, callout boxes, and subheadings.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-3 py-1.5 text-xs transition-colors"
                  >
                    + Add Section
                  </button>
                </div>

                <div className="space-y-4">
                  {formSections.map((section, idx) => (
                    <div
                      key={section.id || idx}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-400 text-xs">Section #{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={section.type || "text"}
                            onChange={(e) =>
                              handleUpdateSection(idx, {
                                type: e.target.value as "text" | "callout" | "quote",
                              })
                            }
                            className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                          >
                            <option value="text">Standard Text</option>
                            <option value="callout">Amber Callout Box</option>
                            <option value="quote">Quote Block</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(idx)}
                            className="text-slate-500 hover:text-rose-400 text-xs font-bold px-2 py-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={section.heading || ""}
                        onChange={(e) => handleUpdateSection(idx, { heading: e.target.value })}
                        placeholder="Section Heading (optional)"
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                      />

                      <textarea
                        rows={3}
                        value={section.content}
                        onChange={(e) => handleUpdateSection(idx, { content: e.target.value })}
                        placeholder="Write section content here..."
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none leading-relaxed"
                      />

                      {/* Optional Section Image */}
                      <div className="flex items-center gap-3 pt-1">
                        <label className="inline-flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:border-amber-500 cursor-pointer">
                          <span>📷 Watermark & Embed Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSectionImageFileSelect(idx, e)}
                            className="hidden"
                          />
                        </label>
                        {section.image && (
                          <span className="text-[11px] text-emerald-400 truncate max-w-xs">
                            ✓ Image Attached
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic FAQ Builder */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-sm">FAQ Accordion (Optional)</h3>
                    <p className="text-[11px] text-slate-400">Structured question & answer schema for Google rich results.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFaq}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-3 py-1.5 text-xs transition-colors"
                  >
                    + Add FAQ
                  </button>
                </div>

                <div className="space-y-3">
                  {formFaqs.map((faq, idx) => (
                    <div
                      key={faq.id || idx}
                      className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-400 text-[11px]">FAQ #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFaq(idx)}
                          className="text-slate-500 hover:text-rose-400 text-xs font-bold"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => handleUpdateFaq(idx, { question: e.target.value })}
                        placeholder="Question (e.g. Is advance payment required?)"
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => handleUpdateFaq(idx, { answer: e.target.value })}
                        placeholder="Detailed answer..."
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* SEO Meta Tags (Optional) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <h3 className="font-bold text-white text-sm">SEO Meta Overrides (Optional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Meta Title</span>
                    <input
                      type="text"
                      value={formMetaTitle}
                      onChange={(e) => setFormMetaTitle(e.target.value)}
                      placeholder="Title tag for search engines"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Meta Description</span>
                    <input
                      type="text"
                      value={formMetaDescription}
                      onChange={(e) => setFormMetaDescription(e.target.value)}
                      placeholder="Short snippet for search engines"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons Bar */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 text-xs transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingPostId ? "Update Article" : "Publish Article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
