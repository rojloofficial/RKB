import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  listLocalAreas,
  createLocalArea,
  deleteLocalArea,
  deleteLocalAreas,
} from "@/lib/models/localArea";
import { getAdminContext, canAccess } from "@/lib/admin-access";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || (!canAccess(ctx, "city") && !canAccess(ctx, "state"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cityName = searchParams.get("cityName") || undefined;
  const citySlug = searchParams.get("citySlug") || undefined;
  const stateName = searchParams.get("stateName") || undefined;

  try {
    const localAreas = await listLocalAreas({ cityName, citySlug, stateName });
    return NextResponse.json({ localAreas });
  } catch (error) {
    console.error("listLocalAreas failed:", error);
    return NextResponse.json(
      { error: "Failed to list local areas." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || (!canAccess(ctx, "city") && !canAccess(ctx, "state"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { name, cityName, stateName } = body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "Local area name is required." },
      { status: 400 }
    );
  }

  if (!cityName || typeof cityName !== "string" || !cityName.trim()) {
    return NextResponse.json(
      { error: "City name is required." },
      { status: 400 }
    );
  }

  try {
    const localArea = await createLocalArea({
      name: String(name),
      cityName: String(cityName),
      stateName: stateName ? String(stateName) : undefined,
    });

    try {
      revalidatePath("/places");
      revalidatePath("/admin/city");
      revalidatePath("/admin/state");
      if (localArea.citySlug) {
        revalidatePath(`/places/${localArea.citySlug}`);
      }
    } catch {
      // ignore in environments without active cache handler
    }

    return NextResponse.json({ success: true, localArea }, { status: 201 });
  } catch (error) {
    console.error("createLocalArea failed:", error);
    return NextResponse.json(
      { error: "Failed to create local area." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || (!canAccess(ctx, "city") && !canAccess(ctx, "state"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string")
    : [];

  try {
    if (ids.length > 0) {
      const deletedCount = await deleteLocalAreas(ids);
      try {
        revalidatePath("/places");
        revalidatePath("/admin/city");
        revalidatePath("/admin/state");
      } catch {}
      return NextResponse.json({ success: true, deletedCount });
    }

    const id = body?.id;
    if (!id) {
      return NextResponse.json(
        { error: "Local area id is required." },
        { status: 400 }
      );
    }

    const ok = await deleteLocalArea(String(id));
    if (!ok) {
      return NextResponse.json(
        { error: "Local area not found." },
        { status: 404 }
      );
    }

    try {
      revalidatePath("/places");
      revalidatePath("/admin/city");
      revalidatePath("/admin/state");
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("deleteLocalArea failed:", error);
    return NextResponse.json(
      { error: "Failed to delete local area." },
      { status: 500 }
    );
  }
}
