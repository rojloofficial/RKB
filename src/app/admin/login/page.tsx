"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useAdminRefresh } from "@/components/admin/admin-context";

export default function AdminLogin() {
  const router = useRouter();
  const refresh = useAdminRefresh();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Invalid email or password.");
        return;
      }
      await refresh();
      router.push("/admin");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <SectionPanel className="w-full max-w-md">
        <Eyebrow>Admin</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-neutral-900">Admin Login</h1>
        <p className="mt-2 text-neutral-600">Sign in with your admin credentials.</p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-800">
              Email
            </label>
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-800">
              Password
            </label>
            <div className="relative">
              <TextInput
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500 transition hover:text-neutral-700"
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.5 10.6A2.5 2.5 0 0 0 12 15a2.5 2.5 0 0 0 2.4-1.8" />
                    <path d="M6.5 6.8C4 8.6 2.5 12 2.5 12s3.5 7 9.5 7a10.5 10.5 0 0 0 4.8-1.1" />
                    <path d="M14.2 4.6A11.4 11.4 0 0 1 12 4C6 4 2.5 12 2.5 12a18.7 18.7 0 0 0 3.7 4.7" />
                    <path d="M9.3 5.1A9.3 9.3 0 0 1 12 4c6 0 9.5 8 9.5 8a17.7 17.7 0 0 1-3.2 4.2" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2.5 12s3.5-8 9.5-8 9.5 8 9.5 8-3.5 8-9.5 8-9.5-8-9.5-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-neutral-800">{error}</p>}

          <Button
            type="submit"
            variant="solid"
            disabled={loading}
            className="!text-white"
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </SectionPanel>
    </main>
  );
}
