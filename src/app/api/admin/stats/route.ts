import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminContext } from "@/lib/admin-access";
import { listUsers } from "@/lib/models/user";
import { listAllAds } from "@/lib/models/ad";
import { listAllCities } from "@/lib/models/city";
import { listStates } from "@/lib/models/state";
import { listSubAdmins } from "@/lib/models/admin-user";
import { listUPIs } from "@/lib/models/upi";
import { listCoupons } from "@/lib/models/coupon";
import { listPaymentRequests } from "@/lib/models/payment-request";
import { listPaymentHistory } from "@/lib/models/payment-history";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAdminContext(request);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const db = await getDb();
    let stats = null;

    if (db) {
      try {
        const [
          usersCount,
          adsCount,
          allCities,
          states,
          subAdminsCount,
          upiCount,
          couponsList,
          paymentRequestsGroup,
          paymentHistoryGroup,
        ] = await Promise.all([
          db.collection("users").countDocuments().catch(() => 0),
          db.collection("ads").countDocuments({ status: { $ne: "deleted" } }).catch(() => 0),
          listAllCities().catch(() => []),
          listStates().catch(() => []),
          db.collection("admin_users").countDocuments().catch(() => 0),
          db.collection("upis").countDocuments().catch(() => 0),
          db.collection("coupons").find({}, { projection: { active: 1 } }).toArray().catch(() => []),
          db.collection("payment_requests").aggregate([
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ]).toArray().catch(() => []),
          db.collection("payment_history").aggregate([
            {
              $group: {
                _id: null,
                totalCoinsSold: { $sum: "$coins" },
                totalAmount: {
                  $sum: {
                    $cond: [
                      { $ifNull: ["$finalAmount", false] },
                      "$finalAmount",
                      { $max: [0, { $subtract: ["$amount", { $ifNull: ["$discount", 0] }] }] },
                    ],
                  },
                },
              },
            },
          ]).toArray().catch(() => []),
        ]);

        const activeCoupons = couponsList.filter((c) => Boolean(c.active)).length;
        let pendingPayments = 0;
        let confirmedPayments = 0;
        let declinedPayments = 0;
        for (const p of paymentRequestsGroup) {
          if (p._id === "pending") pendingPayments = p.count;
          else if (p._id === "confirmed") confirmedPayments = p.count;
          else if (p._id === "declined") declinedPayments = p.count;
        }

        const histStat = paymentHistoryGroup[0];
        const totalAmountAfterDiscount = Number(histStat?.totalAmount || 0);
        const totalCoinsSold = Number(histStat?.totalCoinsSold || 0);

        stats = {
          users: usersCount,
          ads: adsCount,
          cities: allCities.length,
          states: states.length,
          subAdmins: subAdminsCount,
          upiTotal: upiCount,
          activeCoupons,
          pendingPayments,
          confirmedPayments,
          declinedPayments,
          totalAmountAfterDiscount,
          totalCoinsSold,
        };
      } catch (err) {
        console.warn("[admin/stats] Mongo aggregation failed, falling back to memory:", err);
      }
    }

    if (stats) {
      return NextResponse.json(stats);
    }

    const [
      users,
      ads,
      cities,
      states,
      subAdmins,
      upis,
      coupons,
      paymentRequests,
      paymentHistory,
    ] = await Promise.all([
      listUsers().catch(() => []),
      listAllAds().catch(() => []),
      listAllCities().catch(() => []),
      listStates().catch(() => []),
      listSubAdmins().catch(() => []),
      listUPIs().catch(() => []),
      listCoupons().catch(() => []),
      listPaymentRequests().catch(() => []),
      listPaymentHistory().catch(() => []),
    ]);

    const activeCoupons = coupons.filter((c) => Boolean(c.active)).length;
    const pendingPayments = paymentRequests.filter(
      (r) => r.status === "pending"
    ).length;
    const confirmedPayments = paymentRequests.filter(
      (r) => r.status === "confirmed"
    ).length;
    const declinedPayments = paymentRequests.filter(
      (r) => r.status === "declined"
    ).length;

    const totalAmountAfterDiscount = paymentHistory.reduce((sum, item) => {
      const finalAmount =
        typeof item.finalAmount === "number"
          ? item.finalAmount
          : Math.max(0, (item.amount ?? 0) - (item.discount ?? 0));
      return sum + finalAmount;
    }, 0);

    const totalCoinsSold = paymentHistory.reduce(
      (sum, item) => sum + (item.coins ?? 0),
      0
    );

    return NextResponse.json({
      users: users.length,
      ads: ads.length,
      cities: cities.length,
      states: states.length,
      subAdmins: subAdmins.length,
      upiTotal: upis.length,
      activeCoupons,
      pendingPayments,
      confirmedPayments,
      declinedPayments,
      totalAmountAfterDiscount,
      totalCoinsSold,
    });
  } catch (error) {
    console.error("[admin/stats] GET error:", error);
    return NextResponse.json(
      { error: "Unable to load dashboard statistics." },
      { status: 500 }
    );
  }
}
