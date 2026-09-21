import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { getAdById, updateAd } from "@/lib/models/ad";
import { findUserById, updateUserCoins } from "@/lib/models/user";
import { getPromotionPackages } from "@/lib/models/promotion-package";
import { getAllPackagesCoins } from "@/lib/models/coin-package";
import {
  calculateShiftTiming,
  normalizeShift,
  formatDateTime,
  normalizeTier,
  getTierRankInfo,
  getShiftLabel,
  type PromoShift,
} from "@/lib/promo-shifts";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  if (!id) {
    return NextResponse.json({ error: "Ad ID is required." }, { status: 400 });
  }

  // 1. Determine shift mode (Single 6-hour slot OR All 4 slots / 24 Hours)
  const isAllShifts = Boolean(
    body?.allShifts ||
    String(body?.shift).toLowerCase() === "all" ||
    String(body?.shift).toLowerCase() === "24h"
  );
  const promoShift: PromoShift = isAllShifts
    ? "all"
    : normalizeShift(String(body?.shift || "morning").toLowerCase());
  const slotsMultiplier = isAllShifts ? 4 : 1;

  // 2. Determine package mode (All Packages Combo OR Single Package)
  const isAllPackages = Boolean(
    body?.allPackages ||
    body?.packageId === "all-packages" ||
    body?.packageId === "all"
  );

  let basePackageCoins = 5;
  let packageName = "Bronze VIP";
  let promoTier: "platinum" | "gold" | "silver" | "bronze" = "bronze";

  if (isAllPackages) {
    basePackageCoins = await getAllPackagesCoins();
    packageName = "👑 All Packages VIP Combo";
    promoTier = "platinum";
  } else {
    const packages = await getPromotionPackages();
    const matchedPkg = packages.find(
      (p) =>
        (body?.packageId && p.id === body.packageId) ||
        (body?.title && p.title === body.title)
    );

    basePackageCoins = Number(matchedPkg ? matchedPkg.coinsCost : (body?.coinsCost ?? 5));
    packageName = matchedPkg ? matchedPkg.title : (typeof body?.title === "string" ? body.title : "Bronze VIP");
    promoTier = normalizeTier(body?.tier || matchedPkg?.tier, packageName);
  }

  // Total required coins = basePackageCoins * slotsMultiplier
  const totalCoinsCost = basePackageCoins * slotsMultiplier;
  const tierInfo = getTierRankInfo(promoTier);

  // Find ad and verify ownership
  const ad = await getAdById(id, userId);
  if (!ad) {
    return NextResponse.json(
      { error: "Ad not found or not owned by you." },
      { status: 404 }
    );
  }

  // Find user and check coin balance
  const user = await findUserById(userId);
  const currentCoins = Number(user?.coins ?? 0);

  if (currentCoins < totalCoinsCost) {
    const slotDesc = isAllShifts ? "All 4 Slots (24 Hours)" : getShiftLabel(promoShift);
    return NextResponse.json(
      {
        error: `Insufficient coins. You have ${currentCoins} coins, but promoting with ${packageName} during ${slotDesc} requires ${totalCoinsCost} coins.`,
        currentCoins,
        requiredCoins: totalCoinsCost,
      },
      { status: 400 }
    );
  }

  // Deduct coins
  const deducted = await updateUserCoins(userId, -totalCoinsCost, user?.email);
  if (!deducted) {
    return NextResponse.json(
      { error: "Failed to deduct coins. Please try again." },
      { status: 500 }
    );
  }

  // Calculate promotion shift timing
  const now = new Date();
  const shiftTiming = calculateShiftTiming(promoShift, now);

  const updatedAd = await updateAd(id, userId, {
    promoted: true,
    isPromoted: true,
    promotedFrom: shiftTiming.promotedFrom,
    promotedUntil: shiftTiming.promotedUntil,
    promoPackage: packageName,
    promoTier,
    promoShift,
  });

  if (!updatedAd) {
    // Refund coins if ad update failed
    await updateUserCoins(userId, totalCoinsCost, user?.email);
    return NextResponse.json(
      { error: "Failed to promote ad. Coins have been refunded." },
      { status: 500 }
    );
  }

  const shiftText = getShiftLabel(promoShift);
  const startFormatted = formatDateTime(shiftTiming.promotedFrom);
  const expiryFormatted = formatDateTime(shiftTiming.promotedUntil);

  const statusPrefix = shiftTiming.isCurrentShift
    ? `Active now until ${expiryFormatted}`
    : `Scheduled to start on ${startFormatted} until ${expiryFormatted}`;

  return NextResponse.json({
    success: true,
    message: `🎉 Ad promoted successfully with ${packageName}! Position: ${tierInfo.rankRange} during ${shiftText}. ${statusPrefix}.`,
    ad: updatedAd,
    remainingCoins: currentCoins - totalCoinsCost,
    coinsCost: totalCoinsCost,
    isAllShifts,
    isAllPackages,
    promotedFrom: shiftTiming.promotedFrom.toISOString(),
    promotedUntil: shiftTiming.promotedUntil.toISOString(),
    startTimeFormatted: startFormatted,
    expireTimeFormatted: expiryFormatted,
    isCurrentShift: shiftTiming.isCurrentShift,
    isNextDay: shiftTiming.isNextDay,
    scheduleDescription: shiftTiming.scheduleDescription,
    rankRange: tierInfo.rankRange,
    tier: promoTier,
    promoShift,
    packageName,
  });
}
