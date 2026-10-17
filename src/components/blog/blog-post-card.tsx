import Link from "next/link";
import Image from "next/image";
import { BlogPost, getCategoryBadgeColor } from "@/lib/blog";

export default function BlogPostCard({ post }: { post: BlogPost }) {
  const badgeColors = getCategoryBadgeColor(post.category);
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all duration-300 card-hover-lift hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5">
      {/* Cover Image Container */}
      <Link href={`/blog/${post.slug}`} className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 block">
        <Image
          src={post.coverImage}
          alt={post.coverImageAlt || post.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Brand Watermark Badge Overlay */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-slate-950/75 backdrop-blur-md px-2.5 py-1 border border-white/10 shadow-sm pointer-events-none">
          <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
          <span className="text-[11px] font-semibold tracking-wide text-white">rkb.in</span>
        </div>

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm shadow-sm ${badgeColors.bg} ${badgeColors.text} ${badgeColors.border}`}
          >
            {post.category}
          </span>
        </div>

        {post.featured && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-slate-950 px-2.5 py-0.5 text-xs font-bold shadow-md">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Featured
            </span>
          </div>
        )}
      </Link>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Meta Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2.5">
          <div className="flex items-center gap-2">
            <span>{formattedDate}</span>
            <span>•</span>
            <span>{post.readTime}</span>
          </div>
          {post.views > 0 && (
            <div className="flex items-center gap-1 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{post.views}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2 mb-2">
          <Link href={`/blog/${post.slug}`}>
            {post.title}
          </Link>
        </h3>

        {/* Excerpt */}
        <p className="text-sm leading-relaxed text-slate-600 line-clamp-2 mb-4 flex-1">
          {post.excerpt}
        </p>

        {/* Author & Read More Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center ring-1 ring-slate-800">
              {post.author.name.charAt(0)}
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-800 leading-tight">{post.author.name}</p>
              {post.author.role && (
                <p className="text-[11px] text-slate-400">{post.author.role}</p>
              )}
            </div>
          </div>

          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:text-amber-700 transition-colors"
          >
            Read Article
            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
