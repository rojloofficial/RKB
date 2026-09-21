import { Collection, Document, ObjectId } from "mongodb";
import { getDb } from "../db";
import { readStore, writeStore } from "../persist";

export type PaymentHistory = {
  _id?: string;
  userEmail: string;
  userName?: string;
  userId: string;
  transactionId: string;
  upiId: string;
  upiName?: string;
  coins: number;
  amount: number;
  discount?: number;
  finalAmount: number;
  couponCode?: string;
  paymentRequestId: string;
  createdAt: Date | string;
};

let paymentHistoryIndexesCreated = false;

async function getPaymentHistoryCollection(): Promise<Collection<Document> | null> {
  const db = await getDb();
  if (!db) return null;
  const col = db.collection("payment_history");
  if (!paymentHistoryIndexesCreated) {
    try {
      await col.createIndex({ createdAt: -1 });
      await col.createIndex({ userId: 1 });
      await col.createIndex({ userEmail: 1 });
      paymentHistoryIndexesCreated = true;
    } catch {
      // Non-fatal
    }
  }
  return col;
}

export async function listPaymentHistory(): Promise<PaymentHistory[]> {
  const col = await getPaymentHistoryCollection();
  if (col) {
    try {
      const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
      return docs.map((doc) => ({
        _id: doc._id.toString(),
        userEmail: String(doc.userEmail || ""),
        userName: doc.userName ? String(doc.userName) : undefined,
        userId: String(doc.userId || ""),
        transactionId: String(doc.transactionId || ""),
        upiId: String(doc.upiId || ""),
        upiName: doc.upiName ? String(doc.upiName) : undefined,
        coins: Number(doc.coins || 0),
        amount: Number(doc.amount || 0),
        discount: doc.discount ? Number(doc.discount) : undefined,
        finalAmount: Number(doc.finalAmount ?? doc.amount ?? 0),
        couponCode: doc.couponCode ? String(doc.couponCode) : undefined,
        paymentRequestId: String(doc.paymentRequestId || ""),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || new Date().toISOString()),
      }));
    } catch (err) {
      console.error("[payment-history] MongoDB list failed:", err);
    }
  }

  const store = await readStore();
  const history = (store.paymentHistory ?? []) as unknown as PaymentHistory[];

  return history.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });
}

export async function createPaymentHistory(payment: {
  userEmail: string;
  userName?: string;
  userId: string;
  transactionId: string;
  upiId: string;
  upiName?: string;
  coins: number;
  amount: number;
  discount?: number;
  finalAmount: number;
  couponCode?: string;
  paymentRequestId: string;
}): Promise<PaymentHistory> {
  const now = new Date();
  const newPayment: PaymentHistory = {
    userEmail: payment.userEmail.trim().toLowerCase(),
    userName: payment.userName,
    userId: String(payment.userId),
    transactionId: payment.transactionId.trim(),
    upiId: payment.upiId,
    upiName: payment.upiName,
    coins: Number(payment.coins),
    amount: Number(payment.amount),
    discount: payment.discount ? Number(payment.discount) : undefined,
    finalAmount: Number(payment.finalAmount),
    couponCode: payment.couponCode ? payment.couponCode.trim() : undefined,
    paymentRequestId: String(payment.paymentRequestId),
    createdAt: now.toISOString(),
  };

  const col = await getPaymentHistoryCollection();
  if (col && payment.paymentRequestId) {
    try {
      const existingDoc = await col.findOne({ paymentRequestId: String(payment.paymentRequestId) });
      if (existingDoc) {
        return {
          _id: existingDoc._id.toString(),
          userEmail: String(existingDoc.userEmail || ""),
          userName: existingDoc.userName ? String(existingDoc.userName) : undefined,
          userId: String(existingDoc.userId || ""),
          transactionId: String(existingDoc.transactionId || ""),
          upiId: String(existingDoc.upiId || ""),
          upiName: existingDoc.upiName ? String(existingDoc.upiName) : undefined,
          coins: Number(existingDoc.coins || 0),
          amount: Number(existingDoc.amount || 0),
          discount: existingDoc.discount ? Number(existingDoc.discount) : undefined,
          finalAmount: Number(existingDoc.finalAmount ?? existingDoc.amount ?? 0),
          couponCode: existingDoc.couponCode ? String(existingDoc.couponCode) : undefined,
          paymentRequestId: String(existingDoc.paymentRequestId || ""),
          createdAt: existingDoc.createdAt instanceof Date ? existingDoc.createdAt.toISOString() : String(existingDoc.createdAt || new Date().toISOString()),
        };
      }
    } catch (err) {
      console.error("[payment-history] MongoDB findOne failed:", err);
    }
  }

  if (col) {
    try {
      const { _id, ...docToInsert } = newPayment;
      void _id;
      const res = await col.insertOne({
        ...docToInsert,
        createdAt: now,
      } as Document);
      newPayment._id = res.insertedId.toString();
    } catch (err) {
      console.error("[payment-history] MongoDB insert failed:", err);
    }
  }

  if (!newPayment._id) {
    newPayment._id = Date.now().toString();
  }

  if (!col) {
    try {
      const store = await readStore();
      const history = (store.paymentHistory ?? []) as unknown as PaymentHistory[];
      history.push(newPayment);
      store.paymentHistory = history;
      await writeStore(store);
    } catch (err) {
      console.error("[payment-history] writeStore sync failed:", err);
    }
  }

  return newPayment;
}

export async function getPaymentHistoryByUserId(userId: string): Promise<PaymentHistory[]> {
  const cleanId = String(userId || "").trim();
  if (!cleanId) return [];

  const col = await getPaymentHistoryCollection();
  if (col) {
    try {
      const docs = await col.find({ userId: cleanId }).sort({ createdAt: -1 }).limit(100).toArray();
      return docs.map((doc) => ({
        _id: doc._id.toString(),
        userEmail: String(doc.userEmail || ""),
        userName: doc.userName ? String(doc.userName) : undefined,
        userId: String(doc.userId || ""),
        transactionId: String(doc.transactionId || ""),
        upiId: String(doc.upiId || ""),
        upiName: doc.upiName ? String(doc.upiName) : undefined,
        coins: Number(doc.coins || 0),
        amount: Number(doc.amount || 0),
        discount: doc.discount ? Number(doc.discount) : undefined,
        finalAmount: Number(doc.finalAmount ?? doc.amount ?? 0),
        couponCode: doc.couponCode ? String(doc.couponCode) : undefined,
        paymentRequestId: String(doc.paymentRequestId || ""),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || new Date().toISOString()),
      }));
    } catch (err) {
      console.error("[payment-history] getByUserId failed:", err);
    }
  }

  const store = await readStore();
  const history = (store.paymentHistory ?? []) as unknown as PaymentHistory[];
  return history
    .filter((p) => String(p.userId) === cleanId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPaymentHistoryByEmail(email: string): Promise<PaymentHistory[]> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return [];

  const col = await getPaymentHistoryCollection();
  if (col) {
    try {
      const docs = await col.find({ userEmail: cleanEmail }).sort({ createdAt: -1 }).limit(100).toArray();
      return docs.map((doc) => ({
        _id: doc._id.toString(),
        userEmail: String(doc.userEmail || ""),
        userName: doc.userName ? String(doc.userName) : undefined,
        userId: String(doc.userId || ""),
        transactionId: String(doc.transactionId || ""),
        upiId: String(doc.upiId || ""),
        upiName: doc.upiName ? String(doc.upiName) : undefined,
        coins: Number(doc.coins || 0),
        amount: Number(doc.amount || 0),
        discount: doc.discount ? Number(doc.discount) : undefined,
        finalAmount: Number(doc.finalAmount ?? doc.amount ?? 0),
        couponCode: doc.couponCode ? String(doc.couponCode) : undefined,
        paymentRequestId: String(doc.paymentRequestId || ""),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || new Date().toISOString()),
      }));
    } catch (err) {
      console.error("[payment-history] getByEmail failed:", err);
    }
  }

  const store = await readStore();
  const history = (store.paymentHistory ?? []) as unknown as PaymentHistory[];
  return history
    .filter((p) => p.userEmail.toLowerCase() === cleanEmail)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTotalPaymentAmount(): Promise<number> {
  const col = await getPaymentHistoryCollection();
  if (col) {
    try {
      const res = await col.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).toArray();
      if (res.length > 0 && typeof res[0].total === "number") {
        return res[0].total;
      }
      return 0;
    } catch (err) {
      console.error("[payment-history] getTotalPaymentAmount aggregation failed:", err);
    }
  }

  const history = await listPaymentHistory();
  return history.reduce((sum, p) => sum + p.amount, 0);
}

export async function getTotalCoinsIssued(): Promise<number> {
  const col = await getPaymentHistoryCollection();
  if (col) {
    try {
      const res = await col.aggregate([
        { $group: { _id: null, total: { $sum: "$coins" } } }
      ]).toArray();
      if (res.length > 0 && typeof res[0].total === "number") {
        return res[0].total;
      }
      return 0;
    } catch (err) {
      console.error("[payment-history] getTotalCoinsIssued aggregation failed:", err);
    }
  }

  const history = await listPaymentHistory();
  return history.reduce((sum, p) => sum + p.coins, 0);
}

export async function deletePaymentHistory(options: {
  all?: boolean;
  startDate?: string;
  endDate?: string;
  id?: string;
}): Promise<{ deletedCount: number }> {
  let deletedCount = 0;
  const col = await getPaymentHistoryCollection();

  if (options.all) {
    if (col) {
      try {
        const res = await col.deleteMany({});
        deletedCount = res.deletedCount;
      } catch (err) {
        console.error("[payment-history] MongoDB deleteMany all failed:", err);
      }
    }
    try {
      const store = await readStore();
      if (!deletedCount) {
        deletedCount = (store.paymentHistory ?? []).length;
      }
      store.paymentHistory = [];
      await writeStore(store);
    } catch (err) {
      console.error("[payment-history] store delete all failed:", err);
    }
    return { deletedCount };
  }

  if (options.id) {
    const id = options.id.trim();
    if (col) {
      try {
        const query = ObjectId.isValid(id)
          ? { _id: new ObjectId(id) }
          : { $or: [{ _id: id as unknown as ObjectId }, { transactionId: id }] };
        const res = await col.deleteOne(query);
        deletedCount = res.deletedCount;
      } catch (err) {
        console.error("[payment-history] MongoDB deleteById failed:", err);
      }
    }
    try {
      const store = await readStore();
      const list = (store.paymentHistory ?? []) as unknown as PaymentHistory[];
      const idx = list.findIndex((p) => p._id === id || p.transactionId === id);
      if (idx !== -1) {
        list.splice(idx, 1);
        store.paymentHistory = list;
        await writeStore(store);
        if (!deletedCount) deletedCount = 1;
      }
    } catch (err) {
      console.error("[payment-history] store deleteById failed:", err);
    }
    return { deletedCount };
  }

  const startD = options.startDate ? new Date(`${options.startDate}T00:00:00.000Z`) : null;
  const endD = options.endDate ? new Date(`${options.endDate}T23:59:59.999Z`) : null;

  if (startD || endD) {
    if (col) {
      try {
        const dateFilters: Record<string, unknown>[] = [];

        const objCond: Record<string, unknown> = {};
        if (startD) objCond.$gte = startD;
        if (endD) objCond.$lte = endD;
        dateFilters.push({ createdAt: objCond });

        const strCond: Record<string, unknown> = {};
        if (startD) strCond.$gte = startD.toISOString();
        if (endD) strCond.$lte = endD.toISOString();
        dateFilters.push({ createdAt: strCond });

        const res = await col.deleteMany({ $or: dateFilters });
        deletedCount = res.deletedCount;
      } catch (err) {
        console.error("[payment-history] MongoDB deleteByDate failed:", err);
      }
    }

    try {
      const store = await readStore();
      const originalLen = (store.paymentHistory ?? []).length;
      const filtered = ((store.paymentHistory ?? []) as unknown as PaymentHistory[]).filter((p) => {
        const t = new Date(p.createdAt).getTime();
        if (isNaN(t)) return false;
        if (startD && t < startD.getTime()) return true;
        if (endD && t > endD.getTime()) return true;
        return false;
      });
      store.paymentHistory = filtered;
      await writeStore(store);
      if (!deletedCount) {
        deletedCount = originalLen - filtered.length;
      }
    } catch (err) {
      console.error("[payment-history] store deleteByDate failed:", err);
    }
  }

  return { deletedCount };
}

