import "server-only";

import { Collection, Document, ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { getDb } from "../db";
import { readStore, writeStore } from "../persist";

export interface User {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  coins?: number;
  passwordHash: string;
  sessionToken?: string;
  emailVerified?: boolean;
  otpHash?: string;
  otpHashes?: string[];
  otpExpires?: Date;
  otpAttempts?: number;
  otpLastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicUser = Omit<User, "passwordHash">;

export function normalizeEmail(email: string | null | undefined): string {
  let val = String(email ?? "").trim().toLowerCase();
  if (!val) return "";
  // Auto-correct common domain typos (e.g. .ocm -> .com, gamil -> gmail)
  val = val.replace(/@gmail\.ocm$/i, "@gmail.com");
  val = val.replace(/@gamil\.com$/i, "@gmail.com");
  val = val.replace(/@gmai\.com$/i, "@gmail.com");
  val = val.replace(/@gmial\.com$/i, "@gmail.com");
  val = val.replace(/@gmaill\.com$/i, "@gmail.com");
  val = val.replace(/@gmail\.co$/i, "@gmail.com");
  val = val.replace(/@yahoo\.ocm$/i, "@yahoo.com");
  val = val.replace(/@yaho\.com$/i, "@yahoo.com");
  val = val.replace(/@hotmail\.ocm$/i, "@hotmail.com");
  val = val.replace(/@hotmial\.com$/i, "@hotmail.com");
  val = val.replace(/\.ocm$/i, ".com");
  val = val.replace(/\.con$/i, ".com");
  val = val.replace(/\.cmo$/i, ".com");
  return val;
}

// --- File-backed fallback (used when MongoDB is unreachable) ---
async function memoryFindByEmail(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const store = await readStore();
  const rawClean = email.trim().toLowerCase();
  const user = store.users.find((u) => {
    const uEmail = String(u.email || "").trim().toLowerCase();
    return uEmail === normalized || uEmail === rawClean || normalizeEmail(uEmail) === normalized;
  }) as unknown as User | undefined;

  if (user) {
    return {
      ...user,
      _id: String(user._id || ""),
      email: String(user.email || normalized).toLowerCase(),
    };
  }
  return null;
}

async function memoryFindById(id: string): Promise<User | null> {
  if (!id) return null;
  const store = await readStore();
  const user = store.users.find((u) => String(u._id) === String(id)) as unknown as User | undefined;
  if (user) {
    return {
      ...user,
      _id: String(user._id || ""),
      email: String(user.email || "").toLowerCase(),
    };
  }
  return null;
}

async function memoryFindBySessionToken(
  token: string
): Promise<User | null> {
  if (!token) return null;
  const store = await readStore();
  const user = store.users.find((u) => u.sessionToken === token) as unknown as User | undefined;
  if (user) {
    return {
      ...user,
      _id: String(user._id || ""),
      email: String(user.email || "").toLowerCase(),
    };
  }
  return null;
}

async function memoryCreateUser(
  data: Omit<User, "_id" | "createdAt" | "updatedAt">
): Promise<PublicUser> {
  const store = await readStore();
  const now = new Date();
  const user: User = {
    _id: `mem_${store.users.length + 1}_${Date.now()}`,
    ...data,
    email: normalizeEmail(data.email),
    coins: Number((data as User).coins ?? 0),
    createdAt: now,
    updatedAt: now,
  };
  store.users.push(user as unknown as (typeof store.users)[number]);
  await writeStore(store);
  return toPublicUser(user);
}

let userIndexesCreated = false;

async function getUsersCollection(): Promise<Collection<Document> | null> {
  const db = await getDb();
  if (!db) return null;

  const collection = db.collection("users");
  if (!userIndexesCreated) {
    try {
      await collection.createIndexes([
        { key: { email: 1 }, name: "email_unique", unique: true },
        { key: { sessionToken: 1 }, name: "session_token_idx" },
      ]);
      userIndexesCreated = true;
    } catch {
      // Non-fatal: indexes may already exist or be unavailable.
    }
  }
  return collection;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  try {
    const collection = await getUsersCollection();
    if (collection) {
      const emailEscaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rawClean = email.trim().toLowerCase();
      const rawEscaped = rawClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const doc = await collection.findOne({
        $or: [
          { email: normalized },
          { email: rawClean },
          { email: email.trim() },
          { email: { $regex: new RegExp(`^${emailEscaped}$`, "i") } },
          { email: { $regex: new RegExp(`^${rawEscaped}$`, "i") } },
        ],
      });
      if (doc) {
        return {
          ...(doc as unknown as User),
          _id: doc._id?.toString(),
          email: String(doc.email || normalized).toLowerCase(),
        };
      }
    }
  } catch (err) {
    console.warn("[user.ts] findUserByEmail MongoDB error, falling back to store:", err);
  }

  return memoryFindByEmail(normalized);
}

export async function findUserById(id: string): Promise<User | null> {
  if (!id) return null;

  try {
    const collection = await getUsersCollection();
    if (collection) {
      let query: Record<string, unknown> = { _id: id };
      if (ObjectId.isValid(id)) {
        query = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
      }
      const doc = await collection.findOne(query);
      if (doc) {
        return {
          ...(doc as unknown as User),
          _id: doc._id?.toString(),
          email: String(doc.email || "").toLowerCase(),
        };
      }
    }
  } catch (err) {
    console.warn("[user.ts] findUserById MongoDB error, falling back to store:", err);
  }

  return memoryFindById(id);
}

export async function findUserBySessionToken(
  token: string
): Promise<User | null> {
  if (!token) return null;

  try {
    const collection = await getUsersCollection();
    if (collection) {
      const doc = await collection.findOne({ sessionToken: token });
      if (doc) {
        return {
          ...(doc as unknown as User),
          _id: doc._id?.toString(),
          email: String(doc.email || "").toLowerCase(),
        };
      }
    }
  } catch (err) {
    console.warn("[user.ts] findUserBySessionToken MongoDB error, falling back to store:", err);
  }

  return memoryFindBySessionToken(token);
}

export async function createUser(
  user: Omit<User, "_id" | "createdAt" | "updatedAt">
): Promise<PublicUser> {
  const normalized = normalizeEmail(user.email);
  const now = new Date();
  const doc: User = {
    ...user,
    email: normalized,
    coins: Number((user as User).coins ?? 0),
    createdAt: now,
    updatedAt: now,
  };

  let insertedId: string | null = null;
  try {
    const collection = await getUsersCollection();
    if (collection) {
      try {
        const result = await collection.insertOne(doc as unknown as Document);
        if (result?.insertedId) {
          insertedId = result.insertedId.toString();
          doc._id = insertedId;
        }
      } catch (insertErr: unknown) {
        const errMsg = String(insertErr);
        if (errMsg.includes("E11000") || errMsg.includes("duplicate")) {
          const existing = await collection.findOne({ email: normalized });
          if (existing && existing._id) {
            return toPublicUser(existing as unknown as User);
          }
        }
        console.warn("[user.ts] createUser insert error, falling back to store:", insertErr);
      }
    }
  } catch (err) {
    console.warn("[user.ts] createUser collection error, falling back to store:", err);
  }

  // Always also write to store.users so in-memory store and MongoDB stay 100% in sync
  try {
    const store = await readStore();
    if (!doc._id) {
      doc._id = `mem_${store.users.length + 1}_${Date.now()}`;
    }
    const existingIdx = store.users.findIndex((u) => {
      const uEmail = String(u.email || "").trim().toLowerCase();
      return uEmail === normalized || normalizeEmail(uEmail) === normalized;
    });
    if (existingIdx >= 0) {
      store.users[existingIdx] = doc as unknown as (typeof store.users)[number];
    } else {
      store.users.push(doc as unknown as (typeof store.users)[number]);
    }
    await writeStore(store);
  } catch (err) {
    console.warn("[user.ts] createUser store sync error:", err);
  }

  return toPublicUser(doc);
}

export async function issueUserSession(userId: string): Promise<string | null> {
  const token = randomBytes(32).toString("hex");
  const ok = await setUserSession(userId, token);
  return ok ? token : null;
}

export async function setUserSession(
  userId: string,
  token: string
): Promise<boolean> {
  let mongoSuccess = false;
  try {
    const collection = await getUsersCollection();
    if (collection) {
      const filters: Record<string, unknown>[] = [];
      if (ObjectId.isValid(userId)) {
        filters.push({ _id: new ObjectId(userId) });
      }
      filters.push({ _id: userId });

      const query = filters.length === 1 ? filters[0] : { $or: filters };
      const result = await collection.findOneAndUpdate(
        query,
        {
          $set: {
            sessionToken: token,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );
      if (result) mongoSuccess = true;
    }
  } catch (err) {
    console.warn("[user.ts] setUserSession MongoDB error, falling back to store:", err);
  }

  let storeSuccess = false;
  try {
    const store = await readStore();
    const user = store.users.find((u) => String(u._id) === String(userId)) as User | undefined;
    if (user) {
      user.sessionToken = token;
      user.updatedAt = new Date();
      await writeStore(store);
      storeSuccess = true;
    }
  } catch (err) {
    console.warn("[user.ts] setUserSession store error:", err);
  }

  return mongoSuccess || storeSuccess;
}

export async function clearUserSession(token: string): Promise<void> {
  if (!token) return;

  try {
    const collection = await getUsersCollection();
    if (collection) {
      await collection.updateOne(
        { sessionToken: token },
        {
          $unset: { sessionToken: "" },
          $set: { updatedAt: new Date() },
        }
      );
      return;
    }
  } catch (err) {
    console.warn("[user.ts] clearUserSession MongoDB error, falling back to store:", err);
  }

  const store = await readStore();
  const user = store.users.find((u) => u.sessionToken === token) as
    | User
    | undefined;
  if (user) {
    delete user.sessionToken;
    user.updatedAt = new Date();
    await writeStore(store);
  }
}

export async function listUsers(): Promise<PublicUser[]> {
  const collection = await getUsersCollection();
  if (!collection) {
    const store = await readStore();
    return store.users.map(
      (u) => toPublicUser(u as unknown as User)
    );
  }

  const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();
  return docs.map((doc) => toPublicUser(doc as unknown as User));
}

export async function updateUserCoins(
  userId: string,
  delta: number,
  userEmail?: string
): Promise<boolean> {
  const numericDelta = Number(delta || 0);
  if (!Number.isFinite(numericDelta)) return false;

  let mongoSuccess = false;
  const collection = await getUsersCollection();
  if (collection) {
    try {
      const filters: Record<string, unknown>[] = [];
      if (userId) {
        if (ObjectId.isValid(userId)) {
          filters.push({ _id: new ObjectId(userId) });
        }
        filters.push({ _id: userId });
      }
      if (userEmail) {
        const cleanEmail = normalizeEmail(userEmail);
        if (cleanEmail) {
          filters.push({ email: cleanEmail });
          filters.push({
            email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          });
        }
      }

      if (filters.length > 0) {
        const query = filters.length === 1 ? filters[0] : { $or: filters };
        const result = await collection.findOneAndUpdate(
          query,
          {
            $inc: { coins: numericDelta },
            $set: { updatedAt: new Date() },
          },
          { returnDocument: "after" }
        );
        if (result) mongoSuccess = true;
      }
    } catch (err) {
      console.error("[user.ts] updateUserCoins MongoDB error:", err);
    }
  }

  // Also sync to store.users so in-memory / local state stays completely up-to-date
  let storeSuccess = false;
  try {
    const store = await readStore();
    const user = store.users.find(
      (u) =>
        (userId && u._id === userId) ||
        (userEmail && normalizeEmail(String(u.email)) === normalizeEmail(userEmail))
    ) as User | undefined;
    if (user) {
      const currentCoins = Number(user.coins ?? 0);
      const nextCoins = currentCoins + numericDelta;
      user.coins = nextCoins;
      user.updatedAt = new Date();
      await writeStore(store);
      storeSuccess = true;
    }
  } catch (err) {
    console.error("[user.ts] updateUserCoins store error:", err);
  }

  return mongoSuccess || storeSuccess;
}

export async function deleteUserById(id: string): Promise<boolean> {
  if (!id) return false;

  try {
    const collection = await getUsersCollection();
    if (collection && ObjectId.isValid(id)) {
      const _id = new ObjectId(id);
      const result = await collection.deleteOne({ _id });
      if (result.deletedCount > 0) return true;
    }
  } catch (err) {
    console.warn("[user.ts] deleteUserById MongoDB error, falling back to store:", err);
  }

  const store = await readStore();
  const index = store.users.findIndex((u) => u._id === id);
  if (index < 0) return false;
  store.users.splice(index, 1);
  await writeStore(store);
  return true;
}

export const deleteUser = deleteUserById;

export async function updateUserFields(
  userId: string,
  fields: Record<string, unknown>,
  userEmail?: string
): Promise<boolean> {
  if (!userId && !userEmail) return false;

  let mongoSuccess = false;
  try {
    const collection = await getUsersCollection();
    if (collection) {
      const filters: Record<string, unknown>[] = [];
      if (userId) {
        if (ObjectId.isValid(userId)) {
          filters.push({ _id: new ObjectId(userId) });
        }
        filters.push({ _id: userId });
      }
      if (userEmail) {
        filters.push({ email: normalizeEmail(userEmail) });
      }
      if (fields.email) {
        filters.push({ email: normalizeEmail(String(fields.email)) });
      }

      if (filters.length > 0) {
        const query = filters.length === 1 ? filters[0] : { $or: filters };
        const result = await collection.findOneAndUpdate(
          query,
          { $set: { ...fields, updatedAt: new Date() } },
          { returnDocument: "after" }
        );
        if (result) mongoSuccess = true;
      }
    }
  } catch (err) {
    console.warn("[user.ts] updateUserFields MongoDB error:", err);
  }

  let storeSuccess = false;
  try {
    const store = await readStore();
    const user = store.users.find(
      (u) =>
        (userId && String(u._id) === String(userId)) ||
        (userEmail && normalizeEmail(String(u.email)) === normalizeEmail(userEmail)) ||
        (fields.email && normalizeEmail(String(u.email)) === normalizeEmail(String(fields.email)))
    ) as User | undefined;
    if (user) {
      Object.assign(user, fields, { updatedAt: new Date() });
      await writeStore(store);
      storeSuccess = true;
    }
  } catch (err) {
    console.warn("[user.ts] updateUserFields store error:", err);
  }

  return mongoSuccess || storeSuccess;
}

/**
 * Store an OTP hash + expiry for a user, and record the time it was sent so we
 * can enforce the resend cooldown. Generating a new OTP resets the attempt count
 * and retains the last 3 hashes to avoid invalidating in-flight emails.
 */
export async function setUserOtp(
  userId: string,
  otpHash: string,
  ttlMs: number
): Promise<boolean> {
  const expiresAt = new Date(Date.now() + ttlMs);
  const now = new Date();
  const collection = await getUsersCollection();

  if (collection && ObjectId.isValid(userId)) {
    try {
      const _id = new ObjectId(userId);
      const result = await collection.findOneAndUpdate(
        { _id },
        {
          $set: {
            otpHash,
            otpExpires: expiresAt,
            otpAttempts: 0,
            otpLastSentAt: now,
            updatedAt: now,
          },
          $push: {
            otpHashes: {
              $each: [otpHash],
              $slice: -3,
            },
          } as unknown as Document,
        },
        { returnDocument: "after" }
      );
      if (result) return true;
    } catch {
      // Fallback to store
    }
  }

  const store = await readStore();
  const user = store.users.find((u) => u._id === userId) as User | undefined;
  if (!user) return false;

  user.otpHash = otpHash;
  const recentHashes = Array.isArray(user.otpHashes) ? user.otpHashes : [];
  user.otpHashes = [...recentHashes, otpHash].slice(-3);
  user.otpExpires = expiresAt;
  user.otpAttempts = 0;
  user.otpLastSentAt = now;
  user.updatedAt = now;
  await writeStore(store);
  return true;
}

/**
 * Remove stored OTPs (after successful verification, expiry, or lockout).
 */
export async function clearUserOtp(userId: string): Promise<boolean> {
  const collection = await getUsersCollection();
  const now = new Date();

  if (collection && ObjectId.isValid(userId)) {
    try {
      const _id = new ObjectId(userId);
      const result = await collection.findOneAndUpdate(
        { _id },
        {
          $set: {
            otpHash: null,
            otpHashes: [],
            otpExpires: null,
            otpAttempts: 0,
            updatedAt: now,
          },
        },
        { returnDocument: "after" }
      );
      if (result) return true;
    } catch {
      // Fallback to store
    }
  }

  const store = await readStore();
  const user = store.users.find((u) => u._id === userId) as User | undefined;
  if (!user) return false;

  user.otpHash = undefined;
  user.otpHashes = [];
  user.otpExpires = undefined;
  user.otpAttempts = 0;
  user.updatedAt = now;
  await writeStore(store);
  return true;
}

/**
 * Increment the number of failed verification attempts and return the new count.
 */
export async function incrementUserOtpAttempts(userId: string): Promise<number> {
  const collection = await getUsersCollection();

  if (collection && ObjectId.isValid(userId)) {
    try {
      const _id = new ObjectId(userId);
      const result = await collection.findOneAndUpdate(
        { _id },
        { $inc: { otpAttempts: 1 }, $set: { updatedAt: new Date() } },
        { returnDocument: "after" }
      );
      if (result && typeof result.otpAttempts === "number") {
        return result.otpAttempts;
      }
    } catch {
      // Fallback to store
    }
  }

  const store = await readStore();
  const user = store.users.find((u) => u._id === userId) as
    | User
    | undefined;
  if (!user) return 0;
  const attempts = Number(user.otpAttempts ?? 0) + 1;
  user.otpAttempts = attempts;
  user.updatedAt = new Date();
  await writeStore(store);
  return attempts;
}

/**
 * Mark a user's email as verified.
 */
export async function setUserEmailVerified(
  userId: string,
  verified = true
): Promise<boolean> {
  return updateUserFields(userId, { emailVerified: verified });
}

export function toPublicUser(user: User): PublicUser {
  return {
    _id: user._id ? String(user._id) : "",
    name: user.name,
    email: user.email,
    phone: user.phone,
    service: user.service,
    coins: Number(user.coins ?? 0),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export interface ExportUserData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  coins: number;
  service?: string;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export async function exportAllUsers(): Promise<ExportUserData[]> {
  const collection = await getUsersCollection();
  if (collection) {
    try {
      const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();
      return docs.map((doc) => ({
        id: doc._id?.toString(),
        name: String(doc.name || ""),
        email: String(doc.email || ""),
        phone: String(doc.phone || ""),
        password: String(doc.passwordHash || ""),
        coins: Number(doc.coins || 0),
        service: doc.service ? String(doc.service) : undefined,
        emailVerified: Boolean(doc.emailVerified),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || ""),
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : (doc.updatedAt ? String(doc.updatedAt) : undefined),
      }));
    } catch (err) {
      console.error("[user] exportAllUsers MongoDB query failed:", err);
    }
  }

  const store = await readStore();
  return (store.users || []).map((u) => {
    const user = u as unknown as User;
    return {
      id: user._id,
      name: String(user.name || ""),
      email: String(user.email || ""),
      phone: String(user.phone || ""),
      password: String(user.passwordHash || ""),
      coins: Number(user.coins || 0),
      service: user.service ? String(user.service) : undefined,
      emailVerified: Boolean(user.emailVerified),
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt || ""),
      updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : (user.updatedAt ? String(user.updatedAt) : undefined),
    };
  });
}

