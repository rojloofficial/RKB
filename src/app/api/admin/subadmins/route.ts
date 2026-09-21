import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";
import {
  listSubAdmins,
  createSubAdmin,
  deleteSubAdmin,
} from "@/lib/models/admin-user";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (ctx.role !== "main") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const admins = await listSubAdmins();
  const safe = admins.map((a) => ({
    _id: a._id,
    email: a.email,
    permissions: a.permissions,
    lastLogin: a.lastLogin,
    createdAt: a.createdAt,
  }));
  return NextResponse.json({ admins: safe });
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (ctx.role !== "main") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "");
  const permissions = Array.isArray(body?.permissions)
    ? body.permissions.map(String)
    : [];

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  try {
    const created = await createSubAdmin({ email, password, permissions });
    return NextResponse.json({
      success: true,
      admin: {
        _id: created._id,
        email: created.email,
        permissions: created.permissions,
        lastLogin: created.lastLogin,
        createdAt: created.createdAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create admin.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (ctx.role !== "main") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (!id) {
    return NextResponse.json({ error: "Admin id is required." }, { status: 400 });
  }

  const ok = await deleteSubAdmin(String(id));
  if (!ok) {
    return NextResponse.json({ error: "Admin not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
