import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/vip",
          "/vip/*",
          "/api",
          "/api/*",
          "/login",
          "/post-ad",
          "/post-ad/*",
          "/*?*preview=*",
          "/places?*q=*",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}