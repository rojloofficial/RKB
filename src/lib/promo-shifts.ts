export type PromoShift =
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "12h"
  | "day"
  | "all";

export type PromoTier = "platinum" | "gold" | "silver" | "bronze";

export interface ShiftInfo {
  shift: "morning" | "afternoon" | "evening" | "night";
  label: string;
  hours: string;
  nextShift: "morning" | "afternoon" | "evening" | "night";
  nextShiftLabel: string;
  nextShiftTime: string;
}

export interface ShiftTimingResult {
  promotedFrom: Date;
  promotedUntil: Date;
  isCurrentShift: boolean;
  isNextDay: boolean;
  shiftLabel: string;
  scheduleDescription: string;
}

export interface TierRankInfo {
  tier: PromoTier;
  title: string;
  rankRange: string;
  minRank: number;
  maxRank: number;
  badge: string;
  badgeClass: string;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getISTDate(date: Date = new Date()): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

export function createDateFromIST(
  year: number,
  monthIndex: number,
  day: number,
  hours: number,
  minutes = 0
): Date {
  return new Date(Date.UTC(year, monthIndex, day, hours, minutes, 0, 0) - IST_OFFSET_MS);
}

export function normalizeShift(
  shift?: string
): "morning" | "afternoon" | "evening" | "night" | "all" {
  const norm = (shift || "morning").trim().toLowerCase();
  if (norm === "morning") return "morning";
  if (norm === "afternoon") return "afternoon";
  if (norm === "evening") return "evening";
  if (norm === "night") return "night";
  if (norm === "all" || norm === "24h" || norm === "all-shifts") {
    return "all";
  }
  return "morning";
}

/**
 * Returns current shift based on Indian Standard Time (IST, UTC+5:30):
 * - Morning Shift: 06:00 AM to 12:00 PM (6 Hours)
 * - Afternoon Shift: 12:00 PM to 06:00 PM (6 Hours)
 * - Evening Shift: 06:00 PM to 12:00 AM Midnight (6 Hours)
 * - Night Shift: 12:00 AM Midnight to 06:00 AM (6 Hours)
 */
export function getCurrentShift(
  date: Date = new Date()
): "morning" | "afternoon" | "evening" | "night" {
  const istDate = getISTDate(date);
  const hour = istDate.getUTCHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 24) return "evening";
  return "night";
}

export function getCurrentShiftInfo(date: Date = new Date()): ShiftInfo {
  const current = getCurrentShift(date);
  switch (current) {
    case "morning":
      return {
        shift: "morning",
        label: "Morning Shift",
        hours: "06:00 AM – 12:00 PM (6 Hours)",
        nextShift: "afternoon",
        nextShiftLabel: "Afternoon Shift",
        nextShiftTime: "12:00 PM",
      };
    case "afternoon":
      return {
        shift: "afternoon",
        label: "Afternoon Shift",
        hours: "12:00 PM – 06:00 PM (6 Hours)",
        nextShift: "evening",
        nextShiftLabel: "Evening Shift",
        nextShiftTime: "06:00 PM",
      };
    case "evening":
      return {
        shift: "evening",
        label: "Evening Shift",
        hours: "06:00 PM – 12:00 AM (6 Hours)",
        nextShift: "night",
        nextShiftLabel: "Night Shift",
        nextShiftTime: "12:00 AM",
      };
    case "night":
      return {
        shift: "night",
        label: "Night Shift",
        hours: "12:00 AM – 06:00 AM (6 Hours)",
        nextShift: "morning",
        nextShiftLabel: "Morning Shift",
        nextShiftTime: "06:00 AM",
      };
  }
}

export function getShiftLabel(shift?: string): string {
  const normalized = normalizeShift(shift);
  if (normalized === "all") {
    return "All 4 Shifts (24 Hours Full Day • Morning, Afternoon, Evening & Night)";
  }
  if (normalized === "morning") {
    return "Morning Shift (06:00 AM – 12:00 PM • 6h)";
  }
  if (normalized === "afternoon") {
    return "Afternoon Shift (12:00 PM – 06:00 PM • 6h)";
  }
  if (normalized === "evening") {
    return "Evening Shift (06:00 PM – 12:00 AM Midnight • 6h)";
  }
  return "Night Shift (12:00 AM Midnight – 06:00 AM • 6h)";
}

export function getShiftShortLabel(shift?: string): string {
  const normalized = normalizeShift(shift);
  if (normalized === "all") return "⚡ All 4 Shifts (24h)";
  if (normalized === "morning") return "🌅 Morning (6h)";
  if (normalized === "afternoon") return "☀️ Afternoon (6h)";
  if (normalized === "evening") return "🌇 Evening (6h)";
  return "🌙 Night (6h)";
}

/**
 * Calculates start (promotedFrom) and end (promotedUntil) times for a shift:
 * - "all": 24 hours full day covering all 4 shifts.
 * - 6-hour shift: active immediately until the shift ends (if inside shift), or scheduled.
 */
export function calculateShiftTiming(
  rawShift?: string,
  now: Date = new Date()
): ShiftTimingResult {
  const shift = normalizeShift(rawShift);
  const istNow = getISTDate(now);

  const istYear = istNow.getUTCFullYear();
  const istMonth = istNow.getUTCMonth();
  const istDay = istNow.getUTCDate();
  const istHours = istNow.getUTCHours();
  const istMinutes = istNow.getUTCMinutes();
  const currentMinutes = istHours * 60 + istMinutes;

  let promotedFrom: Date;
  let promotedUntil: Date;
  let isCurrentShift = false;
  let isNextDay = false;

  switch (shift) {
    case "all": {
      promotedFrom = now;
      promotedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      isCurrentShift = true;
      isNextDay = false;
      break;
    }

    case "morning": {
      // 06:00 AM (360) to 12:00 PM (720)
      if (currentMinutes < 360) {
        promotedFrom = createDateFromIST(istYear, istMonth, istDay, 6, 0);
        promotedUntil = createDateFromIST(istYear, istMonth, istDay, 12, 0);
        isCurrentShift = false;
        isNextDay = false;
      } else if (currentMinutes < 720) {
        promotedFrom = now;
        promotedUntil = createDateFromIST(istYear, istMonth, istDay, 12, 0);
        isCurrentShift = true;
        isNextDay = false;
      } else {
        // Morning shift passed today -> Next day morning
        promotedFrom = createDateFromIST(istYear, istMonth, istDay + 1, 6, 0);
        promotedUntil = createDateFromIST(istYear, istMonth, istDay + 1, 12, 0);
        isCurrentShift = false;
        isNextDay = true;
      }
      break;
    }

    case "afternoon": {
      // 12:00 PM (720) to 06:00 PM (1080)
      if (currentMinutes < 720) {
        promotedFrom = createDateFromIST(istYear, istMonth, istDay, 12, 0);
        promotedUntil = createDateFromIST(istYear, istMonth, istDay, 18, 0);
        isCurrentShift = false;
        isNextDay = false;
      } else if (currentMinutes < 1080) {
        promotedFrom = now;
        promotedUntil = createDateFromIST(istYear, istMonth, istDay, 18, 0);
        isCurrentShift = true;
        isNextDay = false;
      } else {
        // Afternoon shift passed today -> Next day afternoon
        promotedFrom = createDateFromIST(istYear, istMonth, istDay + 1, 12, 0);
        promotedUntil = createDateFromIST(istYear, istMonth, istDay + 1, 18, 0);
        isCurrentShift = false;
        isNextDay = true;
      }
      break;
    }

    case "evening": {
      // 06:00 PM (1080) to 12:00 AM Midnight (1440)
      if (currentMinutes < 1080) {
        promotedFrom = createDateFromIST(istYear, istMonth, istDay, 18, 0);
        promotedUntil = createDateFromIST(istYear, istMonth, istDay + 1, 0, 0);
        isCurrentShift = false;
        isNextDay = false;
      } else {
        promotedFrom = now;
        promotedUntil = createDateFromIST(istYear, istMonth, istDay + 1, 0, 0);
        isCurrentShift = true;
        isNextDay = false;
      }
      break;
    }

    case "night": {
      // 12:00 AM Midnight (0) to 06:00 AM (360)
      if (currentMinutes < 360) {
        promotedFrom = now;
        promotedUntil = createDateFromIST(istYear, istMonth, istDay, 6, 0);
        isCurrentShift = true;
        isNextDay = false;
      } else {
        // Night shift passed early today -> Tonight at midnight (starts 00:00 next day)
        promotedFrom = createDateFromIST(istYear, istMonth, istDay + 1, 0, 0);
        promotedUntil = createDateFromIST(istYear, istMonth, istDay + 1, 6, 0);
        isCurrentShift = false;
        isNextDay = true;
      }
      break;
    }
  }

  const shiftLabel = getShiftLabel(shift);
  let scheduleDescription = "";
  if (shift === "all") {
    scheduleDescription = `Active now: 24/7 coverage across all 4 shifts (Morning, Afternoon, Evening, Night) until ${formatDateTime(promotedUntil)}`;
  } else if (isCurrentShift) {
    scheduleDescription = `Active now: Runs until ${formatDateTime(promotedUntil)} (6-hour shift)`;
  } else if (isNextDay) {
    scheduleDescription = `Shift passed today: Scheduled for Tomorrow (${formatDateTime(promotedFrom)} – ${formatDateTime(promotedUntil)})`;
  } else {
    scheduleDescription = `Scheduled for Today: Starts at ${formatDateTime(promotedFrom)} and runs until ${formatDateTime(promotedUntil)}`;
  }

  return {
    promotedFrom,
    promotedUntil,
    isCurrentShift,
    isNextDay,
    shiftLabel,
    scheduleDescription,
  };
}

export const TIER_RANK_MAP: Record<PromoTier, TierRankInfo> = {
  platinum: {
    tier: "platinum",
    title: "Platinum VIP",
    rankRange: "Top 1 - 3",
    minRank: 1,
    maxRank: 3,
    badge: "👑 Top 1-3 VIP",
    badgeClass: "bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white border-purple-300",
  },
  gold: {
    tier: "gold",
    title: "Gold VIP",
    rankRange: "Top 4 - 6",
    minRank: 4,
    maxRank: 6,
    badge: "🥇 Top 4-6 VIP",
    badgeClass: "bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-amber-300",
  },
  silver: {
    tier: "silver",
    title: "Silver VIP",
    rankRange: "Top 7 - 10",
    minRank: 7,
    maxRank: 10,
    badge: "🥈 Top 7-10 VIP",
    badgeClass: "bg-gradient-to-r from-slate-500 to-gray-700 text-white border-slate-300",
  },
  bronze: {
    tier: "bronze",
    title: "Bronze VIP",
    rankRange: "Top 10 - 15",
    minRank: 10,
    maxRank: 15,
    badge: "🥉 Top 10-15 VIP",
    badgeClass: "bg-gradient-to-r from-amber-800 to-yellow-900 text-white border-amber-600",
  },
};

export function normalizeTier(rawTier?: string, rawTitleOrId?: string): PromoTier {
  const val = (rawTier || "").trim().toLowerCase();
  if (val === "platinum" || val === "gold" || val === "silver" || val === "bronze") {
    return val as PromoTier;
  }

  const search = `${rawTier || ""} ${rawTitleOrId || ""}`.toLowerCase();
  if (search.includes("platinum") || search.includes("7-day") || search.includes("vip-7")) {
    return "platinum";
  }
  if (search.includes("gold") || search.includes("3-day") || search.includes("vip-3")) {
    return "gold";
  }
  if (search.includes("silver") || search.includes("2-day") || search.includes("vip-2")) {
    return "silver";
  }
  return "bronze";
}

export function getTierRankInfo(tier?: string, titleOrId?: string): TierRankInfo {
  const norm = normalizeTier(tier, titleOrId);
  return TIER_RANK_MAP[norm] || TIER_RANK_MAP.bronze;
}

export function isAdPromotionActive(
  ad: {
    promoted?: boolean;
    isPromoted?: boolean;
    promotedUntil?: Date | string;
    promotedFrom?: Date | string;
  },
  now: Date = new Date()
): boolean {
  const isFlagged = Boolean(ad.promoted || ad.isPromoted);
  if (!isFlagged || !ad.promotedUntil) return false;

  const expiryTime = new Date(ad.promotedUntil).getTime();
  if (isNaN(expiryTime) || expiryTime <= now.getTime()) return false;

  if (ad.promotedFrom) {
    const startTime = new Date(ad.promotedFrom).getTime();
    if (!isNaN(startTime) && startTime > now.getTime()) {
      return false; // Scheduled for a future shift window
    }
  }

  return true;
}

export function isAdScheduledFuture(
  ad: {
    promoted?: boolean;
    isPromoted?: boolean;
    promotedUntil?: Date | string;
    promotedFrom?: Date | string;
  },
  now: Date = new Date()
): boolean {
  const isFlagged = Boolean(ad.promoted || ad.isPromoted);
  if (!isFlagged || !ad.promotedFrom || !ad.promotedUntil) return false;

  const expiryTime = new Date(ad.promotedUntil).getTime();
  const startTime = new Date(ad.promotedFrom).getTime();

  return (
    !isNaN(expiryTime) &&
    !isNaN(startTime) &&
    startTime > now.getTime() &&
    expiryTime > startTime
  );
}

export function isAdActiveInCurrentShift(
  ad: {
    promoted?: boolean;
    isPromoted?: boolean;
    promotedUntil?: Date | string;
    promotedFrom?: Date | string;
    promoShift?: string;
  },
  now: Date = new Date()
): boolean {
  if (!isAdPromotionActive(ad, now)) {
    return false;
  }

  const rawShift = (ad.promoShift || "morning").trim().toLowerCase();
  if (rawShift === "all" || rawShift === "24h") {
    return true; // 24-hour full day shift
  }

  const currentShift = getCurrentShift(now);
  const adShift = normalizeShift(rawShift);

  return currentShift === adShift;
}

export function isAdShiftResting(
  ad: {
    promoted?: boolean;
    isPromoted?: boolean;
    promotedUntil?: Date | string;
    promotedFrom?: Date | string;
    promoShift?: string;
  },
  now: Date = new Date()
): boolean {
  if (!isAdPromotionActive(ad, now)) {
    return false;
  }
  return !isAdActiveInCurrentShift(ad, now);
}

export function getNextShiftStart(
  rawShift?: string,
  now: Date = new Date()
): Date {
  const shift = normalizeShift(rawShift);
  const istNow = getISTDate(now);

  const istYear = istNow.getUTCFullYear();
  const istMonth = istNow.getUTCMonth();
  const istDay = istNow.getUTCDate();
  const istHours = istNow.getUTCHours();
  const istMinutes = istNow.getUTCMinutes();
  const currentMinutes = istHours * 60 + istMinutes;

  switch (shift) {
    case "morning": {
      if (currentMinutes < 360) {
        return createDateFromIST(istYear, istMonth, istDay, 6, 0);
      }
      return createDateFromIST(istYear, istMonth, istDay + 1, 6, 0);
    }
    case "afternoon": {
      if (currentMinutes < 720) {
        return createDateFromIST(istYear, istMonth, istDay, 12, 0);
      }
      return createDateFromIST(istYear, istMonth, istDay + 1, 12, 0);
    }
    case "evening": {
      if (currentMinutes < 1080) {
        return createDateFromIST(istYear, istMonth, istDay, 18, 0);
      }
      return createDateFromIST(istYear, istMonth, istDay + 1, 18, 0);
    }
    case "night": {
      if (currentMinutes < 360) {
        return createDateFromIST(istYear, istMonth, istDay, 0, 0);
      }
      return createDateFromIST(istYear, istMonth, istDay + 1, 0, 0);
    }
    case "all":
    default: {
      return now;
    }
  }
}

export const TIER_CAPACITIES: Record<PromoTier, number> = {
  platinum: 3, // Top 1 - 3
  gold: 3,     // Top 4 - 6
  silver: 4,   // Top 7 - 10
  bronze: 6,   // Top 10 - 15
};

/**
 * 30-minute fair rotation algorithm:
 * When the number of active ads in a shift exceeds the tier's slot capacity,
 * rotate the order every 30 minutes deterministically based on epoch time:
 * Math.floor(now.getTime() / (30 * 60 * 1000)) % totalAds.
 * Every advertiser gets equal exposure at the top of their tier!
 */
export function rotateTierAds<T>(
  tierAds: T[],
  capacity: number,
  now: Date = new Date()
): T[] {
  if (tierAds.length <= capacity || tierAds.length === 0) {
    return tierAds;
  }

  // 30-minute interval index
  const intervalIndex = Math.floor(now.getTime() / (30 * 60 * 1000));
  const offset = intervalIndex % tierAds.length;

  if (offset === 0) {
    return tierAds;
  }

  return [...tierAds.slice(offset), ...tierAds.slice(0, offset)];
}

export function calculateExpirationDate(
  duration: number,
  startDate: Date = new Date(),
  isHours = false
): Date {
  if (isHours) {
    const hours = Math.max(1, Number(duration) || 6);
    return new Date(startDate.getTime() + hours * 60 * 60 * 1000);
  }
  const days = Number(duration) || 1;
  return new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
}

export function calculatePromoExpiration(
  pkg?: { durationDays?: number; durationHours?: number },
  shift?: string,
  startDate: Date = new Date()
): Date {
  const timing = calculateShiftTiming(shift, startDate);

  const days =
    pkg?.durationDays !== undefined && pkg.durationDays > 0
      ? Number(pkg.durationDays)
      : pkg?.durationHours && pkg.durationHours >= 24
      ? Math.floor(pkg.durationHours / 24)
      : 0;

  if (days >= 1) {
    // Multi-day package: runs until end of shift on target day
    const daysToAdd = Math.floor(days);
    return new Date(
      timing.promotedUntil.getTime() + (daysToAdd - 1) * 24 * 60 * 60 * 1000
    );
  }

  return timing.promotedUntil;
}

export function formatDateTime(date?: Date | string): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const formattedTime = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;

  return `${day} ${month} ${year}, ${formattedTime}`;
}

export function formatTimeRemaining(expiryDate?: Date | string, now: Date = new Date()): string {
  if (!expiryDate) return "Expired";
  const exp = new Date(expiryDate).getTime();
  const diff = exp - now.getTime();

  if (diff <= 0) return "Expired";

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

export function formatDetailedTimeRemaining(expiryDate?: Date | string, now: Date = new Date()): string {
  if (!expiryDate) return "Expired";
  const exp = new Date(expiryDate).getTime();
  const diff = exp - now.getTime();

  if (diff <= 0) return "Expired";

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h ${minutes}m ${seconds}s left`;
  }
  return `${hours}h ${minutes}m ${seconds}s left`;
}

/**
 * Sorts ads by promotion tier:
 * - Active Platinum ads (Top 1 - 3, rotated every 30 min if > 3 ads)
 * - Active Gold ads (Top 4 - 6, rotated every 30 min if > 3 ads)
 * - Active Silver ads (Top 7 - 10, rotated every 30 min if > 4 ads)
 * - Active Bronze ads (Top 10 - 15, rotated every 30 min if > 6 ads)
 * - Remaining ads: ads resting between shifts on multi-day packages, future scheduled ads, expired ads, and standard free ads.
 */
export function sortAdsWithPromotions<T extends {
  _id?: string;
  createdAt: Date | string;
  promoted?: boolean;
  isPromoted?: boolean;
  promotedUntil?: Date | string;
  promotedFrom?: Date | string;
  promoPackage?: string;
  promoTier?: string;
  promoShift?: string;
}>(ads: T[], now: Date = new Date()): T[] {
  const platinumAds: T[] = [];
  const goldAds: T[] = [];
  const silverAds: T[] = [];
  const bronzeAds: T[] = [];
  const otherAds: T[] = [];

  for (const ad of ads) {
    // Only ads active in the current shift qualify for top placement!
    const isShiftActive = isAdActiveInCurrentShift(ad, now);

    if (isShiftActive) {
      const tier = normalizeTier(ad.promoTier, ad.promoPackage);
      if (tier === "platinum") {
        platinumAds.push(ad);
      } else if (tier === "gold") {
        goldAds.push(ad);
      } else if (tier === "silver") {
        silverAds.push(ad);
      } else {
        bronzeAds.push(ad);
      }
      continue;
    }

    // Ads outside their shift (resting between days on multi-day packages),
    // future scheduled ads, expired ads, and standard free ads
    otherAds.push(ad);
  }

  // Sort within tiers by promotion recency or creation date
  const sortByDate = (a: T, b: T) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  platinumAds.sort(sortByDate);
  goldAds.sort(sortByDate);
  silverAds.sort(sortByDate);
  bronzeAds.sort(sortByDate);
  otherAds.sort(sortByDate);

  // Apply 30-minute fair rotation when ads exceed tier slot capacity
  const rotatedPlatinum = rotateTierAds(platinumAds, TIER_CAPACITIES.platinum, now);
  const rotatedGold = rotateTierAds(goldAds, TIER_CAPACITIES.gold, now);
  const rotatedSilver = rotateTierAds(silverAds, TIER_CAPACITIES.silver, now);
  const rotatedBronze = rotateTierAds(bronzeAds, TIER_CAPACITIES.bronze, now);

  return [
    ...rotatedPlatinum,
    ...rotatedGold,
    ...rotatedSilver,
    ...rotatedBronze,
    ...otherAds,
  ];
}
