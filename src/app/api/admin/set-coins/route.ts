import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import {
  getCoinPackages,
  saveCoinPackages,
  getAllPackagesCoins,
  saveAllPackagesCoins,
} from "@/lib/models/coin-package";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "set-coins")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const packages = await getCoinPackages();
    const allPackagesCoins = await getAllPackagesCoins();
    return NextResponse.json(
      { packages, allPackagesCoins, success: true },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch coin packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch coin packages" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "set-coins")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const packages = Array.isArray(body?.packages) ? body.packages : [];

    if (packages.length === 0) {
      return NextResponse.json(
        { error: "At least one coin package is required" },
        { status: 400 }
      );
    }

    const saved = await saveCoinPackages(packages);
    let allPackagesCoins = await getAllPackagesCoins();
    if (body?.allPackagesCoins !== undefined && !isNaN(Number(body.allPackagesCoins))) {
      allPackagesCoins = await saveAllPackagesCoins(Number(body.allPackagesCoins));
    }

    return NextResponse.json(
      { packages: saved, allPackagesCoins, success: true },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Failed to save coin packages:", error);
    return NextResponse.json(
      { error: "Failed to save coin packages" },
      { status: 500 }
    );
  }
}
