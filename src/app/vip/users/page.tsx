"use client";

import { useEffect, useState } from "react";
import { useVipContext } from "@/components/vip/use-vip-context";
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeletons";

type UserItem = {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  coins?: number;
  adCount?: number;
  createdAt: string;
};

export default function VipUsersPage() {
  const me = useVipContext();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (me && !me.authenticated) {
      if (typeof window !== "undefined") {
        window.location.replace("/vip/login");
      }
    }
  }, [me]);

  useEffect(() => {
    if (!me || !me.authenticated) return;

    fetch("/api/vip/users", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setUsers(Array.isArray(data.users) ? data.users : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [me]);

  if (!me || !me.authenticated) return null;

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q))
    );
  });

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-red-950">Users</h1>
          <p className="mt-2 text-red-900">
            Registered users associated with your assigned areas (Read-Only Access).
          </p>
        </div>
        <span className="rounded-full bg-pink-100 px-3.5 py-1.5 text-xs font-bold text-red-900 border border-red-200">
          {users.length} {users.length === 1 ? "User" : "Users"}
        </span>
      </div>

      {/* Search Bar */}
      <div className="mt-6 max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter users by name, email, or phone..."
          className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-red-950 outline-none focus:border-red-400"
        />
      </div>

      {loading ? (
        <div className="mt-6">
          <AdminTableSkeleton
            headers={["Name", "Email", "Phone", "Coins", "Ads Posted"]}
            rowCount={6}
            minWidth="min-w-[600px]"
          />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-white p-8 text-center text-red-900">
          {search ? "No users match your filter." : "No users found in your assigned jurisdiction."}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-red-100 bg-white">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-pink-50 text-red-950">
              <tr>
                <th className="px-5 py-4 font-semibold">Name</th>
                <th className="px-5 py-4 font-semibold">Email</th>
                <th className="px-5 py-4 font-semibold">Phone</th>
                <th className="px-5 py-4 font-semibold">Coins</th>
                <th className="px-5 py-4 text-right font-semibold">Ads Posted</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id || user.email} className="border-t border-red-50">
                  <td className="px-5 py-4 font-bold text-red-950">{user.name}</td>
                  <td className="px-5 py-4 text-red-900">{user.email}</td>
                  <td className="px-5 py-4 text-red-900">{user.phone ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                      {Number(user.coins ?? 0)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="rounded-full bg-pink-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                      {user.adCount ?? 0} ads
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
