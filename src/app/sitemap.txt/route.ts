import sitemap from "@/app/sitemap";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url.trim()).filter(Boolean).join("\n");

    return new Response(urls + "\n", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[sitemap.txt] Generation error:", error);
    return new Response("https://rojloo.vercel.app/\n", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
