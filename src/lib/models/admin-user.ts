import "server-only";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { readStore, writeStore } from "@/lib/persist";

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

async function hashPasswordSecure(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function listSubAdmins(): Promise<SubAdmin[]> {
  const store = await readStore();
  return (store.admins ?? []).filter(
    (a) => (a as SubAdmin).role !== "main"
  ) as SubAdmin[];
}

export async function getSubAdminByEmail(
  email: string
): Promise<SubAdmin | null> {
  const store = await readStore();
  const found = (store.admins ?? []).find(
    (a) =>
      String(a.email).toLowerCase() === email.trim().toLowerCase() &&
      (a as SubAdmin).role !== "main"
  );
  return found ? (found as SubAdmin) : null;
}

export async function getSubAdminBySession(
  token: string
): Promise<SubAdmin | null> {
  if (!token) return null;
  const store = await readStore();
  const found = (store.admins ?? []).find(
    (a) => a.sessionToken === token && (a as SubAdmin).role !== "main"
  );
  return found ? (found as SubAdmin) : null;
}

export async function getAdminByEmail(
  email: string
): Promise<SubAdmin | null> {
  const store = await readStore();
  const found = (store.admins ?? []).find(
    (a) => String(a.email).toLowerCase() === email.trim().toLowerCase()
  );
  return found ? (found as SubAdmin) : null;
}

export async function getAdminBySession(
  token: string
): Promise<SubAdmin | null> {
  if (!token) return null;
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
  return record;
}

export async function createSubAdmin(
  input: SubAdminInput
): Promise<SubAdmin> {
  const store = await readStore();
  const admins = (store.admins ?? []) as SubAdmin[];
  const email = input.email.trim().toLowerCase();
  if (admins.some((a) => a.email.toLowerCase() === email)) {
    throw new Error("An admin with this email already exists.");
  }
  const record: SubAdmin = {
    _id: `sub_${randomUUID()}`,
    email,
    passwordHash: await hashPasswordSecure(input.password),
    permissions: input.permissions,
    lastLogin: null,
    createdAt: new Date().toISOString(),
  };
  admins.push(record);
  store.admins = admins;
  await writeStore(store);
  return record;
}

export async function deleteSubAdmin(id: string): Promise<boolean> {
  const store = await readStore();
  const admins = (store.admins ?? []) as SubAdmin[];
  const idx = admins.findIndex((a) => a._id === id);
  if (idx === -1) return false;
  admins.splice(idx, 1);
  store.admins = admins;
  await writeStore(store);
  return true;
}

export async function verifyAdmin(
  email: string,
  password: string
): Promise<SubAdmin | null> {
  const admin = await getAdminByEmail(email);
  if (!admin) return null;
  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) return null;

  const store = await readStore();
  const admins = (store.admins ?? []) as SubAdmin[];
  const idx = admins.findIndex((a) => a._id === admin._id);
  if (idx === -1) return null;
  const passwordHash = admin.passwordHash.startsWith("$2")
    ? admin.passwordHash
    : await hashPasswordSecure(password);
  const token = randomUUID();
  admins[idx] = {
    ...admins[idx],
    lastLogin: new Date().toISOString(),
    sessionToken: token,
    passwordHash,
  };
  store.admins = admins;
  await writeStore(store);
  return admins[idx] as SubAdmin;
}

export async function verifySubAdmin(
  email: string,
  password: string
): Promise<SubAdmin | null> {
  return verifyAdmin(email, password);
}
