import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import { listStates } from "@/lib/models/state";
import { listAllCities } from "@/lib/models/city";
import {
  getAdminPhoneOverrides,
  saveAdminPhoneOverride,
  deleteAdminPhoneOverride,
} from "@/lib/models/vip";
import { getCityPhoneStats } from "@/lib/models/ad";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "phone-control")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const [states, cities, overrides, cityStats] = await Promise.all([
      listStates(),
      listAllCities(),
      getAdminPhoneOverrides(),
      getCityPhoneStats(),
    ]);

    return NextResponse.json({
      success: true,
      states,
      cities,
      overrides,
      cityStats,
    });
  } catch (error) {
    console.error("Failed to load admin phone control data:", error);
    return NextResponse.json(
      { error: "Failed to load phone control data." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "phone-control")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const city = String(body?.city ?? "").trim();
    const state = String(body?.state ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const whatsapp = String(body?.whatsapp ?? "").trim();
    const telegram = String(body?.telegram ?? "").trim();
    const deleteUserPhone = Boolean(body?.deleteUserPhone);

    if (!city) {
      return NextResponse.json({ error: "City is required." }, { status: 400 });
    }

    if (!phone && !whatsapp && !telegram && !deleteUserPhone) {
      return NextResponse.json(
        {
          error:
            "Please provide at least a Phone No., WhatsApp, Telegram, or choose to delete/hide original user numbers.",
        },
        { status: 400 }
      );
    }

    const adminEmail =
      ctx.role === "main" ? "admin" : (ctx as { email?: string }).email || "admin";

    const saved = await saveAdminPhoneOverride({
      city,
      state,
      phone,
      whatsapp,
      telegram,
      deleteUserPhone,
      adminEmail,
    });

    return NextResponse.json({ success: true, override: saved }, { status: 201 });
  } catch (error) {
    console.error("Save admin phone override error:", error);
    return NextResponse.json(
      { error: "Failed to save contact override." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "phone-control")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const id = body?.id;
    if (!id) {
      return NextResponse.json({ error: "Override ID is required." }, { status: 400 });
    }

    const ok = await deleteAdminPhoneOverride(String(id));
    if (!ok) {
      return NextResponse.json({ error: "Override not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete admin phone override error:", error);
    return NextResponse.json(
      { error: "Failed to delete contact override." },
      { status: 500 }
    );
  }
}
