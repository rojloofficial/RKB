export type CoinPackage = {
  _id?: string;
  coins: number;
  price: number;
  originalPrice?: number;
  breakdown?: string;
  discount?: string;
  label?: string;
  popular?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export const DEFAULT_PACKAGES: Omit<CoinPackage, "_id">[] = [
  {
    coins: 99,
    price: 792,
    originalPrice: 792,
    breakdown: "",
    discount: "",
    label: "",
    popular: false,
  },
  {
    coins: 145,
    price: 1125,
    originalPrice: 1160,
    breakdown: "",
    discount: "3% DISCOUNT",
    label: "",
    popular: false,
  },
  {
    coins: 200,
    price: 1504,
    originalPrice: 1600,
    breakdown: "",
    discount: "6% DISCOUNT",
    label: "",
    popular: true,
  },
  {
    coins: 350,
    price: 2548,
    originalPrice: 2800,
    breakdown: "",
    discount: "9% DISCOUNT",
    label: "",
    popular: false,
  },
  {
    coins: 870,
    price: 6125,
    originalPrice: 6960,
    breakdown: "",
    discount: "12% DISCOUNT",
    label: "",
    popular: false,
  },
];
