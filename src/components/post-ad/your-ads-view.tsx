"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import YourAdsSection from "./your-ads-section";
import { useAuthGuard } from "./use-auth-guard";
import { useAuth } from "@/lib/auth-context";
import { authenticatedFetch } from "@/lib/auth-fetch";
import type { Ad } from "./types";

import { YourAdsListSkeleton } from "@/components/skeletons/post-ad-skeletons";

export default function YourAdsView() {
  const router = useRouter();
  const ready = useAuthGuard();
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{
    freeAdsUsed: number;
    freeAdAllowance: number;
    freeAdId: string | null;
    hiddenAdsCount: number;
  }>({
    freeAdsUsed: 0,
    freeAdAllowance: 1,
    freeAdId: null,
    hiddenAdsCount: 0,
  });

  const loadAds = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    authenticatedFetch("/api/ads")
      .then((r) => r.json())
      .then((data) => {
        setAds(data.ads ?? []);
        setMeta({
          freeAdsUsed: data.freeAdsUsed ?? 0,
          freeAdAllowance: data.freeAdAllowance ?? 1,
          freeAdId: data.freeAdId ?? null,
          hiddenAdsCount: data.hiddenAdsCount ?? 0,
        });
      })
      .catch(() => setAds([]))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    authenticatedFetch("/api/ads")
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setAds(data.ads ?? []);
          setMeta({
            freeAdsUsed: data.freeAdsUsed ?? 0,
            freeAdAllowance: data.freeAdAllowance ?? 1,
            freeAdId: data.freeAdId ?? null,
            hiddenAdsCount: data.hiddenAdsCount ?? 0,
          });
        }
      })
      .catch(() => {
        if (active) setAds([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ready]);

  const handleEdit = (ad: Ad) => router.push(`/post-ad/edit/${ad._id}`);

  const handleDelete = async (ad: Ad) => {
    const id = ad._id;
    if (!id) return;
    if (!window.confirm(`Delete "${ad.name}"?`)) return;
    // Optimistic removal
    setAds((prev) => prev.filter((a) => a._id !== id));
    await authenticatedFetch(`/api/ads/${id}`, { method: "DELETE" }).catch(() => {});
    loadAds(true);
  };

  const handleToggleStatus = async (ad: Ad) => {
    const id = ad._id;
    if (!id) return;
    const nextStatus = ad.status === "suspended" ? "active" : "suspended";
    // Optimistic status update
    setAds((prev) =>
      prev.map((a) => (a._id === id ? { ...a, status: nextStatus } : a))
    );
    try {
      const res = await authenticatedFetch(`/api/ads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        loadAds(true);
      } else {
        loadAds(true);
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
      loadAds(true);
    }
  };

  if (!ready) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionPanel className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-black text-white sm:text-3xl">Manage Your Listings</h1>
          </div>
          <div className="mt-6">
            <YourAdsListSkeleton />
          </div>
        </SectionPanel>
      </main>
    );
  }

  const validAds = ads.filter((ad) => (ad.status ?? "active") !== "deleted");

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionPanel className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              Your Advertisements
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Review live impressions, promotion shifts, and listing statuses.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              href="/post-ad/new"
              variant="solid"
              size="sm"
              className="!text-white font-bold"
            >
              + Post New Ad
            </Button>
            <Button
              variant="soft"
              size="sm"
              onClick={() => router.push("/post-ad")}
              className="border border-white/10 text-slate-300 hover:text-white"
            >
              Back to Hub
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <YourAdsSection
            ads={validAds}
            userEmail={user?.email}
            freeAdAllowance={meta.freeAdAllowance}
            freeAdsUsed={meta.freeAdsUsed}
            hiddenAdsCount={meta.hiddenAdsCount}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            loading={loading}
          />
        </div>
      </SectionPanel>
    </main>
  );
}
