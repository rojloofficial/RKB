import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { listAds, createAd, updateAd } from "@/lib/models/ad";
import type { ServiceRate } from "@/components/post-ad/types";

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ ads: [] }, { status: 401 });
  }

  const ads = await listAds(userId);
  const freeAd = ads.find((a) => a.isFreeAd);
  const hiddenAds = ads.filter((a) => a.requiresPromotion);

  return NextResponse.json({
    ads,
    freeAdAllowance: 1,
    freeAdsUsed: freeAd ? 1 : 0,
    freeAdId: freeAd?._id ?? null,
    hiddenAdsCount: hiddenAds.length,
  });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const {
    id,
    name,
    title,
    age,
    category,
    toServe,
    placeOfService,
    state,
    city,
    pincode,
    phone,
    whatsapp,
    telegram,
    about,
    images,
    status,
    serviceRates,
  } = body;

  if (!name || !category || !city || !phone || !whatsapp || !about) {
    return NextResponse.json(
      { error: "Name, service, city, phone, WhatsApp and about are required." },
      { status: 400 }
    );
  }

  if (age !== undefined && age !== null && String(age).trim() !== "") {
    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum < 18) {
      return NextResponse.json(
        { error: "Age must be at least 18." },
        { status: 400 }
      );
    }
  }

  const imageList = Array.isArray(images)
    ? images.filter((img: unknown) => typeof img === "string").slice(0, 4)
    : [];

  const rateList: ServiceRate[] = Array.isArray(serviceRates)
    ? serviceRates
        .filter(
          (r: unknown): r is Record<string, unknown> =>
            !!r && typeof r === "object"
        )
        .map((r) => ({
          duration: String(r.duration ?? "").trim(),
          incall: String(r.incall ?? "").trim(),
          outcall: String(r.outcall ?? "").trim(),
        }))
    : [];

  if (id) {
    const updated = await updateAd(id, userId, {
      name: String(name).trim(),
      title: title ? String(title).trim() : undefined,
      age: age ? String(age).trim() : undefined,
      category: String(category).trim(),
      toServe: Array.isArray(toServe)
        ? toServe.map((s: unknown) => String(s)).filter(Boolean)
        : undefined,
      placeOfService: Array.isArray(placeOfService)
        ? placeOfService.map((s: unknown) => String(s)).filter(Boolean)
        : undefined,
      state: state ? String(state).trim() : undefined,
      city: String(city).trim(),
      pincode: pincode ? String(pincode).trim() : undefined,
      phone: String(phone).trim(),
      whatsapp: whatsapp ? String(whatsapp).trim() : undefined,
      telegram: telegram ? String(telegram).trim() : undefined,
      about: String(about).trim(),
      images: imageList,
      status: status ? String(status) : "Active",
      serviceRates: rateList,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Ad not found or not owned by you." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ad: updated });
  }

  // Check if user already has an active free ad
  const existingAds = await listAds(userId);
  const hasActiveFreeAd = existingAds.some((a) => a.isFreeAd);
  const requiresPromotion = hasActiveFreeAd;

  const ad = await createAd({
    userId,
    name: String(name).trim(),
    title: title ? String(title).trim() : undefined,
    age: age ? String(age).trim() : undefined,
    category: String(category).trim(),
    toServe: Array.isArray(toServe)
      ? toServe.map((s: unknown) => String(s)).filter(Boolean)
      : undefined,
    placeOfService: Array.isArray(placeOfService)
      ? placeOfService.map((s: unknown) => String(s)).filter(Boolean)
      : undefined,
    state: state ? String(state).trim() : undefined,
    city: String(city).trim(),
    pincode: pincode ? String(pincode).trim() : undefined,
    phone: String(phone).trim(),
    whatsapp: whatsapp ? String(whatsapp).trim() : undefined,
    telegram: telegram ? String(telegram).trim() : undefined,
    about: String(about).trim(),
    images: imageList,
    status: status ? String(status) : "Active",
    serviceRates: rateList,
  });

  return NextResponse.json(
    {
      ad,
      isFreeAd: !requiresPromotion,
      requiresPromotion,
      message: requiresPromotion
        ? "Ad created successfully. Because you already have 1 free ad, you must promote this ad for it to appear on the city page."
        : "Ad created and published as your free ad!",
    },
    { status: 201 }
  );
}
