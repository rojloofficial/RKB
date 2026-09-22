import "server-only";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { readStore, writeStore } from "@/lib/persist";
import { getDb } from "@/lib/db";

export type SubAdmin = {
  _id: string;
  email: string;
  passwordHash: string;
  sessionToken?: string;
  permissions: string[];
  role?: "main" | "subadmin";
  lastLogin: string | null;
  createdAt: string;
};

export type SubAdminInput = {
  email: string;
  password: string;
  permissions: string[];
};

export type SubAdminUpdateInput = {
  email?: string;
  password?: string;
  permissions?: string[];
};

async function hashPasswordSecure(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

function sanitizeSubAdmin(doc: SubAdmin | Record<string, unknown>): SubAdmin {
  return {
    _id: String(doc._id || (doc as Record<string, unknown>).id),
    email: String(doc.email || "").toLowerCase().trim(),
    passwordHash: String(doc.passwordHash || ""),
    sessionToken: doc.sessionToken ? String(doc.sessionToken) : undefined,
    permissions: Array.isArray(doc.permissions) ? doc.permissions.map(String) : [],
    role: doc.role === "main" ? "main" : "subadmin",
    lastLogin: doc.lastLogin ? String(doc.lastLogin) : null,
    createdAt: doc.createdAt ? String(doc.createdAt) : new Date().toISOString(),
  };
}

export async function listSubAdmins(): Promise<SubAdmin[]> {
  try {
    const db = await getDb();
    if (db) {
      const col = db.collection<SubAdmin>("subadmins");
      const docs = await col.find({ role: { $ne: "main" } }).toArray();
      if (docs && docs.length > 0) {
        return docs.map(sanitizeSubAdmin);
      }
      // If MongoDB collection is empty, check store and seed if available
      const store = await readStore();
      const storeAdmins = (store.admins ?? []).filter(
        (a) => (a as SubAdmin).role !== "main"
      ) as SubAdmin[];
      if (storeAdmins.length > 0) {
        await col.insertMany(storeAdmins.map((a) => ({ ...a })));
        return storeAdmins.map(sanitizeSubAdmin);
      }
      return [];
    }
  } catch (err) {
    console.error("[admin-user] listSubAdmins Mongo error, falling back to store:", err);
  }

  const store = await readStore();
  return (store.admins ?? []).filter(
    (a) => (a as SubAdmin).role !== "main"
  ) as SubAdmin[];
}

export async function getSubAdminById(id: string): Promise<SubAdmin | null> {
  if (!id) return null;
  try {
    const db = await getDb();
    if (db) {
      const doc = await db.collection<SubAdmin>("subadmins").findOne({ _id: id });
      if (doc) return sanitizeSubAdmin(doc);
    }
  } catch (err) {
    console.error("[admin-user] getSubAdminById Mongo error:", err);
  }

  const store = await readStore();
  const found = (store.admins ?? []).find(
    (a) => a._id === id && (a as SubAdmin).role !== "main"
  );
  return found ? (found as SubAdmin) : null;
}

export async function getSubAdminByEmail(
  email: string
): Promise<SubAdmin | null> {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const db = await getDb();
    if (db) {
      const doc = await db.collection<SubAdmin>("subadmins").findOne({
        email: normalizedEmail,
        role: { $ne: "main" },
      });
      if (doc) return sanitizeSubAdmin(doc);
    }
  } catch (err) {
    console.error("[admin-user] getSubAdminByEmail Mongo error:", err);
  }

  const store = await readStore();
  const found = (store.admins ?? []).find(
    (a) =>
      String(a.email).toLowerCase() === normalizedEmail &&
      (a as SubAdmin).role !== "main"
  );
  return found ? (found as SubAdmin) : null;
}

export async function getSubAdminBySession(
  token: string
): Promise<SubAdmin | null> {
  if (!token) return null;
  try {
    const db = await getDb();
    if (db) {
      const doc = await db.collection<SubAdmin>("subadmins").findOne({
        sessionToken: token,
        role: { $ne: "main" },
      });
      if (doc) return sanitizeSubAdmin(doc);
    }
  } catch (err) {
    console.error("[admin-user] getSubAdminBySession Mongo error:", err);
  }

  const store = await readStore();
  const found = (store.admins ?? []).find(
    (a) => a.sessionToken === token && (a as SubAdmin).role !== "main"
  );
  return found ? (found as SubAdmin) : null;
}

export async function getAdminByEmail(
  email: string
): Promise<SubAdmin | null> {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const db = await getDb();
    if (db) {
      const doc = await db.collection<SubAdmin>("subadmins").findOne({ email: normalizedEmail });
      if (doc) return sanitizeSubAdmin(doc);
    }
  } catch (err) {
    console.error("[admin-user] getAdminByEmail Mongo error:", err);
  }

  const store = await readStore();
  const found = (store.admins ?? []).find(
    (a) => String(a.email).toLowerCase() === normalizedEmail
  );
  return found ? (found as SubAdmin) : null;
}

export async function getAdminBySession(
  token: string
): Promise<SubAdmin | null> {
  if (!token) return null;
  try {
    const db = await getDb();
    if (db) {
      const doc = await db.collection<SubAdmin>("subadmins").findOne({ sessionToken: token });
      if (doc) return sanitizeSubAdmin(doc);
    }
  } catch (err) {
    console.error("[admin-user] getAdminBySession Mongo error:", err);
  }

  const store = await readStore();
  const found = (store.admins ?? []).find((a) => a.sessionToken === token);
  return found ? (found as SubAdmin) : null;
}

export async function ensureMainAdmin(
  email: string,
  passwordHash: string
): Promise<SubAdmin> {
  const store = await readStore();
  const admins = (store.admins ?? []) as SubAdmin[];
  const normalizedEmail = email.trim().toLowerCase();

  const existing = admins.find(
    (a) => a.role === "main" && a.email.toLowerCase() === normalizedEmail
  );

  if (existing) {
    const token = randomUUID();
    const updated: SubAdmin = {
      ...existing,
      sessionToken: token,
      lastLogin: new Date().toISOString(),
    };
    const idx = admins.findIndex((a) => a._id === existing._id);
    admins[idx] = updated;
    store.admins = admins;
    await writeStore(store);

    try {
      const db = await getDb();
      if (db) {
        await db.collection<SubAdmin>("subadmins").updateOne(
          { _id: existing._id },
          { $set: updated },
          { upsert: true }
        );
      }
    } catch {}

    return updated;
  }

  const record: SubAdmin = {
    _id: `main_${randomUUID()}`,
    email: normalizedEmail,
    passwordHash,
    role: "main",
    permissions: [],
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    sessionToken: randomUUID(),
  };
  admins.push(record);
  store.admins = admins;
  await writeStore(store);

  try {
    const db = await getDb();
    if (db) {
      await db.collection<SubAdmin>("subadmins").updateOne(
        { _id: record._id },
        { $set: record },
        { upsert: true }
      );
    }
  } catch {}

  return record;
}

export async function createSubAdmin(
  input: SubAdminInput
): Promise<SubAdmin> {
  const email = input.email.trim().toLowerCase();
  const existing = await getAdminByEmail(email);
  if (existing) {
    throw new Error("An admin with this email already exists.");
  }

  const store = await readStore();
  const admins = (store.admins ?? []) as SubAdmin[];

  const record: SubAdmin = {
    _id: `sub_${randomUUID()}`,
    email,
    passwordHash: await hashPasswordSecure(input.password),
    permissions: input.permissions,
    role: "subadmin",
    lastLogin: null,
    createdAt: new Date().toISOString(),
  };

  admins.push(record);
  store.admins = admins;
  await writeStore(store);

  try {
    const db = await getDb();
    if (db) {
      await db.collection<SubAdmin>("subadmins").insertOne({ ...record });
    }
  } catch (err) {
    console.error("[admin-user] createSubAdmin Mongo write error:", err);
  }

  return record;
}

export async function updateSubAdmin(
  id: string,
  input: SubAdminUpdateInput
): Promise<SubAdmin> {
  const current = await getSubAdminById(id);
  if (!current) {
    throw new Error("Sub-admin not found.");
  }

  const updates: Partial<SubAdmin> = {};

  if (input.email !== undefined) {
    const newEmail = input.email.trim().toLowerCase();
    if (!newEmail) {
      throw new Error("Email cannot be empty.");
    }
    if (newEmail !== current.email) {
      const existing = await getAdminByEmail(newEmail);
      if (existing && existing._id !== id) {
        throw new Error("An admin with this email already exists.");
      }
      updates.email = newEmail;
    }
  }

  if (input.password !== undefined && input.password.trim().length > 0) {
    if (input.password.trim().length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    updates.passwordHash = await hashPasswordSecure(input.password.trim());
  }

  if (Array.isArray(input.permissions)) {
    updates.permissions = input.permissions.map(String);
  }

  const updatedRecord: SubAdmin = {
    ...current,
    ...updates,
  };

  // 1. Update store
  const store = await readStore();
  const admins = (store.admins ?? []) as SubAdmin[];
  const idx = admins.findIndex((a) => a._id === id);
  if (idx !== -1) {
    admins[idx] = updatedRecord;
  } else {
    admins.push(updatedRecord);
  }
  store.admins = admins;
  await writeStore(store);

  // 2. Update MongoDB collection
  try {
    const db = await getDb();
    if (db) {
      await db.collection<SubAdmin>("subadmins").updateOne(
        { _id: id },
        { $set: updatedRecord },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error("[admin-user] updateSubAdmin Mongo write error:", err);
  }

  return updatedRecord;
}

export async function deleteSubAdmin(id: string): Promise<boolean> {
  const store = await readStore();
  const admins = (store.admins ?? []) as SubAdmin[];
  const idx = admins.findIndex((a) => a._id === id);
  let removed = false;
  if (idx !== -1) {
    admins.splice(idx, 1);
    store.admins = admins;
    await writeStore(store);
    removed = true;
  }

  try {
    const db = await getDb();
    if (db) {
      const res = await db.collection<SubAdmin>("subadmins").deleteOne({ _id: id });
      if (res.deletedCount && res.deletedCount > 0) {
        removed = true;
      }
    }
  } catch (err) {
    console.error("[admin-user] deleteSubAdmin Mongo write error:", err);
  }

  return removed;
}

export async function verifyAdmin(
  email: string,
  password: string
): Promise<SubAdmin | null> {
  const admin = await getAdminByEmail(email);
  if (!admin) return null;
  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) return null;

  const passwordHash = admin.passwordHash.startsWith("$2")
    ? admin.passwordHash
    : await hashPasswordSecure(password);
  const token = randomUUID();
  const updatedAdmin: SubAdmin = {
    ...admin,
    lastLogin: new Date().toISOString(),
    sessionToken: token,
    passwordHash,
  };

  // 1. Update in-store
  const store = await readStore();
  const admins = (store.admins ?? []) as SubAdmin[];
  const idx = admins.findIndex((a) => a._id === admin._id);
  if (idx !== -1) {
    admins[idx] = updatedAdmin;
  } else {
    admins.push(updatedAdmin);
  }
  store.admins = admins;
  await writeStore(store);

  // 2. Update MongoDB
  try {
    const db = await getDb();
    if (db) {
      await db.collection<SubAdmin>("subadmins").updateOne(
        { _id: admin._id },
        { $set: updatedAdmin },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error("[admin-user] verifyAdmin Mongo update error:", err);
  }

  return updatedAdmin;
}

export async function verifySubAdmin(
  email: string,
  password: string
): Promise<SubAdmin | null> {
  return verifyAdmin(email, password);
}
