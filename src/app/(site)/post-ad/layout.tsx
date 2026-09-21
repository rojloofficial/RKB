import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post Ad | RKB",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function PostAdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
