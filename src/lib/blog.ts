export const BLOG_CATEGORIES = [
  "City Guides",
  "Local Services",
  "Safety & Tips",
  "Platform Updates",
  "Insights",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export type BlogSection = {
  id: string;
  heading?: string;
  content: string;
  image?: string;
  imageAlt?: string;
  type?: "text" | "callout" | "quote";
};

export type BlogFaq = {
  id: string;
  question: string;
  answer: string;
};

export type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: BlogCategory;
  coverImage: string;
  coverImageAlt: string;
  author: {
    name: string;
    avatar?: string;
    role?: string;
  };
  readTime: string;
  sections: BlogSection[];
  faqs?: BlogFaq[];
  tags: string[];
  status: "published" | "draft";
  featured?: boolean;
  views: number;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function calculateReadTime(textOrSections: string | BlogSection[]): string {
  let totalWords = 0;
  if (typeof textOrSections === "string") {
    totalWords = textOrSections.trim().split(/\s+/).filter(Boolean).length;
  } else if (Array.isArray(textOrSections)) {
    const combined = textOrSections
      .map((s) => `${s.heading || ""} ${s.content || ""}`)
      .join(" ");
    totalWords = combined.trim().split(/\s+/).filter(Boolean).length;
  }
  const minutes = Math.max(1, Math.ceil(totalWords / 200));
  return `${minutes} min read`;
}

export function getCategoryBadgeColor(category: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (category) {
    case "City Guides":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-700",
        border: "border-amber-200/80",
      };
    case "Local Services":
      return {
        bg: "bg-blue-500/10",
        text: "text-blue-700",
        border: "border-blue-200/80",
      };
    case "Safety & Tips":
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-700",
        border: "border-emerald-200/80",
      };
    case "Platform Updates":
      return {
        bg: "bg-purple-500/10",
        text: "text-purple-700",
        border: "border-purple-200/80",
      };
    case "Insights":
      return {
        bg: "bg-rose-500/10",
        text: "text-rose-700",
        border: "border-rose-200/80",
      };
    default:
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
      };
  }
}

export const STATIC_FALLBACK_POSTS: BlogPost[] = [
  {
    _id: "blog_seed_1",
    title: "How to Safely Discover Local Classifieds & Verified Services in Major Indian Metros",
    slug: "safely-discover-local-classifieds-and-services",
    excerpt:
      "A complete guide on navigating city-wide classified directories safely, identifying verified listings, and directly contacting local providers with confidence.",
    category: "Safety & Tips",
    coverImage:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    coverImageAlt: "Modern digital marketplace security and safety tips",
    author: {
      name: "RKB Editorial",
      role: "Platform Safety & Trust",
    },
    readTime: "4 min read",
    tags: ["Safety", "Classifieds", "Verification", "Tips"],
    status: "published",
    featured: true,
    views: 1420,
    metaTitle: "Safety Tips for Online Classifieds & Local Services | RKB",
    metaDescription:
      "Learn best practices for contacting local service providers, verifying listings, and avoiding scams across online classified portals in India.",
    publishedAt: "2026-03-15T09:00:00.000Z",
    createdAt: "2026-03-15T09:00:00.000Z",
    updatedAt: "2026-03-15T09:00:00.000Z",
    sections: [
      {
        id: "s1",
        heading: "Prioritize Verified Listings with Direct Contact Options",
        content:
          "When exploring local city portals, prioritize service listings that feature direct verified contact options—such as telephone calls, WhatsApp business accounts, and transparent descriptions. Always read the ad description thoroughly and check whether the pricing and terms are clearly stated before initiating contact.",
        type: "text",
      },
      {
        id: "s2",
        heading: "Important Safety Rule of Thumb",
        content:
          "Never send advance payments or wire transfers before confirming service details in person or through mutual agreement. Reliable providers are transparent about their cancellation policies and service expectations.",
        type: "callout",
      },
      {
        id: "s3",
        heading: "Leveraging Local Area Filtering",
        content:
          "Metropolitan hubs like Mumbai, Delhi, Bengaluru, and Pune span vast geographic areas. Utilizing precise locality filters—such as Andheri East, Indiranagar, or Connaught Place—ensures prompt response times and minimal transit delays.",
        type: "text",
      },
    ],
    faqs: [
      {
        id: "f1",
        question: "How do I know if a listing on RKB is genuine?",
        answer:
          "Look for listings with complete contact information, clear service descriptions, and active presence. You can contact providers directly via phone or WhatsApp to clarify requirements before proceeding.",
      },
      {
        id: "f2",
        question: "What should I do if a provider asks for unusual payment methods?",
        answer:
          "Exercise caution and refuse any untraceable gift cards or upfront deposits for unverified bookings. Report suspicious profiles to the RKB moderation team.",
      },
    ],
  },
  {
    _id: "blog_seed_2",
    title: "Top City Hotspots and Nightlife Destinations in Mumbai & Delhi NCR",
    slug: "top-city-hotspots-nightlife-mumbai-delhi",
    excerpt:
      "Explore curated recommendations for vibrant evening hotspots, premier lounges, and iconic social spaces across India's premier metropolitan centers.",
    category: "City Guides",
    coverImage:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    coverImageAlt: "Vibrant city nightlife and metropolitan lifestyle",
    author: {
      name: "Suraj Kumar",
      role: "Lead City Explorer",
    },
    readTime: "5 min read",
    tags: ["Mumbai", "Delhi", "Hotspots", "Nightlife", "Travel"],
    status: "published",
    featured: false,
    views: 980,
    metaTitle: "Top Metropolitan Hotspots in Mumbai & Delhi | RKB Guide",
    metaDescription:
      "Discover the best local hotspots, evening retreats, and social gathering spots in Mumbai and Delhi NCR.",
    publishedAt: "2026-03-20T11:30:00.000Z",
    createdAt: "2026-03-20T11:30:00.000Z",
    updatedAt: "2026-03-20T11:30:00.000Z",
    sections: [
      {
        id: "s1",
        heading: "The Pulse of Maximum City: Bandra to Lower Parel",
        content:
          "From scenic coastal promenades at Bandra Bandstand to rooftop lounges overlooking Lower Parel's skyline, Mumbai offers around-the-clock vibrancy. Explore culinary marvels and relaxed evening venues nestled along the western suburbs.",
        type: "text",
      },
      {
        id: "s2",
        heading: "Delhi NCR: Heritage Meets Modern Glamour",
        content:
          "Hauz Khas Village pairs historic 13th-century reservoir views with bohemian cafés and energetic clubs, while Cyber Hub in Gurugram caters to premium dining and leisure gatherings.",
        type: "text",
      },
      {
        id: "s3",
        heading: "Pro Traveler Tip",
        content:
          "Plan reservations ahead during weekends and verify entry rules or dress codes. Many city lounges require advance guestlist confirmation.",
        type: "callout",
      },
    ],
    faqs: [
      {
        id: "f1",
        question: "Where can I find verified place recommendations on RKB?",
        answer:
          "Navigate to the Places section on RKB to explore state and city directories complete with local reviews and verified highlights.",
      },
    ],
  },
  {
    _id: "blog_seed_3",
    title: "Understanding RKB's Coin-Based Ad Posting & VIP Exposure System",
    slug: "understanding-rkb-coin-posting-vip-system",
    excerpt:
      "A deep dive into how advertisers can maximize visibility, activate VIP badges, and leverage shift packages for peak engagement.",
    category: "Platform Updates",
    coverImage:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
    coverImageAlt: "Digital growth and promotional strategies on RKB",
    author: {
      name: "RKB Product Team",
      role: "Platform Operations",
    },
    readTime: "3 min read",
    tags: ["Coins", "VIP", "Promotions", "Classifieds"],
    status: "published",
    featured: false,
    views: 750,
    metaTitle: "Coin Packages & VIP Promotion Guide | RKB",
    metaDescription:
      "Learn how to post ads with coins, apply promotional packages, and obtain VIP prominence on RKB.",
    publishedAt: "2026-03-28T14:15:00.000Z",
    createdAt: "2026-03-28T14:15:00.000Z",
    updatedAt: "2026-03-28T14:15:00.000Z",
    sections: [
      {
        id: "s1",
        heading: "Coin Economy Designed for Fair Visibility",
        content:
          "RKB utilizes an accessible coin wallet system. Advertisers can acquire coins via instant UPI QR codes and utilize them to post, refresh, and boost listings across target cities.",
        type: "text",
      },
      {
        id: "s2",
        heading: "VIP Priority Listings",
        content:
          "VIP-enabled ads appear at the top of city search results with distinct styling, high-contrast badges, and immediate contact action buttons.",
        type: "callout",
      },
    ],
  },
];
