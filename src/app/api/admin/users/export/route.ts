import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import { exportAllUsers } from "@/lib/models/user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "users")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const users = await exportAllUsers();
    const jsonString = JSON.stringify(users, null, 2);

    const today = new Date().toISOString().split("T")[0];
    const filename = `rojlo-users-${today}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[admin/users/export] GET error:", error);
    return NextResponse.json(
      { error: "Failed to export user data." },
      { status: 500 }
    );
  }
}
