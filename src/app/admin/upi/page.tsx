"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { EditDeleteButtons } from "@/components/ui/action-buttons";
import { Eyebrow } from "@/components/ui/eyebrow";
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
    <main className="flex-1 overflow-auto min-w-0">
      <div className="p-4 sm:p-6 lg:p-8">
        <Eyebrow>Management</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-red-950">UPI Management</h1>

        {error && (
          <div className="mt-6 rounded-lg bg-red-100 p-4 text-red-900">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-8">
          {/* Add New UPI Form */}
          <div className="rounded-2xl border border-red-200 bg-white p-4 sm:p-6">
            <h2 className="text-xl font-bold text-red-950">
              {editingId ? "Edit UPI" : "Add New UPI"}
            </h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-red-950">
                  UPI ID
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g., yourname@upi"
                  className="mt-2 w-full rounded-lg border border-red-200 px-4 py-2 text-red-950 placeholder-red-300 focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-red-950">
                  UPI Name/Label
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Main Account"
                  className="mt-2 w-full rounded-lg border border-red-200 px-4 py-2 text-red-950 placeholder-red-300 focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-red-950">
                  QR Code Image {editingId ? "(Leave empty to keep existing)" : ""}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrCodeChange}
                  className="mt-2 block w-full text-sm text-red-950 file:mr-4 file:rounded-lg file:border-0 file:bg-red-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-red-950"
                  required={!editingId}
                />
                {qrCodePreview && (
                  <div className="mt-4">
                    <Image
                      src={qrCodePreview}
                      alt="QR Code Preview"
                      width={160}
                      height={160}
                      className="h-40 w-40 rounded-lg border border-red-200 object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 rounded-lg bg-red-600 px-6 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Update UPI" : "Add UPI"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="mt-6 rounded-lg bg-red-100 px-6 py-2.5 font-semibold text-red-950 hover:bg-red-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Existing UPIs */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-red-950">Existing UPIs</h2>

            {loading ? (
              <AdminUpiCardsSkeleton />
            ) : upis.length === 0 ? (
              <p className="text-red-900">No UPIs added yet.</p>
            ) : (
              <div className="grid gap-4">
                {upis.map((upi) => (
                  <div
                    key={upi._id}
                    className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-white p-4 sm:p-6 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-red-950">{upi.name}</h3>
                      <p className="mt-1 text-sm text-red-900 break-all">{upi.upiId}</p>
                      {upi.qrCode && (
                        <Image
                          src={upi.qrCode}
                          alt={`QR Code for ${upi.upiId}`}
                          width={128}
                          height={128}
                          className="mt-3 h-32 w-32 rounded-lg border border-red-200 object-contain"
                        />
                      )}
                    </div>
                    <div className="flex gap-2 sm:flex-col">
                      <EditDeleteButtons
                        onEdit={() => handleEdit(upi)}
                        onDelete={() => handleDelete(upi._id)}
                        direction="column"
                      />
                      <button
                        onClick={() => handleToggleActive(upi)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                          upi.active !== false
                            ? "bg-green-100 text-green-900 hover:bg-green-200"
                            : "bg-yellow-100 text-yellow-900 hover:bg-yellow-200"
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
      </div>
    </main>
  );
}
