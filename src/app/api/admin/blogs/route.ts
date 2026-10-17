import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import {
  listBlogPosts,
  createBlogPost,
} from "@/lib/models/blog";

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext(req);
  if (!ctx || !canAccess(ctx, "blog")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") || "all";
  const categoryParam = searchParams.get("category") || undefined;
  const searchParam = searchParams.get("search") || undefined;
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const limitParam = parseInt(searchParams.get("limit") || "20", 10);

  try {
    const result = await listBlogPosts({
      status: statusParam as "all" | "published" | "draft",
      category: categoryParam,
      search: searchParam,
      page: pageParam,
      limit: limitParam,
      sort: "latest",
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[api/admin/blogs] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext(req);
  if (!ctx || !canAccess(ctx, "blog")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: "Post title is required." },
        { status: 400 }
      );
    }

    const post = await createBlogPost(body);
    return NextResponse.json({ success: true, post });
  } catch (err) {
    console.error("[api/admin/blogs] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create blog post" },
      { status: 500 }
    );
  }
}
