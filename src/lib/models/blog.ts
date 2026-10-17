import { getDb } from "../db";
import { readStore, writeStore } from "../persist";
import {
  BlogPost,
  BlogCategory,
  BlogSection,
  BlogFaq,
  STATIC_FALLBACK_POSTS,
  slugify,
  calculateReadTime,
} from "../blog";

export { slugify, calculateReadTime };

let blogIndexesCreated = false;

async function getBlogCollection() {
  const db = await getDb();
  if (!db) return null;
  const col = db.collection("blogs");
  if (!blogIndexesCreated) {
    blogIndexesCreated = true;
    col.createIndexes([
      { key: { slug: 1 }, unique: true, name: "blog_slug_unique_idx" },
      { key: { status: 1 }, name: "blog_status_idx" },
      { key: { category: 1 }, name: "blog_category_idx" },
      { key: { publishedAt: -1 }, name: "blog_publishedAt_idx" },
      { key: { createdAt: -1 }, name: "blog_createdAt_idx" },
    ]).catch(() => {});
  }
  return col;
}

function normalizeBlogPostDoc(raw: Record<string, unknown>): BlogPost {
  const sections = Array.isArray(raw.sections)
    ? (raw.sections as BlogSection[]).map((s, idx) => ({
        id: String(s.id || `sec_${idx}`),
        heading: s.heading ? String(s.heading) : undefined,
        content: String(s.content || ""),
        image: s.image ? String(s.image) : undefined,
        imageAlt: s.imageAlt ? String(s.imageAlt) : undefined,
        type: (s.type === "callout" || s.type === "quote" ? s.type : "text") as "text" | "callout" | "quote",
      }))
    : [];

  const faqs = Array.isArray(raw.faqs)
    ? (raw.faqs as BlogFaq[])
        .map((f, idx) => ({
          id: String(f.id || `faq_${idx}`),
          question: String(f.question || "").trim(),
          answer: String(f.answer || "").trim(),
        }))
        .filter((f) => f.question || f.answer)
    : [];

  const authorRaw = (raw.author as Record<string, unknown>) || {};
  const author = {
    name: String(authorRaw.name || "RKB Editorial"),
    avatar: authorRaw.avatar ? String(authorRaw.avatar) : undefined,
    role: authorRaw.role ? String(authorRaw.role) : "Content Team",
  };

  const tags = Array.isArray(raw.tags)
    ? (raw.tags as string[]).map(String).map((t) => t.trim()).filter(Boolean)
    : [];

  const title = String(raw.title || "Untitled Post");
  const readTime = raw.readTime ? String(raw.readTime) : calculateReadTime(sections);

  return {
    _id: String(raw._id || ""),
    title,
    slug: String(raw.slug || slugify(title)),
    excerpt: String(raw.excerpt || ""),
    category: (raw.category as BlogCategory) || "Insights",
    coverImage: String(raw.coverImage || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"),
    coverImageAlt: String(raw.coverImageAlt || title),
    author,
    readTime,
    sections,
    faqs,
    tags,
    status: raw.status === "draft" ? "draft" : "published",
    featured: Boolean(raw.featured),
    views: Number(raw.views) || 0,
    metaTitle: raw.metaTitle ? String(raw.metaTitle) : undefined,
    metaDescription: raw.metaDescription ? String(raw.metaDescription) : undefined,
    canonicalUrl: raw.canonicalUrl ? String(raw.canonicalUrl) : undefined,
    publishedAt: String(raw.publishedAt || raw.createdAt || new Date().toISOString()),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
  };
}

export async function listAllBlogPostsRaw(): Promise<BlogPost[]> {
  const col = await getBlogCollection();
  if (col) {
    try {
      const docs = await col
        .find({ slug: { $ne: "safely-discover-local-classifieds-and-services" } } as Record<string, unknown>)
        .sort({ createdAt: -1 })
        .toArray();
      if (docs && docs.length > 0) {
        return docs.map((d) => normalizeBlogPostDoc(d as unknown as Record<string, unknown>));
      }
    } catch (err) {
      console.error("[blog] Mongo list failed:", err);
    }
  }

  const store = await readStore();
  const rawList = ((store.blogs ?? []) as unknown as Record<string, unknown>[]).filter(
    (b) => b.slug !== "safely-discover-local-classifieds-and-services" && b._id !== "blog_seed_1"
  );
  if (rawList.length === 0) {
    return STATIC_FALLBACK_POSTS;
  }
  return rawList.map(normalizeBlogPostDoc);
}

export type ListBlogPostsOptions = {
  status?: "published" | "draft" | "all";
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: "latest" | "popular" | "oldest";
};

export async function listBlogPosts(options: ListBlogPostsOptions = {}): Promise<{
  posts: BlogPost[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const {
    status = "published",
    category,
    search,
    page = 1,
    limit = 9,
    sort = "latest",
  } = options;

  const allPosts = await listAllBlogPostsRaw();

  let filtered = allPosts.filter((post) => {
    if (status !== "all" && post.status !== status) {
      return false;
    }
    if (category && category !== "All" && post.category !== category) {
      return false;
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
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

  filtered.sort((a, b) => {
    if (sort === "popular") {
      return b.views - a.views;
    }
    if (sort === "oldest") {
      return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (safePage - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return {
    posts: paginated,
    total,
    page: safePage,
    totalPages,
  };
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const safeSlug = slugify(slug);
  if (safeSlug === "safely-discover-local-classifieds-and-services") {
    return null;
  }
  const col = await getBlogCollection();
  if (col) {
    try {
      const doc = await col.findOne({ slug: safeSlug });
      if (doc) {
        return normalizeBlogPostDoc(doc as unknown as Record<string, unknown>);
      }
    } catch (err) {
      console.error("[blog] Find by slug failed:", err);
    }
  }

  const all = await listAllBlogPostsRaw();
  const match = all.find((p) => p.slug === safeSlug);
  return match || null;
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const col = await getBlogCollection();
  if (col) {
    try {
      const doc = await col.findOne({ _id: id } as any);
      if (doc) {
        return normalizeBlogPostDoc(doc as unknown as Record<string, unknown>);
      }
    } catch (err) {
      console.error("[blog] Find by id failed:", err);
    }
  }

  const all = await listAllBlogPostsRaw();
  const match = all.find((p) => p._id === id);
  return match || null;
}

export async function getRelatedBlogPosts(
  currentSlug: string,
  category: string,
  limit = 3
): Promise<BlogPost[]> {
  const all = await listAllBlogPostsRaw();
  const filtered = all
    .filter((p) => p.slug !== currentSlug && p.status === "published")
    .sort((a, b) => {
      // Prioritize same category
      if (a.category === category && b.category !== category) return -1;
      if (b.category === category && a.category !== category) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

  return filtered.slice(0, limit);
}

export async function createBlogPost(data: Partial<BlogPost>): Promise<BlogPost> {
  const title = (data.title || "Untitled Post").trim();
  let baseSlug = slugify(data.slug || title);
  if (!baseSlug) baseSlug = `post-${Date.now()}`;

  // Ensure unique slug
  const allExisting = await listAllBlogPostsRaw();
  let candidateSlug = baseSlug;
  let counter = 1;
  while (allExisting.some((p) => p.slug === candidateSlug)) {
    candidateSlug = `${baseSlug}-${counter++}`;
  }

  const id = `blog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const sections = data.sections || [];
  const readTime = data.readTime || calculateReadTime(sections);

  const newPost: BlogPost = {
    _id: id,
    title,
    slug: candidateSlug,
    excerpt: (data.excerpt || "").trim(),
    category: data.category || "Insights",
    coverImage:
      data.coverImage ||
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    coverImageAlt: data.coverImageAlt || title,
    author: {
      name: data.author?.name || "RKB Editorial",
      avatar: data.author?.avatar,
      role: data.author?.role || "Content Team",
    },
    readTime,
    sections,
    faqs: data.faqs || [],
    tags: data.tags || [],
    status: data.status === "draft" ? "draft" : "published",
    featured: Boolean(data.featured),
    views: 0,
    metaTitle: data.metaTitle || title,
    metaDescription: data.metaDescription || data.excerpt,
    canonicalUrl: data.canonicalUrl,
    publishedAt: data.status === "draft" ? now : (data.publishedAt || now),
    createdAt: now,
    updatedAt: now,
  };

  const col = await getBlogCollection();
  if (col) {
    try {
      await col.insertOne(newPost as any);
    } catch (err) {
      console.error("[blog] Mongo insert error:", err);
    }
  }

  const store = await readStore();
  const blogs = (store.blogs ?? []) as unknown as Record<string, unknown>[];
  blogs.unshift(newPost);
  store.blogs = blogs;
  await writeStore(store);

  return newPost;
}

export async function updateBlogPost(
  id: string,
  data: Partial<BlogPost>
): Promise<BlogPost | null> {
  const existing = await getBlogPostById(id);
  if (!existing) return null;

  let nextSlug = existing.slug;
  if (data.slug && data.slug !== existing.slug) {
    const candidate = slugify(data.slug);
    const all = await listAllBlogPostsRaw();
    if (!all.some((p) => p._id !== id && p.slug === candidate)) {
      nextSlug = candidate;
    }
  }

  const sections = data.sections !== undefined ? data.sections : existing.sections;
  const readTime = data.readTime || calculateReadTime(sections);

  const updated: BlogPost = {
    ...existing,
    ...data,
    _id: id,
    slug: nextSlug,
    readTime,
    sections,
    updatedAt: new Date().toISOString(),
  };

  const col = await getBlogCollection();
  if (col) {
    try {
      await col.updateOne({ _id: id } as any, { $set: updated } as any);
    } catch (err) {
      console.error("[blog] Mongo update error:", err);
    }
  }

  const store = await readStore();
  const blogs = (store.blogs ?? []) as unknown as Record<string, unknown>[];
  const idx = blogs.findIndex((b) => b._id === id);
  if (idx !== -1) {
    blogs[idx] = updated;
  } else {
    blogs.unshift(updated);
  }
  store.blogs = blogs;
  await writeStore(store);

  return updated;
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  const col = await getBlogCollection();
  if (col) {
    try {
      await col.deleteOne({ _id: id } as any);
    } catch (err) {
      console.error("[blog] Mongo delete error:", err);
    }
  }

  const store = await readStore();
  const blogs = (store.blogs ?? []) as unknown as Record<string, unknown>[];
  const idx = blogs.findIndex((b) => b._id === id);
  if (idx !== -1) {
    blogs.splice(idx, 1);
    store.blogs = blogs;
    await writeStore(store);
    return true;
  }

  return true;
}

export async function incrementBlogPostViews(slug: string): Promise<void> {
  const safeSlug = slugify(slug);
  const col = await getBlogCollection();
  if (col) {
    try {
      await col.updateOne({ slug: safeSlug } as any, { $inc: { views: 1 } } as any);
      return;
    } catch (err) {
      console.error("[blog] Increment views failed:", err);
    }
  }

  const store = await readStore();
  const blogs = (store.blogs ?? []) as unknown as Record<string, unknown>[];
  const match = blogs.find((b) => b.slug === safeSlug);
  if (match) {
    match.views = (Number(match.views) || 0) + 1;
    await writeStore(store);
  }
}
