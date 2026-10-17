import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import {
  getBlogPostById,
  updateBlogPost,
  deleteBlogPost,
} from "@/lib/models/blog";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getAdminContext(req);
  if (!ctx || !canAccess(ctx, "blog")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const decodedId = decodeURIComponent(id || "").trim();
  try {
    const post = await getBlogPostById(decodedId);
    if (!post) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, post });
  } catch (err) {
    console.error("[api/admin/blogs/[id]] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch blog post" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const ctx = await getAdminContext(req);
  if (!ctx || !canAccess(ctx, "blog")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const decodedId = decodeURIComponent(id || "").trim();
  try {
    const body = await req.json();
    const updated = await updateBlogPost(decodedId, body);
    if (!updated) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, post: updated });
  } catch (err) {
    console.error("[api/admin/blogs/[id]] PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update blog post" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const ctx = await getAdminContext(req);
  if (!ctx || !canAccess(ctx, "blog")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const decodedId = decodeURIComponent(id || "").trim();
  try {
    const deleted = await deleteBlogPost(decodedId);
    return NextResponse.json({ success: deleted });
  } catch (err) {
    console.error("[api/admin/blogs/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete blog post" },
      { status: 500 }
    );
  }
}
