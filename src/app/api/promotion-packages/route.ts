import { NextResponse } from "next/server";
import { getPromotionPackages } from "@/lib/models/promotion-package";
import { getAllPackagesCoins } from "@/lib/models/coin-package";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const packages = await getPromotionPackages();
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
    console.error("Failed to fetch public promotion packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotion packages" },
      { status: 500 }
    );
  }
}
