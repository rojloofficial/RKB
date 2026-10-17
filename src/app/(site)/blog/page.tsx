import { Metadata } from "next";
import { siteConfig } from "@/lib/config/site";
import { listAllBlogPostsRaw } from "@/lib/models/blog";
import BlogListClient from "@/components/blog/blog-list-client";
import { JsonLd } from "@/components/seo/json-ld";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const title = "RKB Journal & City Guides | Classifieds, Insights & Local Tips";
  const description =
    "Explore insider tips, verified city services advice, nightlife hotspots, and platform updates across Indian metropolitan cities on RKB.";

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/blog`,
    },
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}/blog`,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BlogPage() {
  const posts = await listAllBlogPostsRaw();
  const publishedPosts = posts.filter((p) => p.status === "published");

  // Schema.org Blog & ItemList JSON-LD
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "RKB Journal & City Guides",
    description: "Verified city guides, safety tips, and local services insights across India.",
    url: `${siteConfig.url}/blog`,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/icon.png`,
      },
    },
    blogPost: publishedPosts.slice(0, 10).map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      url: `${siteConfig.url}/blog/${post.slug}`,
      image: post.coverImage,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: {
        "@type": "Person",
        name: post.author.name,
      },
    })),
  };

  return (
    <>
      <JsonLd data={blogJsonLd} />

      <main className="min-h-screen pb-16">
        {/* Hero Header Section */}
        <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-20 text-white border-b border-slate-800">
          {/* Subtle Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/10 blur-[120px] pointer-events-none rounded-full" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Pill Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 px-3.5 py-1 text-xs font-semibold text-amber-400 mb-5 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              RKB Journal & City Guides
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-4 max-w-3xl mx-auto leading-tight">
              Insider Insights, City Guides & Verified Local Tips
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Discover trustworthy advice on navigating local classifieds, vibrant metropolitan hotspots, safety guidelines, and platform highlights.
            </p>
          </div>
        </section>

        {/* Blog Posts Listing Container */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 -mt-6">
          <BlogListClient initialPosts={publishedPosts} />
        </div>
      </main>
    </>
  );
}
