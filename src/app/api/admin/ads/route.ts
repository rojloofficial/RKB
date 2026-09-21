import { NextRequest, NextResponse } from "next/server";
import { listAllAds, adminDeleteAd, setAdStatus } from "@/lib/models/ad";
import { getAdminContext, canAccess } from "@/lib/admin-access";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "ads")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const ads = await listAllAds();
  return NextResponse.json({ ads });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "ads")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (!id) {
    return NextResponse.json({ error: "Ad id is required." }, { status: 400 });
  }

  const ok = await adminDeleteAd(String(id));
  if (!ok) {
    return NextResponse.json({ error: "Ad not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "ads")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { id, status } = body ?? {};
  if (!id || !status) {
    return NextResponse.json(
      { error: "Ad id and status are required." },
      { status: 400 }
    );
  }

  const ad = await setAdStatus(String(id), String(status));
  if (!ad) {
    return NextResponse.json({ error: "Ad not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, ad });
}
