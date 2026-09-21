import { readStore, writeStore } from "../persist";

export const DEFAULT_UPI = {
  upiId: "surajkumar40407@ybl",
  name: "suraj",
  qrCode: "/surajkumar40407@ybl.jpeg",
} as const;

export type UPIRecord = {
  _id?: string;
  upiId: string;
  name: string;
  qrCode: string;
  active?: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
};

export async function ensureDefaultUPI(): Promise<UPIRecord | null> {
  const store = await readStore();
  const upis: UPIRecord[] = ((store.upis ?? []) as unknown as UPIRecord[]).map((upi) => ({
    ...upi,
    active: upi.active !== false,
  }));

  const hasDefault = upis.some(
    (upi) => upi.upiId.toLowerCase() === DEFAULT_UPI.upiId.toLowerCase()
  );

  if (hasDefault) {
    return upis.find(
      (upi) => upi.upiId.toLowerCase() === DEFAULT_UPI.upiId.toLowerCase()
    ) ?? null;
  }

  const defaultUPI: UPIRecord = {
    _id: "default-upi",
    ...DEFAULT_UPI,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  upis.unshift(defaultUPI);
  store.upis = upis;
  await writeStore(store);

  return defaultUPI;
}

export async function listUPIs(): Promise<UPIRecord[]> {
  const store = await readStore();
  const upis: UPIRecord[] = ((store.upis ?? []) as unknown as UPIRecord[]).map((upi) => ({
    ...upi,
    active: upi.active !== false,
  }));

  if (upis.length === 0) {
    const defaultUPI = await ensureDefaultUPI();
    return defaultUPI ? [defaultUPI] : [];
  }

  const hasDefault = upis.some(
    (upi) => upi.upiId.toLowerCase() === DEFAULT_UPI.upiId.toLowerCase()
  );

  if (!hasDefault) {
    const defaultUPI = await ensureDefaultUPI();
    return defaultUPI ? [defaultUPI, ...upis] : upis;
  }

  return upis.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });
}

export async function createUPI(upi: {
  upiId: string;
  name: string;
  qrCode: string;
  active?: boolean;
}): Promise<UPIRecord> {
  const store = await readStore();
  const upis = (store.upis ?? []) as unknown as UPIRecord[];

  const newUPI: UPIRecord = {
    _id: Date.now().toString(),
    upiId: upi.upiId,
    name: upi.name,
    qrCode: upi.qrCode,
    active: upi.active !== false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  upis.push(newUPI);
  store.upis = upis;
  await writeStore(store);

  return newUPI;
}

export async function updateUPI(
  id: string,
  updates: Partial<{ upiId: string; name: string; qrCode: string; active: boolean }>
): Promise<UPIRecord | null> {
  const store = await readStore();
  const upis = (store.upis ?? []) as unknown as UPIRecord[];

  const index = upis.findIndex((u) => u._id === id);
  if (index === -1) return null;

  const upi = upis[index];
  upis[index] = {
    ...upi,
    upiId: updates.upiId ?? upi.upiId,
    name: updates.name ?? upi.name,
    qrCode: updates.qrCode ?? upi.qrCode,
    active: typeof updates.active === "boolean" ? updates.active : upi.active !== false,
    updatedAt: new Date(),
  };

  store.upis = upis;
  await writeStore(store);
  return upis[index];
}

export async function setUPIActive(
  id: string,
  active: boolean
): Promise<UPIRecord | null> {
  return updateUPI(id, { active });
}

export async function deleteUPI(id: string): Promise<boolean> {
  const store = await readStore();
  const upis = (store.upis ?? []) as unknown as UPIRecord[];

  const index = upis.findIndex((u) => u._id === id);
  if (index === -1) return false;

  upis.splice(index, 1);
  store.upis = upis;
  await writeStore(store);

  return true;
}

export async function listActiveUPIs(): Promise<UPIRecord[]> {
  return (await listUPIs()).filter((upi) => upi.active !== false);
}

export async function getNextUPIForPayment(): Promise<UPIRecord | null> {
  const activeUpis = await listActiveUPIs();
  if (activeUpis.length === 0) {
    const defaultUPI = await ensureDefaultUPI();
    return defaultUPI && defaultUPI.active !== false ? defaultUPI : null;
  }

  const store = await readStore();
  const rotation = (store.upiRotation ?? { index: 0, requestCount: 0 }) as {
    index: number;
    requestCount: number;
  };

  const currentIndex = Math.abs(rotation.index ?? 0) % activeUpis.length;
  const selected = activeUpis[currentIndex];
  const nextRequestCount = (rotation.requestCount ?? 0) + 1;
  const nextIndex = nextRequestCount % 10 === 0 ? (currentIndex + 1) % activeUpis.length : currentIndex;

  store.upiRotation = {
    index: nextIndex,
    requestCount: nextRequestCount,
  };
  await writeStore(store);

  return selected;
}

export async function getUPIById(id: string): Promise<UPIRecord | null> {
  const store = await readStore();
  const upis = (store.upis ?? []) as unknown as UPIRecord[];

  return upis.find((u) => u._id === id) || null;
}
