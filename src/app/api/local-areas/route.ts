import { NextRequest, NextResponse } from "next/server";
import { listLocalAreas } from "@/lib/models/localArea";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cityName = searchParams.get("cityName") || undefined;
  const citySlug = searchParams.get("citySlug") || undefined;
  const stateName = searchParams.get("stateName") || undefined;

  try {
    const localAreas = await listLocalAreas({ cityName, citySlug, stateName });
    return NextResponse.json(
      { localAreas },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[local-areas] GET error:", error);
    return NextResponse.json(
      { error: "Unable to load local areas." },
      { status: 500 }
    );
  }
}
