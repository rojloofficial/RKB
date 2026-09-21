import { cache } from "react";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { readStore, writeStore } from "@/lib/persist";

export type CityVipAssignment = {
  _id?: string;
  type?: "city" | "state";
  cityName?: string;
  citySlug?: string;
  stateName?: string;
  email: string;
  phone?: string;
  status: "pending" | "active" | "inactive" | "expired";
  assignedBy?: string;
  assignedAt: Date | string;
  expiresAt: Date | string;
  lastReminderSentAt?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
};

export type VipUser = {
  _id: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  setupToken?: string;
  setupTokenExpires?: Date | string;
  sessionToken?: string;
  lastLogin?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
};

function normalizeVipStatus(status?: string): CityVipAssignment["status"] {
  if (status === "pending") return "pending";
  if (status === "expired" || status === "inactive") return "inactive";
  return "active";
}

export async function listVipAssignments(): Promise<CityVipAssignment[]> {
  const store = await readStore();
  const vipUsers = ((store.vipUsers ?? []) as unknown as VipUser[]).filter(Boolean);
  const userPhoneMap = new Map<string, string>();
  for (const u of vipUsers) {
    if (u.email && u.phone) {
      userPhoneMap.set(u.email.toLowerCase(), u.phone);
    }
  }

  const items: CityVipAssignment[] = ((store.cityVipAssignments ?? []) as CityVipAssignment[]).map((item) => {
    const normalizedStatus = normalizeVipStatus(item.status);
    const phone = item.phone || userPhoneMap.get(item.email.toLowerCase()) || "";
    return {
      ...item,
      phone,
      status: normalizedStatus,
    };
  });

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createVipAssignment(input: {
  type?: "city" | "state";
  cityName?: string;
  citySlug?: string;
  stateName?: string;
  email: string;
  phone?: string;
  assignedBy?: string;
  expiresInDays?: number;
}): Promise<CityVipAssignment> {
  const store = await readStore();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays ?? 7));

  const cleanPhone = String(input.phone ?? "").trim();
  const assignment: CityVipAssignment = {
    _id: `vip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: input.type || (input.stateName ? "state" : "city"),
    cityName: input.cityName,
    citySlug: input.citySlug,
    stateName: input.stateName,
    email: input.email.trim().toLowerCase(),
    phone: cleanPhone,
    status: "active",
    assignedBy: input.assignedBy,
    assignedAt: new Date(),
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const items = (store.cityVipAssignments ?? []) as CityVipAssignment[];
  items.push(assignment);
  store.cityVipAssignments = items;
  await writeStore(store);

  return assignment;
}

export async function updateVipAssignment(
  id: string,
  updates: Partial<CityVipAssignment>
): Promise<CityVipAssignment | null> {
  const store = await readStore();
  const items = (store.cityVipAssignments ?? []) as CityVipAssignment[];
  const index = items.findIndex((item) => item._id === id);
  if (index === -1) return null;

  const nextStatus = updates.status ? normalizeVipStatus(updates.status) : items[index].status;

  const updated = {
    ...items[index],
    ...updates,
    status: nextStatus,
    updatedAt: new Date(),
  };

  items[index] = updated;
  store.cityVipAssignments = items;
  await writeStore(store);

  return updated;
}

export async function extendVipAssignment(
  id: string,
  days: number
): Promise<CityVipAssignment | null> {
  const store = await readStore();
  const items = (store.cityVipAssignments ?? []) as CityVipAssignment[];
  const index = items.findIndex((item) => item._id === id);
  if (index === -1) return null;

  const current = items[index];
  const nextExpiry = new Date(current.expiresAt);
  const adjustment = Number(days) || 0;
  nextExpiry.setDate(nextExpiry.getDate() + adjustment);

  const updated: CityVipAssignment = {
    ...current,
    expiresAt: nextExpiry,
    status: nextExpiry > new Date() ? "active" : "inactive",
    updatedAt: new Date(),
  };

  items[index] = updated;
  store.cityVipAssignments = items;
  await writeStore(store);

  return updated;
}

export async function deleteVipAssignment(id: string): Promise<boolean> {
  const store = await readStore();
  const items = (store.cityVipAssignments ?? []) as CityVipAssignment[];
  const index = items.findIndex((item) => item._id === id);
  if (index === -1) return false;

  items.splice(index, 1);
  store.cityVipAssignments = items;
  await writeStore(store);
  return true;
}

export async function getVipAssignmentsForEmail(email: string): Promise<CityVipAssignment[]> {
  const assignments = await listVipAssignments();
  return assignments.filter((item) => item.email.toLowerCase() === email.trim().toLowerCase());
}

export async function syncVipStatus() {
  const items = await listVipAssignments();
  const now = new Date();

  for (const item of items) {
    const expiresAt = new Date(item.expiresAt);
    if (expiresAt < now && item.status !== "inactive") {
      await updateVipAssignment(String(item._id), { status: "inactive" });
    } else if (expiresAt >= now && (item.status === "inactive" || item.status === "pending")) {
      await updateVipAssignment(String(item._id), { status: "active" });
    }
  }
}

// ---------------------------------------------------------------------------
// VIP User Authentication & Password Creation
// ---------------------------------------------------------------------------

export async function createVipSetupToken(email: string): Promise<string> {
  const store = await readStore();
  const cleanEmail = email.trim().toLowerCase();
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const vipUsers = ((store.vipUsers ?? []) as unknown as VipUser[]).filter(Boolean);
  const existingIdx = vipUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);

  if (existingIdx >= 0) {
    vipUsers[existingIdx] = {
      ...vipUsers[existingIdx],
      setupToken: token,
      setupTokenExpires: expiresAt,
      updatedAt: new Date(),
    };
  } else {
    vipUsers.push({
      _id: `vipu_${Date.now()}_${randomUUID().substring(0, 8)}`,
      email: cleanEmail,
      setupToken: token,
      setupTokenExpires: expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  store.vipUsers = vipUsers as unknown as typeof store.vipUsers;
  await writeStore(store);
  return token;
}

export async function verifyVipSetupToken(token: string, email: string): Promise<boolean> {
  if (!token || !email) return false;
  const store = await readStore();
  const cleanEmail = email.trim().toLowerCase();
  const vipUsers = (store.vipUsers ?? []) as unknown as VipUser[];
  const user = vipUsers.find(
    (u) => u.email.toLowerCase() === cleanEmail && u.setupToken === token
  );

  if (!user || !user.setupTokenExpires) return false;
  return new Date(user.setupTokenExpires).getTime() > Date.now();
}

export async function setVipPassword(
  email: string,
  token: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!password || password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  const isValid = await verifyVipSetupToken(token, email);
  if (!isValid) {
    return { success: false, error: "Invalid or expired password creation link." };
  }

  const store = await readStore();
  const cleanEmail = email.trim().toLowerCase();
  const vipUsers = (store.vipUsers ?? []) as unknown as VipUser[];
  const userIdx = vipUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  if (userIdx < 0) {
    return { success: false, error: "VIP user record not found." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  vipUsers[userIdx] = {
    ...vipUsers[userIdx],
    passwordHash,
    setupToken: undefined,
    setupTokenExpires: undefined,
    updatedAt: new Date(),
  };

  store.vipUsers = vipUsers as unknown as typeof store.vipUsers;

  // Activate pending assignments for this VIP
  const assignments = (store.cityVipAssignments ?? []) as CityVipAssignment[];
  let updatedAssignments = false;
  for (const a of assignments) {
    if (a.email.toLowerCase() === cleanEmail && a.status === "pending") {
      a.status = "active";
      a.updatedAt = new Date();
      updatedAssignments = true;
    }
  }
  if (updatedAssignments) {
    store.cityVipAssignments = assignments;
  }

  await writeStore(store);
  return { success: true };
}

export async function upsertVipUserWithPhone(
  email: string,
  phone: string
): Promise<VipUser> {
  const store = await readStore();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();
  const passwordHash = await bcrypt.hash(cleanPhone, 12);

  const vipUsers = ((store.vipUsers ?? []) as unknown as VipUser[]).filter(Boolean);
  const existingIdx = vipUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);

  if (existingIdx >= 0) {
    vipUsers[existingIdx] = {
      ...vipUsers[existingIdx],
      phone: cleanPhone,
      passwordHash,
      updatedAt: new Date(),
    };
    store.vipUsers = vipUsers as unknown as typeof store.vipUsers;
    await writeStore(store);
    return vipUsers[existingIdx];
  } else {
    const newUser: VipUser = {
      _id: `vipu_${Date.now()}_${randomUUID().substring(0, 8)}`,
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vipUsers.push(newUser);
    store.vipUsers = vipUsers as unknown as typeof store.vipUsers;
    await writeStore(store);
    return newUser;
  }
}

export function phoneMatches(inputPass: string, phoneTarget?: string): boolean {
  if (!phoneTarget) return false;
  const p1 = inputPass.trim();
  const p2 = phoneTarget.trim();
  if (p1 === p2) return true;
  const d1 = p1.replace(/\D/g, "");
  const d2 = p2.replace(/\D/g, "");
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  // Match without leading zeros
  if (d1.replace(/^0+/, "") === d2.replace(/^0+/, "")) return true;
  // Match last 10 digits for Indian and international numbers
  if (d1.length >= 10 && d2.length >= 10 && d1.slice(-10) === d2.slice(-10)) return true;
  return false;
}

export async function verifyVipCredentials(
  email: string,
  password: string
): Promise<{
  success: boolean;
  user?: VipUser;
  error?: string;
  sessionToken?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  await syncVipStatus();

  let store = await readStore();
  let vipUsers = ((store.vipUsers ?? []) as unknown as VipUser[]).filter(Boolean);
  let user = vipUsers.find((u) => u.email.toLowerCase() === cleanEmail);

  // Check assignments for this email
  const assignments = await getVipAssignmentsForEmail(cleanEmail);
  const now = new Date();

  // Any non-inactive assignment that hasn't expired counts as active
  const hasActive = assignments.some((a) => {
    const exp = new Date(a.expiresAt);
    return exp > now && a.status !== "inactive";
  });

  const assignmentWithPhone = assignments.find((a) => Boolean(a.phone));
  const phonePassword = user?.phone || assignmentWithPhone?.phone;

  if (!user && phonePassword) {
    user = await upsertVipUserWithPhone(cleanEmail, phonePassword);
    store = await readStore();
    vipUsers = ((store.vipUsers ?? []) as unknown as VipUser[]).filter(Boolean);
  }

  if (!user && !assignmentWithPhone) {
    return {
      success: false,
      error: "Invalid email or password.",
    };
  }

  // Verify password against passwordHash, user.phone, or assignment.phone
  let matches = false;
  if (user?.passwordHash) {
    matches = await bcrypt.compare(cleanPassword, user.passwordHash).catch(() => false);
  }
  if (!matches) {
    matches = phoneMatches(cleanPassword, user?.phone) || phoneMatches(cleanPassword, phonePassword);
  }
  if (!matches && assignments.length > 0) {
    matches = assignments.some((a) => phoneMatches(cleanPassword, a.phone));
  }

  if (!matches) {
    return { success: false, error: "Invalid email or password." };
  }

  // Password matched! Now verify active VIP access assignment exists
  if (!hasActive) {
    return {
      success: false,
      error: "Your VIP access is inactive or expired. Please contact support.",
    };
  }

  // If user was missing or password matched via phone, ensure user record and hash are up to date
  if (!user) {
    user = await upsertVipUserWithPhone(cleanEmail, cleanPassword);
    store = await readStore();
    vipUsers = ((store.vipUsers ?? []) as unknown as VipUser[]).filter(Boolean);
  } else if (!user.passwordHash) {
    const newHash = await bcrypt.hash(cleanPassword, 12);
    const uIdx = vipUsers.findIndex((u) => u._id === user?._id);
    if (uIdx >= 0) {
      vipUsers[uIdx].passwordHash = newHash;
    }
  }

  // Activate any pending assignment that hasn't expired
  for (const a of assignments) {
    if (a.status === "pending" && new Date(a.expiresAt) > now) {
      await updateVipAssignment(String(a._id), { status: "active" });
    }
  }

  const sessionToken = randomUUID();
  const userIdx = vipUsers.findIndex((u) => u._id === user?._id);
  if (userIdx >= 0) {
    vipUsers[userIdx] = {
      ...vipUsers[userIdx],
      sessionToken,
      lastLogin: new Date(),
      updatedAt: new Date(),
    };
  }

  store.vipUsers = vipUsers as unknown as typeof store.vipUsers;
  await writeStore(store);

  return { success: true, user, sessionToken };
}

export async function getVipBySession(sessionToken: string): Promise<VipUser | null> {
  if (!sessionToken) return null;
  const store = await readStore();
  const vipUsers = (store.vipUsers ?? []) as unknown as VipUser[];
  const user = vipUsers.find((u) => u.sessionToken === sessionToken);
  return user ?? null;
}

// ---------------------------------------------------------------------------
// Scoped Data Aggregation for VIP Control Panel
// ---------------------------------------------------------------------------

export type VipScope = {
  hasStateAccess: boolean;
  states: string[];
  cities: string[];
  assignments: CityVipAssignment[];
};

export async function getVipScope(email: string): Promise<VipScope> {
  await syncVipStatus();
  const assignments = (await getVipAssignmentsForEmail(email)).filter(
    (a) => a.status === "active"
  );

  const stateSet = new Set<string>();
  const citySet = new Set<string>();

  for (const a of assignments) {
    if (a.type === "state" && a.stateName) {
      stateSet.add(a.stateName.trim());
    } else if (a.cityName) {
      citySet.add(a.cityName.trim());
    }
  }

  const states = Array.from(stateSet);
  const hasStateAccess = states.length > 0;

  // If VIP has state access, all cities in that state are also accessible to them
  const store = await readStore();
  const allCities = [
    ...(store.cities ?? []).map((c) => ({
      name: String(c.name ?? ""),
      state: String(c.state ?? ""),
      slug: String(c.slug ?? ""),
    })),
  ];

  // Include static cities from cityPlaces
  try {
    const { cityPlaces } = await import("@/lib/places");
    for (const c of cityPlaces) {
      allCities.push({
        name: c.name,
        state: c.state ?? "",
        slug: c.slug,
      });
    }
  } catch {}

  const stateLower = new Set(states.map((s) => s.toLowerCase()));
  for (const c of allCities) {
    if (c.state && stateLower.has(c.state.toLowerCase())) {
      citySet.add(c.name);
    }
  }

  return {
    hasStateAccess,
    states,
    cities: Array.from(citySet),
    assignments,
  };
}

export async function getVipScopedStats(email: string) {
  const scope = await getVipScope(email);
  const store = await readStore();

  const cityLowerSet = new Set(scope.cities.map((c) => c.toLowerCase()));
  const stateLowerSet = new Set(scope.states.map((s) => s.toLowerCase()));

  // Filter ads within scope
  const ads = (store.ads ?? []).filter((ad) => {
    const adCity = String(ad.city ?? "").trim().toLowerCase();
    const adState = String(ad.state ?? "").trim().toLowerCase();
    return cityLowerSet.has(adCity) || (adState && stateLowerSet.has(adState));
  });

  // Filter users who posted ads within scope
  const scopedUserIds = new Set(ads.map((ad) => String(ad.userId ?? "")).filter(Boolean));
  const usersCount = scopedUserIds.size;

  return {
    statesCount: scope.states.length,
    citiesCount: scope.cities.length,
    usersCount,
    adsCount: ads.length,
    hasStateAccess: scope.hasStateAccess,
    assignments: scope.assignments,
  };
}

export async function getVipScopedStates(email: string) {
  const scope = await getVipScope(email);
  if (!scope.hasStateAccess) return [];

  const store = await readStore();
  const storeStates = (store.states ?? []).map((s) => ({
    name: String(s.name ?? ""),
    slug: String(s.slug ?? ""),
  }));

  return scope.states.map((stateName) => {
    const match = storeStates.find((s) => s.name.toLowerCase() === stateName.toLowerCase());
    return {
      name: stateName,
      slug: match?.slug || stateName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    };
  });
}

export async function getVipScopedCities(email: string) {
  const scope = await getVipScope(email);
  const store = await readStore();

  const cityMap = new Map<string, { name: string; slug: string; state: string; adCount: number }>();
  const cityLowerSet = new Set(scope.cities.map((c) => c.toLowerCase()));

  // Read cities from store
  for (const c of store.cities ?? []) {
    const name = String(c.name ?? "").trim();
    if (cityLowerSet.has(name.toLowerCase())) {
      cityMap.set(name.toLowerCase(), {
        name,
        slug: String(c.slug ?? ""),
        state: String(c.state ?? ""),
        adCount: 0,
      });
    }
  }

  // Also include static cityPlaces
  try {
    const { cityPlaces } = await import("@/lib/places");
    for (const c of cityPlaces) {
      if (cityLowerSet.has(c.name.toLowerCase()) && !cityMap.has(c.name.toLowerCase())) {
        cityMap.set(c.name.toLowerCase(), {
          name: c.name,
          slug: c.slug,
          state: c.state ?? "",
          adCount: 0,
        });
      }
    }
  } catch {}

  // Count ads per city
  for (const ad of store.ads ?? []) {
    const adCity = String(ad.city ?? "").trim().toLowerCase();
    const entry = cityMap.get(adCity);
    if (entry) {
      entry.adCount += 1;
    }
  }

  return Array.from(cityMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getVipScopedAds(email: string) {
  const scope = await getVipScope(email);
  const store = await readStore();

  const cityLowerSet = new Set(scope.cities.map((c) => c.toLowerCase()));
  const stateLowerSet = new Set(scope.states.map((s) => s.toLowerCase()));

  const ads = (store.ads ?? [])
    .filter((ad) => {
      const adCity = String(ad.city ?? "").trim().toLowerCase();
      const adState = String(ad.state ?? "").trim().toLowerCase();
      return cityLowerSet.has(adCity) || (adState && stateLowerSet.has(adState));
    })
    .map((ad) => ({
      _id: String(ad._id ?? ""),
      name: String(ad.name ?? ""),
      title: String(ad.title ?? ad.name ?? ""),
      category: String(ad.category ?? ""),
      city: String(ad.city ?? ""),
      state: String(ad.state ?? ""),
      phone: String(ad.phone ?? ""),
      status: String(ad.status ?? "active"),
      createdAt: ad.createdAt ?? new Date(),
    }));

  return ads;
}

export async function getVipScopedUsers(email: string) {
  const scope = await getVipScope(email);
  const store = await readStore();

  const cityLowerSet = new Set(scope.cities.map((c) => c.toLowerCase()));
  const stateLowerSet = new Set(scope.states.map((s) => s.toLowerCase()));

  // Map users to their ads in scope
  const userAdCounts: Record<string, number> = {};
  for (const ad of store.ads ?? []) {
    const adCity = String(ad.city ?? "").trim().toLowerCase();
    const adState = String(ad.state ?? "").trim().toLowerCase();
    if (cityLowerSet.has(adCity) || (adState && stateLowerSet.has(adState))) {
      const uid = String(ad.userId ?? "");
      if (uid) {
        userAdCounts[uid] = (userAdCounts[uid] || 0) + 1;
      }
    }
  }

  const scopedUserIds = new Set(Object.keys(userAdCounts));
  const users = (store.users ?? [])
    .filter((u) => scopedUserIds.has(String(u._id ?? "")))
    .map((u) => ({
      _id: String(u._id ?? ""),
      name: String(u.name ?? ""),
      email: String(u.email ?? ""),
      phone: String(u.phone ?? ""),
      coins: Number((u as { coins?: number }).coins ?? 0),
      adCount: userAdCounts[String(u._id ?? "")] || 0,
      createdAt: u.createdAt ?? new Date(),
    }));

  return users;
}

export type VipPhoneOverride = {
  _id: string;
  vipEmail: string;
  city: string;
  state?: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  deleteUserPhone: boolean;
  active: boolean;
  createdBy?: "admin" | "vip";
  expiresAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export async function getVipPhoneOverridesForEmail(
  email: string
): Promise<VipPhoneOverride[]> {
  const store = await readStore();
  const cleanEmail = email.trim().toLowerCase();
  const list = ((store.vipPhoneOverrides ?? []) as unknown as VipPhoneOverride[]).filter(
    (o) => o && o.vipEmail?.toLowerCase() === cleanEmail && o.createdBy !== "admin"
  );
  return list;
}

export async function saveVipPhoneOverride(input: {
  vipEmail: string;
  city: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  deleteUserPhone?: boolean;
}): Promise<VipPhoneOverride> {
  const store = await readStore();
  const cleanEmail = input.vipEmail.trim().toLowerCase();
  const cleanCity = input.city.trim();
  const normalizedCity = cleanCity.toLowerCase();

  // Find expiration date from VIP assignments for this email covering this city
  const assignments = await getVipAssignmentsForEmail(cleanEmail);
  const activeAssignments = assignments.filter((a) => a.status === "active");

  let expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const matchingAssignment =
    activeAssignments.find((a) => {
      if (a.type === "city" && a.cityName?.toLowerCase() === normalizedCity) return true;
      if (a.type === "state") return true;
      return false;
    }) || activeAssignments[0];

  if (matchingAssignment && matchingAssignment.expiresAt) {
    expiresAt = new Date(matchingAssignment.expiresAt);
  }

  const overrides = ((store.vipPhoneOverrides ?? []) as unknown as VipPhoneOverride[]).filter(Boolean);
  const existingIdx = overrides.findIndex(
    (o) => o.vipEmail.toLowerCase() === cleanEmail && o.city.toLowerCase() === normalizedCity
  );

  const now = new Date();
  const overrideData: VipPhoneOverride = {
    _id: existingIdx >= 0 ? overrides[existingIdx]._id : `vpo_${Date.now()}_${randomUUID().substring(0, 6)}`,
    vipEmail: cleanEmail,
    city: cleanCity,
    state: input.state?.trim(),
    phone: String(input.phone ?? "").trim(),
    whatsapp: String(input.whatsapp ?? "").trim(),
    telegram: String(input.telegram ?? "").trim(),
    deleteUserPhone: Boolean(input.deleteUserPhone),
    active: true,
    createdBy: "vip",
    expiresAt,
    createdAt: existingIdx >= 0 ? overrides[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    overrides[existingIdx] = overrideData;
  } else {
    overrides.push(overrideData);
  }

  store.vipPhoneOverrides = overrides as unknown as typeof store.vipPhoneOverrides;
  await writeStore(store);
  return overrideData;
}

export async function deleteVipPhoneOverride(
  id: string,
  vipEmail: string
): Promise<boolean> {
  const store = await readStore();
  const cleanEmail = vipEmail.trim().toLowerCase();
  const overrides = ((store.vipPhoneOverrides ?? []) as unknown as VipPhoneOverride[]).filter(Boolean);
  const idx = overrides.findIndex((o) => o._id === id && o.vipEmail.toLowerCase() === cleanEmail);
  if (idx < 0) return false;
  overrides.splice(idx, 1);
  store.vipPhoneOverrides = overrides as unknown as typeof store.vipPhoneOverrides;
  await writeStore(store);
  return true;
}

export async function getAdminPhoneOverrides(): Promise<VipPhoneOverride[]> {
  const store = await readStore();
  const list = ((store.vipPhoneOverrides ?? []) as unknown as VipPhoneOverride[]).filter(
    (o) => o && (o.createdBy === "admin" || o.vipEmail === "admin")
  );
  return list;
}

export async function saveAdminPhoneOverride(input: {
  city: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  deleteUserPhone?: boolean;
  adminEmail?: string;
}): Promise<VipPhoneOverride> {
  const store = await readStore();
  const cleanCity = input.city.trim();
  const cleanState = (input.state ?? "").trim();
  const normalizedCity = cleanCity.toLowerCase();
  const cleanAdminEmail = (input.adminEmail ?? "admin").trim().toLowerCase();

  const overrides = ((store.vipPhoneOverrides ?? []) as unknown as VipPhoneOverride[]).filter(Boolean);
  const existingIdx = overrides.findIndex(
    (o) =>
      o.city.toLowerCase() === normalizedCity &&
      (o.createdBy === "admin" || o.vipEmail === "admin")
  );

  // Admin overrides remain active until removed by admin (10-year expiration)
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 10);

  const now = new Date();
  const overrideData: VipPhoneOverride = {
    _id: existingIdx >= 0 ? overrides[existingIdx]._id : `apo_${Date.now()}_${randomUUID().substring(0, 6)}`,
    vipEmail: cleanAdminEmail,
    city: cleanCity,
    state: cleanState,
    phone: String(input.phone ?? "").trim(),
    whatsapp: String(input.whatsapp ?? "").trim(),
    telegram: String(input.telegram ?? "").trim(),
    deleteUserPhone: Boolean(input.deleteUserPhone),
    active: true,
    createdBy: "admin",
    expiresAt,
    createdAt: existingIdx >= 0 ? overrides[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    overrides[existingIdx] = overrideData;
  } else {
    overrides.push(overrideData);
  }

  store.vipPhoneOverrides = overrides as unknown as typeof store.vipPhoneOverrides;
  await writeStore(store);
  return overrideData;
}

export async function deleteAdminPhoneOverride(id: string): Promise<boolean> {
  const store = await readStore();
  const overrides = ((store.vipPhoneOverrides ?? []) as unknown as VipPhoneOverride[]).filter(Boolean);
  const idx = overrides.findIndex(
    (o) => o._id === id && (o.createdBy === "admin" || o.vipEmail === "admin")
  );
  if (idx < 0) return false;
  overrides.splice(idx, 1);
  store.vipPhoneOverrides = overrides as unknown as typeof store.vipPhoneOverrides;
  await writeStore(store);
  return true;
}

export const getActiveVipPhoneOverride = cache(async function (
  city: string
): Promise<VipPhoneOverride | null> {
  if (!city) return null;
  const normalizedCity = city.trim().toLowerCase();
  const store = await readStore();

  const overrides = ((store.vipPhoneOverrides ?? []) as unknown as VipPhoneOverride[]).filter(Boolean);
  const now = Date.now();

  // 1. First priority: Active ADMIN override for this city
  const adminOverride = overrides.find(
    (o) =>
      o.active &&
      o.city &&
      o.city.trim().toLowerCase() === normalizedCity &&
      (o.createdBy === "admin" || o.vipEmail === "admin") &&
      new Date(o.expiresAt).getTime() > now
  );
  if (adminOverride) {
    return adminOverride;
  }

  // 2. Second priority: Active VIP override with active assignment
  for (const o of overrides) {
    if (
      o.active &&
      o.city &&
      o.city.trim().toLowerCase() === normalizedCity &&
      o.createdBy !== "admin" &&
      o.vipEmail !== "admin" &&
      new Date(o.expiresAt).getTime() > now
    ) {
      // Verify VIP assignment is currently active
      const assignments = (store.cityVipAssignments ?? []) as unknown as CityVipAssignment[];
      const hasActiveVip = assignments.some((a) => {
        if (a.email.toLowerCase() !== o.vipEmail.toLowerCase()) return false;
        if (a.status !== "active") return false;
        if (new Date(a.expiresAt).getTime() <= now) return false;
        if (a.type === "city" && a.cityName?.trim().toLowerCase() === normalizedCity) return true;
        if (a.type === "state") return true;
        return false;
      });

      if (hasActiveVip) {
        return o;
      }
    }
  }

  return null;
});
