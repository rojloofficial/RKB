"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { BlogPost, BLOG_CATEGORIES, getCategoryBadgeColor } from "@/lib/blog";
import BlogPostCard from "./blog-post-card";
import BlogPagination from "./blog-pagination";

interface BlogListClientProps {
  initialPosts: BlogPost[];
}

const ITEMS_PER_PAGE = 6;

export default function BlogListClient({ initialPosts }: BlogListClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter posts based on category and search query
  const filteredPosts = useMemo(() => {
    return initialPosts.filter((post) => {
      if (selectedCategory !== "All" && post.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = post.title.toLowerCase().includes(q);
        const matchExcerpt = post.excerpt.toLowerCase().includes(q);
        const matchTags = post.tags.some((t) => t.toLowerCase().includes(q));
        const matchContent = post.sections.some((s) => s.content.toLowerCase().includes(q));
        if (!matchTitle && !matchExcerpt && !matchTags && !matchContent) {
          return false;
        }
      }
      return true;
    });
  }, [initialPosts, selectedCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedPosts = useMemo(() => {
    const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredPosts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPosts, safePage]);

  // Handle category change
  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedCategory("All");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Identify featured post for hero showcase on first page when not actively searching
  const featuredPost = useMemo(() => {
    if (safePage === 1 && !searchQuery.trim() && selectedCategory === "All") {
      return initialPosts.find((p) => p.featured) || null;
    }
    return null;
  }, [initialPosts, safePage, searchQuery, selectedCategory]);

  // Posts to display in the grid (exclude featured post if featured hero is displayed)
  const gridPosts = useMemo(() => {
    if (featuredPost) {
      return paginatedPosts.filter((p) => p._id !== featuredPost._id);
    }
    return paginatedPosts;
  }, [paginatedPosts, featuredPost]);

  return (
    <div className="space-y-8">
      {/* Featured Hero Article Banner (Shown on Page 1 without active search) */}
      {featuredPost && (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 transition-all hover:border-amber-500/40">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Image side */}
            <div className="relative min-h-[260px] sm:min-h-[340px] lg:col-span-7 bg-slate-950 overflow-hidden">
              <Image
                src={featuredPost.coverImage}
                alt={featuredPost.coverImageAlt || featuredPost.title}
                fill
                priority
                className="object-cover transition-transform duration-700 hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-slate-950/20" />
              
              {/* Watermark Pill */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-slate-950/80 backdrop-blur-md px-3 py-1.5 border border-white/10 shadow-md">
                <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                <span className="text-xs font-semibold tracking-wide text-white">rkb.in</span>
              </div>
            </div>

            {/* Content side */}
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10 lg:col-span-5 bg-gradient-to-b from-white to-slate-50/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-slate-950 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                  ★ Featured Story
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    getCategoryBadgeColor(featuredPost.category).bg
                  } ${getCategoryBadgeColor(featuredPost.category).text} ${
                    getCategoryBadgeColor(featuredPost.category).border
                  }`}
                >
                  {featuredPost.category}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 hover:text-amber-600 transition-colors mb-3 leading-snug">
                <Link href={`/blog/${featuredPost.slug}`}>
                  {featuredPost.title}
                </Link>
              </h2>

              <p className="text-sm leading-relaxed text-slate-600 mb-6 line-clamp-3">
                {featuredPost.excerpt}
              </p>

              <div className="flex items-center justify-between border-t border-slate-200/70 pt-5 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-900 text-amber-400 font-bold text-sm flex items-center justify-center ring-2 ring-amber-500/30">
                    {featuredPost.author.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{featuredPost.author.name}</p>
                    <p className="text-[11px] text-slate-500">{featuredPost.readTime}</p>
                  </div>
                </div>

                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white px-4 py-2 text-xs font-bold transition-all shadow-sm"
                >
                  Read Story
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 sm:p-2.5 shadow-sm space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1 px-1 -mx-1 sm:mx-0">
          <button
            type="button"
            onClick={() => handleCategorySelect("All")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === "All"
                ? "bg-slate-950 text-white shadow-md shadow-slate-950/10"
                : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/80"
            }`}
          >
            {selectedCategory === "All" && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
            <span>All Articles</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold transition-colors ${
                selectedCategory === "All"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {initialPosts.length}
            </span>
          </button>

          {BLOG_CATEGORIES.map((cat) => {
            const count = initialPosts.filter((p) => p.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-950 text-white font-bold shadow-md shadow-slate-950/10"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/80"
                }`}
              >
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold transition-colors ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Search Input */}
        <div className="relative w-full lg:w-72 shrink-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search articles, topics..."
            className="w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Quick Status Sub-bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-0.5">
        <p>
          Showing <span className="font-bold text-slate-900">{filteredPosts.length}</span> {filteredPosts.length === 1 ? "article" : "articles"}
          {selectedCategory !== "All" && (
            <span> in <strong className="text-amber-600">{selectedCategory}</strong></span>
          )}
        </p>

        {(selectedCategory !== "All" || searchQuery.trim()) && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Reset filters</span>
            <span>✕</span>
          </button>
        )}
      </div>

      {/* Articles Grid */}
      {gridPosts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridPosts.map((post) => (
              <BlogPostCard key={post._id} post={post} />
            ))}
          </div>

          {/* Pagination */}
          <BlogPagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 400, behavior: "smooth" });
            }}
          />
        </>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Articles Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
            We couldn&apos;t find any articles matching your search criteria. Try modifying your search or switching categories.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 hover:text-slate-950 transition-colors shadow-sm"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
