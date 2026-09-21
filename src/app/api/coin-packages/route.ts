import { NextResponse } from "next/server";
import { getCoinPackages } from "@/lib/models/coin-package";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const packages = await getCoinPackages();
    return NextResponse.json(
      { packages, success: true },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load coin packages:", error);
    return NextResponse.json(
      { error: "Failed to load coin packages" },
      { status: 500 }
    );
  }
}
