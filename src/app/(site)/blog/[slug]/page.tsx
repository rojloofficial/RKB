import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig } from "@/lib/config/site";
import {
  getBlogPostBySlug,
  getRelatedBlogPosts,
  incrementBlogPostViews,
} from "@/lib/models/blog";
import { getCategoryBadgeColor } from "@/lib/blog";
import { JsonLd } from "@/components/seo/json-ld";
import BlogPostCard from "@/components/blog/blog-post-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post || post.status === "draft") {
    return {
      title: "Article Not Found | RKB",
    };
  }

  const title = post.metaTitle || `${post.title} | RKB Blog`;
  const description = post.metaDescription || post.excerpt;
  const url = `${siteConfig.url}/blog/${post.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: post.canonicalUrl || url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: post.coverImage,
          alt: post.coverImageAlt || post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [post.coverImage],
    },
  };
}

export default async function BlogPostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post || post.status === "draft") {
    notFound();
  }

  // Increment view count asynchronously
  incrementBlogPostViews(slug).catch(() => {});

  const relatedPosts = await getRelatedBlogPosts(post.slug, post.category, 3);
  const badgeColors = getCategoryBadgeColor(post.category);
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const canonicalUrl = post.canonicalUrl || `${siteConfig.url}/blog/${post.slug}`;

  // Article JSON-LD Schema
  const articleJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: [post.coverImage],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.role,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/icon.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  };

  // FAQ Schema if available
  const faqJsonLd =
    post.faqs && post.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <JsonLd data={articleJsonLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      <article className="min-h-screen bg-slate-50/50 pb-20">
        {/* Header Hero */}
        <header className="bg-slate-950 text-white pt-10 pb-16 border-b border-slate-800">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6 flex-wrap">
              <Link href="/" className="hover:text-amber-400 transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-amber-400 transition-colors">
                Blog
              </Link>
              <span>/</span>
              <span className="text-amber-400 font-medium">{post.category}</span>
            </nav>

            {/* Category & Read Time Pills */}
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badgeColors.bg} ${badgeColors.text} ${badgeColors.border}`}
              >
                {post.category}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {post.readTime}
              </span>
              {post.views > 0 && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  • {post.views} views
                </span>
              )}
            </div>

            {/* Article Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white mb-5 leading-tight">
              {post.title}
            </h1>

            {/* Excerpt Lead */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-8">
              {post.excerpt}
            </p>

            {/* Author & Publish Date Bar */}
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-900 text-amber-400 font-bold text-sm flex items-center justify-center ring-2 ring-amber-500/30">
                  {post.author.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{post.author.name}</p>
                  <p className="text-xs text-slate-400">
                    {post.author.role || "RKB Content Desk"} • {formattedDate}
                  </p>
                </div>
              </div>

              {/* Social Share Buttons */}
              <div className="flex items-center gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `${post.title} - ${canonicalUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on WhatsApp"
                  className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
                  </svg>
                </a>
                <a
                  href={`https://telegram.me/share/url?url=${encodeURIComponent(
                    canonicalUrl
                  )}&text=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on Telegram"
                  className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-sky-400 hover:border-sky-500/40 transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Layout */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 -mt-8">
          {/* Cover Image with Watermark */}
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-900 shadow-2xl mb-12">
            <Image
              src={post.coverImage}
              alt={post.coverImageAlt || post.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
            />
            {/* Watermark badge on bottom right */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-slate-950/80 backdrop-blur-md px-3 py-1.5 border border-white/10 shadow-lg pointer-events-none">
              <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
              <span className="text-xs font-semibold tracking-wide text-white">rkb.in</span>
            </div>
          </div>

          {/* Quick Table of Contents (if multiple sections exist) */}
          {post.sections && post.sections.length > 1 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                In this article
              </h3>
              <ul className="space-y-2">
                {post.sections.map((section, idx) => {
                  if (!section.heading) return null;
                  return (
                    <li key={`toc-${idx}`}>
                      <a
                        href={`#section-${idx}`}
                        className="text-sm font-medium text-slate-700 hover:text-amber-600 transition-colors flex items-center gap-2"
                      >
                        <span className="text-amber-500 font-bold text-xs">{idx + 1}.</span>
                        {section.heading}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Article Sections */}
          <div className="prose prose-slate max-w-none space-y-8">
            {post.sections &&
              post.sections.map((section, idx) => {
                if (section.type === "callout") {
                  return (
                    <div
                      key={section.id || idx}
                      id={`section-${idx}`}
                      className="rounded-2xl border-l-4 border-amber-500 bg-amber-50/70 p-5 sm:p-6 shadow-sm"
                    >
                      {section.heading && (
                        <h3 className="text-lg font-bold text-slate-900 mb-2">
                          {section.heading}
                        </h3>
                      )}
                      <p className="text-sm sm:text-base leading-relaxed text-slate-800 whitespace-pre-line">
                        {section.content}
                      </p>
                    </div>
                  );
                }

                if (section.type === "quote") {
                  return (
                    <blockquote
                      key={section.id || idx}
                      id={`section-${idx}`}
                      className="border-l-4 border-slate-900 bg-white rounded-r-2xl p-6 italic shadow-sm text-slate-800"
                    >
                      <p className="text-base sm:text-lg font-medium leading-relaxed mb-2">
                        &ldquo;{section.content}&rdquo;
                      </p>
                      {section.heading && (
                        <cite className="block text-xs font-bold text-slate-500 not-italic uppercase tracking-wide">
                          — {section.heading}
                        </cite>
                      )}
                    </blockquote>
                  );
                }

                // Default text section
                return (
                  <section key={section.id || idx} id={`section-${idx}`} className="space-y-4">
                    {section.heading && (
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 pt-2">
                        {section.heading}
                      </h2>
                    )}
                    <p className="text-base leading-relaxed text-slate-700 whitespace-pre-line">
                      {section.content}
                    </p>
                    {section.image && (
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 mt-4">
                        <Image
                          src={section.image}
                          alt={section.imageAlt || section.heading || "Section illustration"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 896px"
                        />
                      </div>
                    )}
                  </section>
                );
              })}
          </div>

          {/* Article Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-6 border-t border-slate-200">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Related Topics
              </p>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-700 shadow-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Frequently Asked Questions Section (if any) */}
          {post.faqs && post.faqs.length > 0 && (
            <section className="mt-14 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <h3 className="text-xl font-black tracking-tight text-slate-900">
                  Frequently Asked Questions
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {post.faqs.map((faq, idx) => (
                  <div key={faq.id || idx} className="py-4 first:pt-0 last:pb-0">
                    <h4 className="text-base font-bold text-slate-900 mb-2">
                      {faq.question}
                    </h4>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Author Box Card */}
          <div className="mt-12 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="h-16 w-16 rounded-2xl bg-slate-950 text-amber-400 font-black text-2xl flex items-center justify-center shrink-0 shadow-md">
              {post.author.name.charAt(0)}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h4 className="text-lg font-bold text-slate-900">{post.author.name}</h4>
              <p className="text-xs font-semibold text-amber-600 mb-2">
                {post.author.role || "RKB Editorial Staff"}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Dedicated to curating trusted city guides, platform updates, and local classifieds insights to help users connect safely across Indian cities.
              </p>
            </div>
          </div>

          {/* Related Articles Grid */}
          {relatedPosts.length > 0 && (
            <section className="mt-16 pt-10 border-t border-slate-200">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Keep Reading
                  </span>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">
                    Related Articles
                  </h3>
                </div>
                <Link
                  href="/blog"
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  View All
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((related) => (
                  <BlogPostCard key={related._id} post={related} />
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </>
  );
}
