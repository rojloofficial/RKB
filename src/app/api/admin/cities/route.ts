import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  listAllCities,
  createCity,
  deleteCity,
  deleteCities,
} from "@/lib/models/city";
import { listStates, createState } from "@/lib/models/state";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import { readStore } from "@/lib/persist";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "city")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [cities, store] = await Promise.all([listAllCities(), readStore()]);
  return NextResponse.json({
    cities,
    deleted: store.deletedCities ?? [],
  });
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "city")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { name, state, region, country, famousFood, seoDescription } = body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "City name is required." },
      { status: 400 }
    );
  }

  if (!state || typeof state !== "string" || !state.trim()) {
    return NextResponse.json(
      { error: "State is required to create a city." },
      { status: 400 }
    );
  }

  const trimmedName = name.trim();
  const trimmedState = state.trim();

  // Validate state exists (check all default Indian states & custom states)
  const allStates = await listStates();
  const stateExists = allStates.some(
    (s) =>
      s.name.trim().toLowerCase() === trimmedState.toLowerCase() ||
      s.slug.toLowerCase() === trimmedState.toLowerCase()
  );

  if (!stateExists) {
    await createState({ name: trimmedState });
  }

  try {
    const city = await createCity({
      name: trimmedName,
      state: trimmedState,
      region: region ? String(region) : trimmedState,
      country: country ? String(country) : "India",
      famousFood: famousFood ? String(famousFood) : "",
      seoDescription: seoDescription ? String(seoDescription) : "",
    });

    try {
      revalidatePath("/places");
      revalidatePath("/admin/city");
      revalidatePath("/admin/state");
      revalidatePath(`/places/${city.slug}`);
    } catch {}

    return NextResponse.json({ success: true, city }, { status: 201 });
  } catch (error) {
    console.error("createCity failed:", error);
    return NextResponse.json(
      { error: "Failed to create city." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "city")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string")
    : [];
  if (ids.length > 0) {
    const deleted = await deleteCities(ids);
    try {
      revalidatePath("/places");
      revalidatePath("/admin/city");
      revalidatePath("/admin/state");
    } catch {}
    return NextResponse.json({ success: true, deleted });
  }

  const id = body?.id;
  if (!id) {
    return NextResponse.json({ error: "City id is required." }, { status: 400 });
  }

  const ok = await deleteCity(String(id));
  if (!ok) {
    return NextResponse.json({ error: "City not found." }, { status: 404 });
  }

  try {
    revalidatePath("/places");
    revalidatePath("/admin/city");
    revalidatePath("/admin/state");
  } catch {}

  return NextResponse.json({ success: true });
}
