import { readStore, writeStore } from "../persist";

export type CouponRecord = {
  _id?: string;
  code: string;
  discountType: "percentage" | "fixed"; // percentage or fixed amount
  discountValue: number; // percentage (e.g., 10) or amount (e.g., 100)
  minPurchase?: number; // minimum purchase amount in rupees
  maxDiscount?: number; // maximum discount cap for percentage discounts
  validTill?: string; // ISO date string
  active: boolean;
  createdAt: Date | string;
};

export async function listCoupons(): Promise<CouponRecord[]> {
  const store = await readStore();
  const coupons = (store.coupons ?? []) as unknown as CouponRecord[];

  return coupons.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });
}

export async function createCoupon(coupon: {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  validTill?: string;
}): Promise<CouponRecord> {
  const store = await readStore();
  const coupons = (store.coupons ?? []) as unknown as CouponRecord[];

  const newCoupon: CouponRecord = {
    _id: Date.now().toString(),
    ...coupon,
    active: true,
    createdAt: new Date(),
  };

  coupons.push(newCoupon);
  store.coupons = coupons;
  await writeStore(store);

  return newCoupon;
}

export async function updateCoupon(
  id: string,
  updates: Partial<CouponRecord>
): Promise<CouponRecord | null> {
  const store = await readStore();
  const coupons = (store.coupons ?? []) as unknown as CouponRecord[];

  const index = coupons.findIndex((c) => c._id === id);
  if (index === -1) return null;

  const updated = { ...coupons[index], ...updates };
  coupons[index] = updated;

  store.coupons = coupons;
  await writeStore(store);

  return updated;
}

export async function deleteCoupon(id: string): Promise<boolean> {
  const store = await readStore();
  const coupons = (store.coupons ?? []) as unknown as CouponRecord[];

  const index = coupons.findIndex((c) => c._id === id);
  if (index === -1) return false;

  coupons.splice(index, 1);
  store.coupons = coupons;
  await writeStore(store);

  return true;
}

export async function getCouponByCode(code: string): Promise<CouponRecord | null> {
  const coupons = await listCoupons();
  const coupon = coupons.find(
    (c) => c.code.toLowerCase() === code.toLowerCase() && c.active
  );

  if (!coupon) return null;

  // Check if coupon is expired
  if (coupon.validTill) {
    const validTill = new Date(coupon.validTill);
    if (new Date() > validTill) return null;
  }

  return coupon;
}

export async function calculateDiscount(
  couponCode: string,
  amount: number
): Promise<{ discount: number; finalAmount: number } | null> {
  const coupon = await getCouponByCode(couponCode);
  if (!coupon) return null;

  // Check minimum purchase
  if (coupon.minPurchase && amount < coupon.minPurchase) {
    return null;
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (amount * coupon.discountValue) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }

  const finalAmount = Math.max(0, amount - discount);
  return { discount, finalAmount };
}
