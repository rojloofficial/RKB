import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import {
  getPromotionPackages,
  savePromotionPackages,
} from "@/lib/models/promotion-package";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "promotion-packages")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const packages = await getPromotionPackages();
    return NextResponse.json(
      { packages, success: true },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch admin promotion packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotion packages" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "promotion-packages")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const packages = Array.isArray(body?.packages) ? body.packages : [];

    if (packages.length === 0) {
      return NextResponse.json(
        { error: "At least one promotion package is required." },
        { status: 400 }
      );
    }

    const saved = await savePromotionPackages(packages);
    return NextResponse.json(
      { packages: saved, success: true },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Failed to save promotion packages:", error);
    return NextResponse.json(
      { error: "Failed to save promotion packages" },
      { status: 500 }
    );
  }
}
