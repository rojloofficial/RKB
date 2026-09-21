import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import { exportLocationsJson } from "@/lib/models/localArea";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || (!canAccess(ctx, "state") && !canAccess(ctx, "city"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const data = await exportLocationsJson();
    const jsonString = JSON.stringify(data, null, 2);

    const today = new Date().toISOString().split("T")[0];
    const filename = "rojlo-locations-backup-" + today + ".json";

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="' + filename + '"',
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("exportLocationsJson error:", error);
    return NextResponse.json(
      { error: "Failed to export location backup." },
      { status: 500 }
    );
  }
}
