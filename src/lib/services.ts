export const serviceNames = {
  home: "Call Girls",
  repair: "Male Escorts",
  massage: "Massage",
} as const;

export const serviceCards = [
  {
    title: serviceNames.home,
    image: "/WhatsApp Image 2026-03-14 at 5.49.05 PM.jpeg",
    button: "Post Ad",
    description:
      "Connect with verified call girls for companionship and personalized meetups in your city.",
  },
  {
    title: serviceNames.repair,
    image: "/WhatsApp Image 2026-03-14 at 5.49.06 PM.jpeg",
    button: "Post Ad",
    description:
      "Book male escorts for companionship, events, and private meetups tailored to your preferences.",
  },
  {
    title: serviceNames.massage,
    image: "/WhatsApp Image 2026-03-14 at 5.49.07 PM.jpeg",
    button: "Post Ad",
    description:
      "Relax with professional massage services designed to reduce stress, improve comfort, and support your overall wellness.",
  },
] as const;

const serviceSummaryNames = Object.values(serviceNames).map((name) =>
  name.toLowerCase()
);

export const serviceSummaryText = `RKB is your local services marketplace for finding trusted help across ${serviceSummaryNames[0]}, ${serviceSummaryNames[1]}, and ${serviceSummaryNames[2]} bookings in one simple place.`;
