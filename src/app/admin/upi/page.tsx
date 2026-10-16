"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { EditDeleteButtons } from "@/components/ui/action-buttons";
import { AdminUpiCardsSkeleton } from "@/components/skeletons/admin-skeletons";

type UPI = {
  _id?: string;
  upiId: string;
  name: string;
  qrCode: string;
  active?: boolean;
  createdAt?: string;
};

export default function AdminUPI() {
  const me = useAdminContext();
  const [upis, setUpis] = useState<UPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upiId, setUpiId] = useState("");
  const [name, setName] = useState("");
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const loadRef = useRef(0);

  useEffect(() => {
    loadUPIs();
  }, []);

  async function loadUPIs() {
    const loadId = ++loadRef.current;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/upi", { credentials: "include" });

      if (loadId !== loadRef.current) return;

      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired. Please log in again.");
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || "Failed to load UPIs.");
        }
        return;
      }

      const data = await res.json();
      const upis = Array.isArray(data.upis) ? data.upis : [];
      const defaultUpi = {
        _id: "default-upi",
        upiId: "surajkumar40407@ybl",
        name: "suraj",
        qrCode: "/surajkumar40407@ybl.jpeg",
        active: true,
        createdAt: new Date().toISOString(),
      };

      const hasDefaultUpi = upis.some(
        (upi: UPI) => upi.upiId.toLowerCase() === defaultUpi.upiId.toLowerCase()
      );

      setUpis(hasDefaultUpi ? upis : [defaultUpi, ...upis]);
    } catch (err) {
      if (loadId === loadRef.current) {
        setError("Failed to load UPIs.");
        console.error(err);
      }
    } finally {
      if (loadId === loadRef.current) {
        setLoading(false);
      }
    }
  }

  function handleQrCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setQrCodeFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setQrCodePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleEdit(upi: UPI) {
    setEditingId(upi._id || null);
    setUpiId(upi.upiId);
    setName(upi.name);
    setQrCodePreview(upi.qrCode);
    setQrCodeFile(null);
    window.scrollTo(0, 0);
  }

  function handleCancel() {
    setEditingId(null);
    setUpiId("");
    setName("");
    setQrCodeFile(null);
    setQrCodePreview("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("upiId", upiId);
      formData.append("name", name);
      if (qrCodeFile) {
        formData.append("qrCode", qrCodeFile);
      }
      if (editingId) {
        formData.append("id", editingId);
      }

      const res = await fetch("/api/admin/upi", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to save UPI.");
        return;
      }

      setUpiId("");
      setName("");
      setQrCodeFile(null);
      setQrCodePreview("");
      setEditingId(null);
      await loadUPIs();
    } catch (err) {
      setError("Failed to save UPI.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string | undefined) {
    if (!id || !confirm("Are you sure you want to delete this UPI?")) return;

    try {
      const res = await fetch("/api/admin/upi", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to delete UPI.");
        return;
      }

      await loadUPIs();
    } catch (err) {
      setError("Failed to delete UPI.");
      console.error(err);
    }
  }

  async function handleToggleActive(upi: UPI) {
    try {
      const res = await fetch("/api/admin/upi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: upi._id,
          active: !(upi.active !== false),
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to change UPI status.");
        return;
      }

      await loadUPIs();
    } catch (err) {
      setError("Failed to change UPI status.");
      console.error(err);
    }
  }

  if (!me || !me.authenticated) return null;

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            UPI <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Gateways</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Configure payment UPI IDs and QR code images shown to users on coin top-ups.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm font-semibold text-rose-300">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-8">
        {/* Add / Edit UPI Form */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-base sm:text-lg font-bold text-white">
            {editingId ? "Edit UPI Gateway" : "Add New UPI Gateway"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g., yourname@upi"
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500/40 transition"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                UPI Name / Label
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Main Business Account"
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500/40 transition"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                QR Code Image {editingId ? "(Leave empty to keep existing)" : ""}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleQrCodeChange}
                className="mt-2 block w-full text-xs sm:text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20 transition cursor-pointer"
                required={!editingId}
              />
              {qrCodePreview && (
                <div className="mt-4">
                  <Image
                    src={qrCodePreview}
                    alt="QR Code Preview"
                    width={160}
                    height={160}
                    className="h-40 w-40 rounded-xl border border-white/15 bg-white p-2 object-contain shadow-md"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-6 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50 shadow-md transition cursor-pointer active:scale-[0.98]"
              >
                {submitting ? "Saving..." : editingId ? "Update Gateway" : "Add Gateway"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-6 py-2.5 text-sm font-semibold text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing UPIs */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-white">Active Gateways</h2>

          {loading ? (
            <AdminUpiCardsSkeleton />
          ) : upis.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center text-slate-400 text-sm">
              No UPI gateways configured yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {upis.map((upi) => (
                <div
                  key={upi._id}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md sm:flex-row sm:items-start sm:justify-between transition-all hover:border-amber-500/30"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white">{upi.name}</h3>
                    <p className="mt-1 font-mono text-sm text-amber-400 break-all">{upi.upiId}</p>
                    {upi.qrCode && (
                      <Image
                        src={upi.qrCode}
                        alt={`QR Code for ${upi.upiId}`}
                        width={128}
                        height={128}
                        className="mt-3 h-32 w-32 rounded-xl border border-white/15 bg-white p-1.5 object-contain shadow-md"
                      />
                    )}
                  </div>
                  <div className="flex gap-2 sm:flex-col shrink-0">
                    <EditDeleteButtons
                      onEdit={() => handleEdit(upi)}
                      onDelete={() => handleDelete(upi._id)}
                      direction="column"
                    />
                    <button
                      onClick={() => handleToggleActive(upi)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                        upi.active !== false
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                          : "bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
                      }`}
                    >
                      {upi.active !== false ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
