import type { PromoTier } from "./promo-shifts";

export type { PromoTier };

export type PromotionPackage = {
  _id?: string;
  id: string;
  title: string;
  tier: PromoTier;
  rankRange: string;
  durationDays: number;
  durationHours?: number;
  coinsCost: number;
  tag?: string;
  highlight?: boolean;
  features: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
};

export const DEFAULT_PROMO_PACKAGES: PromotionPackage[] = [
  {
    id: "platinum-vip",
    title: "Platinum",
    tier: "platinum",
    rankRange: "Top 1 - 3",
    durationDays: 1,
    durationHours: 24,
    coinsCost: 25,
    tag: "Highest Rank",
    highlight: true,
    features: [
      "Top position on city listings",
      "Runs on Top during chosen shift every day",
      "Fair 30-min slot rotation when shift is full",
      "Moves down outside shift, returns to top next day",
      "Distinctive Platinum badge",
    ],
  },
  {
    id: "gold-vip",
    title: "Gold",
    tier: "gold",
    rankRange: "Top 4 - 6",
    durationDays: 1,
    durationHours: 24,
    coinsCost: 15,
    tag: "Most Popular",
    features: [
      "Top position on city listings",
      "Runs on Top during chosen shift every day",
      "Fair 30-min slot rotation when shift is full",
      "Moves down outside shift, returns to top next day",
      "Distinctive Gold badge",
    ],
  },
  {
    id: "silver-vip",
    title: "Silver",
    tier: "silver",
    rankRange: "Top 7 - 10",
    durationDays: 1,
    durationHours: 24,
    coinsCost: 10,
    tag: "Great Value",
    features: [
      "Top position on city listings",
      "Runs on Top during chosen shift every day",
      "Fair 30-min slot rotation when shift is full",
      "Moves down outside shift, returns to top next day",
      "Distinctive Silver badge",
    ],
  },
  {
    id: "bronze-vip",
    title: "Bronze",
    tier: "bronze",
    rankRange: "Top 10 - 15",
    durationDays: 1,
    durationHours: 24,
    coinsCost: 5,
    tag: "Budget Friendly",
    features: [
      "Top position on city listings",
      "Runs on Top during chosen shift every day",
      "Fair 30-min slot rotation when shift is full",
      "Moves down outside shift, returns to top next day",
      "Distinctive Bronze badge",
    ],
  },
];
