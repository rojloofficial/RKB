"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import { useAuthGuard } from "@/components/post-ad/use-auth-guard";

const cards = [
  {
    href: "/post-ad/profile",
    title: "Profile",
    desc: "View your account details.",
  },
  {
    href: "/post-ad/new",
    title: "Post Ad",
    desc: "Create a new advertisement.",
  },
  {
    href: "/post-ad/your-ads",
    title: "Your Ads",
    desc: "Manage the ads you have posted.",
  },
  {
    href: "/post-ad/buy-coin",
    title: "Buy Coin",
    desc: "Get coins to promote your ads.",
  },
  {
    href: "/post-ad/payment-history",
    title: "Payment History",
    desc: "View your coin and ad payments.",
  },
];

export default function Dashboard() {
  const router = useRouter();
  const ready = useAuthGuard();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  };

  if (!ready) return null;

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <h1 className="text-3xl font-black text-neutral-900 sm:text-4xl">
          Manage Your Account
        </h1>

        <Button
          variant="soft"
          onClick={handleLogout}
          className="mt-5 !text-black"
        >
          Logout
        </Button>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group block rounded-[1.5rem] border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50"
            >
              <h2 className="text-xl font-black text-neutral-900">{c.title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{c.desc}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-neutral-900 group-hover:underline">
                Open →
              </span>
            </Link>
          ))}
        </div>
      </SectionPanel>
    </main>
  );
}
