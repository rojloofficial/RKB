import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { siteConfig } from "@/lib/config/site";
import { JsonLd } from "@/components/seo/json-ld";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "RKB – Find Services, Places & Post Ads",
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: {
    canonical: "./",
  },
  verification: {
    google: "google47f03fafbd8becac",
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: "RKB – Find Services, Places & Post Ads",
    description: siteConfig.description,
    locale: siteConfig.locale,
    url: siteConfig.url,
    images: [
      {
        url: "/rojlo.png",
        width: 512,
        height: 512,
        alt: "RKB",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RKB – Find Services, Places & Post Ads",
    description: siteConfig.description,
    images: ["/rojlo.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const globalSchema = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteConfig.url}/places?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: `${siteConfig.url}/favicon.png`,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@rojlo.com",
      },
    },
  ];

  return (
    <html lang="en" className={`h-full antialiased ${sansFont.variable}`}>
      <head>
        <JsonLd data={globalSchema} />
      </head>
      <body className={`${sansFont.className} min-h-full bg-slate-50 text-slate-900 selection:bg-amber-100 selection:text-amber-900`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
