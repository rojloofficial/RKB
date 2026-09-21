// Canonical domain for this project is strictly https://rojloo.vercel.app
const CANONICAL_SITE_URL = "https://rojloo.vercel.app";

function resolveSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (
    envUrl &&
    envUrl.startsWith("https://") &&
    !envUrl.includes("localhost") &&
    !envUrl.includes("rojlo.in") &&
    !envUrl.includes("://rojlo.vercel.app")
  ) {
    return envUrl.replace(/\/+$/, "");
  }
  return CANONICAL_SITE_URL;
}

const siteUrl = resolveSiteUrl();

export const siteConfig = {
  name: "RKB",
  description: "RKB – Find services, places and post ads in your city.",
  url: siteUrl,
  locale: "en_US",
} as const;
