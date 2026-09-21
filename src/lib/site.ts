export const siteInfo = {
  name: "RKB",
  email: "rojloofficial@gmail.com",
  phone: "0000000000",
  address: "RKB HQ, Andheri East, Mumbai, Maharashtra 400069, India",
} as const;

export const paymentInfo = {
  upiId: "surajkumar40407@ybl",
  upiName: "suraj",
} as const;

export const policySections = [
  {
    title: "Privacy Policy",
    points: [
      "We only collect information needed to run the platform and support your account.",
      "We do not sell personal information to third parties.",
      "User data is handled securely and used only for service operations, support, and communication.",
    ],
  },
  {
    title: "Terms of Use",
    points: [
      "You must provide accurate information when creating ads or profiles.",
      "You are responsible for the content you post and the services you offer.",
      "RKB can remove content that breaks platform rules or local law.",
    ],
  },
  {
    title: "Posting Policy",
    points: [
      "Only list genuine services, accurate descriptions, and correct contact details.",
      "Do not post misleading, abusive, illegal, or duplicate content.",
      "Ads may be reviewed before publishing to keep the platform safe.",
    ],
  },
  {
    title: "Cancellation and Refund Policy",
    points: [
      "Service bookings and payment terms are handled directly between users and service providers unless stated otherwise.",
      "Any refund or cancellation policy depends on the provider's own terms.",
      "If you face a dispute, contact our support team and we will help review the issue.",
    ],
  },
  {
    title: "Service Disclaimer",
    points: [
      "RKB is a marketplace and does not personally perform the listed services.",
      "We are not responsible for service quality, delays, or disputes between users and providers.",
      "Users should verify service details before making a booking or payment.",
    ],
  },
] as const;
