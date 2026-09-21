import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getLocalAreaSeo,
  getEffectiveLocalAreaSeo,
  getAllLocalAreaSeo,
  upsertLocalAreaSeo,
  batchUpdateLocalAreaSeoModes,
  getCitiesWithCustomLocalAreaSeo,
  type LocalAreaSeo,
} from "@/lib/models/local-area-seo";
import { getAdminContext, canAccess } from "@/lib/admin-access";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (
    !ctx ||
    (!canAccess(ctx, "city") &&
      !canAccess(ctx, "city-seo") &&
      !canAccess(ctx, "state"))
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const citySlug = searchParams.get("citySlug") || searchParams.get("city") || undefined;
  const areaSlug = searchParams.get("areaSlug") || searchParams.get("area") || undefined;

  try {
    if (citySlug && areaSlug) {
      const [seo, effective] = await Promise.all([
        getLocalAreaSeo(citySlug, areaSlug),
        getEffectiveLocalAreaSeo(citySlug, areaSlug),
      ]);
      return NextResponse.json({ seo, effective });
    }

    const [allSeo, citiesWithCustomSeoSet] = await Promise.all([
      getAllLocalAreaSeo(),
      getCitiesWithCustomLocalAreaSeo(),
    ]);

    let filtered = allSeo;
    if (citySlug) {
      filtered = allSeo.filter(
        (s) => s.citySlug.toLowerCase() === citySlug.toLowerCase()
      );
    }

    return NextResponse.json({
      seoList: filtered,
      citiesWithCustomSeo: Array.from(citiesWithCustomSeoSet),
    });
  } catch (error) {
    console.error("GET /api/admin/local-area-seo failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch local area SEO." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (
    !ctx ||
    (!canAccess(ctx, "city") &&
      !canAccess(ctx, "city-seo") &&
      !canAccess(ctx, "state"))
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    // 1. Batch mode update
    if (body.action === "batch_modes" && Array.isArray(body.updates)) {
      const count = await batchUpdateLocalAreaSeoModes(body.updates);
      try {
        revalidatePath("/places");
        revalidatePath("/admin/dynamic-seo");
        revalidatePath("/admin/city-seo");
        revalidatePath("/admin/city");
      } catch {}
      return NextResponse.json({ success: true, count });
    }

    // 2. Single Local Area SEO Upsert
    const { citySlug, areaSlug } = body;
    if (!citySlug || typeof citySlug !== "string" || !citySlug.trim()) {
      return NextResponse.json(
        { error: "City slug is required." },
        { status: 400 }
      );
    }
    if (!areaSlug || typeof areaSlug !== "string" || !areaSlug.trim()) {
      return NextResponse.json(
        { error: "Area slug is required." },
        { status: 400 }
      );
    }

    const saved = await upsertLocalAreaSeo(body as LocalAreaSeo);

    try {
      revalidatePath("/places");
      revalidatePath(`/places/${citySlug.toLowerCase().trim()}`);
      revalidatePath(
        `/places/${citySlug.toLowerCase().trim()}/${areaSlug.toLowerCase().trim()}`
      );
      revalidatePath("/admin/dynamic-seo");
      revalidatePath("/admin/city-seo");
      revalidatePath("/admin/city");
    } catch {}

    return NextResponse.json({ success: true, seo: saved });
  } catch (error) {
    console.error("POST /api/admin/local-area-seo failed:", error);
    return NextResponse.json(
      { error: "Failed to save local area SEO." },
      { status: 500 }
    );
  }
}
