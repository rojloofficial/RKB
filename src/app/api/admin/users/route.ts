import { NextRequest, NextResponse } from "next/server";
import { listUsers, deleteUser } from "@/lib/models/user";
import { countAdsPerUser } from "@/lib/models/ad";
import { getAdminContext, canAccess } from "@/lib/admin-access";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAdminContext(request);
    if (!ctx || !canAccess(ctx, "users")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const [users, counts] = await Promise.all([listUsers(), countAdsPerUser()]);
    const usersWithCount = users.map((u) => ({
      ...u,
      adCount: counts[u._id ?? ""] ?? 0,
    }));
    return NextResponse.json({ users: usersWithCount });
  } catch (error) {
    console.error("[admin/users] GET error:", error);
    return NextResponse.json(
      { error: "Unable to load users." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getAdminContext(request);
    if (!ctx || !canAccess(ctx, "users")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const id = body?.id;
    if (!id) {
      return NextResponse.json({ error: "User id is required." }, { status: 400 });
    }

    const ok = await deleteUser(String(id));
    if (!ok) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/users] DELETE error:", error);
    return NextResponse.json(
      { error: "Unable to delete user." },
      { status: 500 }
    );
  }
}
