import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx) {
    return NextResponse.json({ authenticated: false });
  }
  if (ctx.role === "main") {
    return NextResponse.json({
      authenticated: true,
      role: "main",
      permissions: ["all"],
    });
  }
  return NextResponse.json({
    authenticated: true,
    role: "subadmin",
    email: ctx.email,
    permissions: ctx.permissions,
  });
}
