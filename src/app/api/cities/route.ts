import { NextRequest, NextResponse } from "next/server";
import { listAllCities } from "@/lib/models/city";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawState = searchParams.get("state")?.trim();
  const stateFilter = rawState?.toLowerCase();

  try {
    let cities = await listAllCities();
    if (stateFilter && rawState) {
      const { resolveCanonicalState, slugifyLocation } = await import("@/lib/location-normalizer");
      const canonical = resolveCanonicalState(rawState);
      const canonicalLower = canonical.canonicalName.toLowerCase();
      const canonicalSlug = canonical.slug;

      cities = cities.filter((c) => {
        if (!c.state) return false;
        const cStateLower = c.state.trim().toLowerCase();
        const cStateSlug = slugifyLocation(c.state);
        return (
          cStateLower === stateFilter ||
          cStateLower === canonicalLower ||
          cStateSlug === stateFilter ||
          cStateSlug === canonicalSlug ||
          c.region?.trim().toLowerCase() === stateFilter
        );
      });
    }
    return NextResponse.json(
      { cities },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[cities] GET error:", error);
    return NextResponse.json(
      { error: "Unable to load cities." },
      { status: 500 }
    );
  }
}
