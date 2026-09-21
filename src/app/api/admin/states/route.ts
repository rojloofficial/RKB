import { NextRequest, NextResponse } from "next/server";
import { listStates, createState, deleteState, deleteAllLocations } from "@/lib/models/state";
import { getAdminContext, canAccess } from "@/lib/admin-access";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || (!canAccess(ctx, "state") && !canAccess(ctx, "city"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const states = await listStates();
  return NextResponse.json({ states });
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || (!canAccess(ctx, "state") && !canAccess(ctx, "city"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { name } = body ?? {};

  if (!name) {
    return NextResponse.json(
      { error: "State name is required." },
      { status: 400 }
    );
  }

  try {
    const state = await createState({ name: String(name) });
    return NextResponse.json({ success: true, state }, { status: 201 });
  } catch (error) {
    console.error("createState failed:", error);
    return NextResponse.json(
      { error: "Failed to create state." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || (!canAccess(ctx, "state") && !canAccess(ctx, "city"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const isAllParam = searchParams.get("all") === "true";

  const body = await request.json().catch(() => null);
  const isAllBody = body?.all === true;
  const id = body?.id;

  if (isAllParam || isAllBody) {
    try {
      const summary = await deleteAllLocations();
      return NextResponse.json({
        success: true,
        summary,
        message: "All states, cities, and local areas have been deleted successfully.",
      });
    } catch (error) {
      console.error("deleteAllLocations failed:", error);
      return NextResponse.json(
        { error: "Failed to delete all locations." },
        { status: 500 }
      );
    }
  }

  if (!id) {
    return NextResponse.json({ error: "State id is required." }, { status: 400 });
  }

  const ok = await deleteState(String(id));
  if (!ok) {
    return NextResponse.json({ error: "State not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
