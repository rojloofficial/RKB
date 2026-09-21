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
  return String(email ?? "").trim().toLowerCase();
}

// --- File-backed fallback (used when MongoDB is unreachable) ---
async function memoryFindByEmail(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const store = await readStore();
  return (
    (store.users.find(
      (u) => normalizeEmail(String(u.email)) === normalized
    ) as unknown as User) ?? null
  );
}

async function memoryFindById(id: string): Promise<User | null> {
  const store = await readStore();
  return (store.users.find((u) => u._id === id) as unknown as User) ?? null;
}

async function memoryFindBySessionToken(
  token: string
): Promise<User | null> {
  const store = await readStore();
  return (
    (store.users.find((u) => u.sessionToken === token) as unknown as User) ??
    null
  );
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

  const collection = await getUsersCollection();
  if (!collection) return memoryFindByEmail(normalized);

  const doc = await collection.findOne({ email: normalized });
  return (doc as unknown as User) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const collection = await getUsersCollection();
  if (!collection) return memoryFindById(id);

  let _id: ObjectId;
  try {
    _id = new ObjectId(id);
  } catch {
    return null;
  }

  const doc = await collection.findOne({ _id });
  return (doc as unknown as User) ?? null;
}

export async function findUserBySessionToken(
  token: string
): Promise<User | null> {
  if (!token) return null;

  const collection = await getUsersCollection();
  if (!collection) return memoryFindBySessionToken(token);

  const doc = await collection.findOne({ sessionToken: token });
  return (doc as unknown as User) ?? null;
}

export async function createUser(
  user: Omit<User, "_id" | "createdAt" | "updatedAt">
): Promise<PublicUser> {
  const collection = await getUsersCollection();
  if (!collection) return memoryCreateUser(user);

  const now = new Date();
  const doc = {
    ...user,
    email: normalizeEmail(user.email),
    coins: Number((user as User).coins ?? 0),
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  return {
    _id: result.insertedId.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    service: doc.service,
    coins: Number(doc.coins ?? 0),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
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
  const collection = await getUsersCollection();
  if (!collection) {
    const store = await readStore();
    const user = store.users.find((u) => u._id === userId) as User | undefined;
    if (!user) return false;
    user.sessionToken = token;
    user.updatedAt = new Date();
    await writeStore(store);
    return true;
  }

  let _id: ObjectId;
  try {
    _id = new ObjectId(userId);
  } catch {
    return false;
  }

  const result = await collection.findOneAndUpdate(
    { _id },
    {
      $set: {
        sessionToken: token,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  return Boolean(result);
}

export async function clearUserSession(token: string): Promise<void> {
  if (!token) return;

  const collection = await getUsersCollection();
  if (!collection) {
    const store = await readStore();
    const user = store.users.find((u) => u.sessionToken === token) as
      | User
      | undefined;
    if (user) {
      delete user.sessionToken;
      user.updatedAt = new Date();
      await writeStore(store);
    }
    return;
  }

  await collection.updateOne(
    { sessionToken: token },
    {
      $unset: { sessionToken: "" },
      $set: { updatedAt: new Date() },
    }
  );
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
      if (result) return true;
    }
  }

  const store = await readStore();
  const user = store.users.find(
    (u) =>
      (userId && u._id === userId) ||
      (userEmail && normalizeEmail(String(u.email)) === normalizeEmail(userEmail))
  ) as User | undefined;
  if (!user) return false;

  const currentCoins = Number(user.coins ?? 0);
  const nextCoins = currentCoins + numericDelta;
  user.coins = nextCoins;
  user.updatedAt = new Date();
  await writeStore(store);
  return true;
}

export async function deleteUser(id: string): Promise<boolean> {
  const collection = await getUsersCollection();
  if (!collection) {
    const store = await readStore();
    const index = store.users.findIndex((u) => u._id === id);
    if (index < 0) return false;
    store.users.splice(index, 1);
    await writeStore(store);
    return true;
  }

  let _id: ObjectId;
  try {
    _id = new ObjectId(id);
  } catch {
    return false;
  }

  const result = await collection.deleteOne({ _id });
  return result.deletedCount > 0;
}

export function updateUserFields(
  userId: string,
  fields: Record<string, unknown>
): Promise<boolean> {
  const collectionPromise = getUsersCollection();

  return collectionPromise.then((collection) => {
    if (!collection) {
      return readStore().then((store) => {
        const user = store.users.find((u) => u._id === userId) as
          | User
          | undefined;
        if (!user) return false;
        Object.assign(user, fields, { updatedAt: new Date() });
        return writeStore(store).then(() => true);
      });
    }

    let _id: ObjectId;
    try {
      _id = new ObjectId(userId);
    } catch {
      return false;
    }

    return collection
      .findOneAndUpdate(
        { _id },
        { $set: { ...fields, updatedAt: new Date() } },
        { returnDocument: "after" }
      )
      .then((result) => Boolean(result));
  });
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

  if (collection) {
    let _id: ObjectId;
    try {
      _id = new ObjectId(userId);
    } catch {
      return false;
    }

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
    return Boolean(result);
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

  if (collection) {
    let _id: ObjectId;
    try {
      _id = new ObjectId(userId);
    } catch {
      return false;
    }

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
    return Boolean(result);
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
  if (!collection) {
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

  let _id: ObjectId;
  try {
    _id = new ObjectId(userId);
  } catch {
    return -1;
  }

  const result = await collection.findOneAndUpdate(
    { _id },
    { $inc: { otpAttempts: 1 }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  const doc = result as unknown as { otpAttempts?: number } | null;
  return Number(doc?.otpAttempts ?? 1);
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
    _id: user._id,
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

