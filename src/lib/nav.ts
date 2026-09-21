export const navLinks = [
  { name: "About", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "Places", href: "/places" },
  { name: "Post Ad", href: "/post-ad" },
] as const;

export const footerLinks = [
  ...navLinks,
  { name: "Terms", href: "/terms" },
] as const;

export const policyLinks = [
  { name: "Terms", href: "/terms" },
  { name: "Return Policy", href: "/return-policy" },
  { name: "Refund Policy", href: "/refund-policy" },
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Disclaimer", href: "/disclaimer" },
  { name: "Contact Us", href: "/contact" },
] as const;
