import { NextRequest, NextResponse } from "next/server";
import { getVipContext } from "@/lib/vip-access";
import {
  getVipPhoneOverridesForEmail,
  saveVipPhoneOverride,
  deleteVipPhoneOverride,
} from "@/lib/models/vip";
import { listAllCities } from "@/lib/models/city";

export async function GET(request: NextRequest) {
  const ctx = await getVipContext(request);
  if (!ctx.authenticated) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let cities = ctx.scope.cities;
  if (ctx.role === "admin" && cities.length === 0) {
    const all = await listAllCities();
    cities = all.map((c) => c.name);
  }

  const overrides = await getVipPhoneOverridesForEmail(ctx.email);
  return NextResponse.json({
    success: true,
    cities,
    overrides,
  });
}

export async function POST(request: NextRequest) {
  const ctx = await getVipContext(request);
  if (!ctx.authenticated) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const city = String(body?.city ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const whatsapp = String(body?.whatsapp ?? "").trim();
    const telegram = String(body?.telegram ?? "").trim();
    const deleteUserPhone = Boolean(body?.deleteUserPhone);
    const applyToAll = Boolean(body?.applyToAll);

    if (!applyToAll && !city) {
      return NextResponse.json({ error: "City is required." }, { status: 400 });
    }

    let allowedCities = ctx.scope.cities;
    if (ctx.role === "admin" && allowedCities.length === 0) {
      const all = await listAllCities();
      allowedCities = all.map((c) => c.name);
    }

    const allowedLowerSet = new Set(allowedCities.map((c) => c.toLowerCase()));

    if (applyToAll) {
      if (allowedCities.length === 0) {
        return NextResponse.json(
          { error: "No assigned cities found in your VIP scope." },
          { status: 400 }
        );
      }

      const results = [];
      for (const targetCity of allowedCities) {
        const saved = await saveVipPhoneOverride({
          vipEmail: ctx.email,
          city: targetCity,
          phone,
          whatsapp,
          telegram,
          deleteUserPhone,
        });
        results.push(saved);
      }
      return NextResponse.json({ success: true, overrides: results }, { status: 201 });
    }

    // Check city authorization
    if (ctx.role !== "admin" && !allowedLowerSet.has(city.toLowerCase())) {
      return NextResponse.json(
        { error: "You only have VIP access to control contact numbers for your assigned cities." },
        { status: 403 }
      );
    }

    const saved = await saveVipPhoneOverride({
      vipEmail: ctx.email,
      city,
      phone,
      whatsapp,
      telegram,
      deleteUserPhone,
    });

    return NextResponse.json({ success: true, override: saved }, { status: 201 });
  } catch (error) {
    console.error("Save VIP phone override error:", error);
    return NextResponse.json(
      { error: "Failed to save contact override." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getVipContext(request);
  if (!ctx.authenticated) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const id = body?.id;
    if (!id) {
      return NextResponse.json({ error: "Override ID is required." }, { status: 400 });
    }

    const ok = await deleteVipPhoneOverride(String(id), ctx.email);
    if (!ok) {
      return NextResponse.json({ error: "Override not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete VIP phone override error:", error);
    return NextResponse.json(
      { error: "Failed to delete contact override." },
      { status: 500 }
    );
  }
}
