import { serviceCards } from "@/lib/services";

export const SERVICES = serviceCards.map((s) => s.title);

export const TO_SERVE = [
  "Oral",
  "Anal",
  "BDSM",
  "Girlfriend experience",
  "Porn actresses",
  "Body ejaculation",
  "Erotic massage",
  "Tantric massage",
  "Fetish",
  "French kiss",
  "Role play",
  "Threesome",
  "Sexting",
  "Videocall",
];

export const PLACE_OF_SERVICE = [
  "At home",
  "Events and parties",
  "Hotel / Motel",
  "Clubs",
  "Outcall",
];

export const MAX_IMAGES = 4;

export type ProfileUser = {
  name: string;
  email: string;
  phone?: string;
  service?: string;
  createdAt?: string | Date;
};

export type ServiceRate = {
  duration: string;
  incall: string;
  outcall: string;
};

export const DEFAULT_SERVICE_RATES: ServiceRate[] = [
  { duration: "1 Hour", incall: "1500", outcall: "1500" },
  { duration: "2 Hours", incall: "2500", outcall: "2500" },
  { duration: "3 Hours", incall: "4000", outcall: "4000" },
  { duration: "12 Hours", incall: "8000", outcall: "8000" },
];

export type Ad = {
  _id?: string;
  name: string;
  title?: string;
  age?: string;
  category: string;
  toServe?: string[];
  placeOfService?: string[];
  state?: string;
  city: string;
  localArea?: string;
  pincode?: string;
  phone: string;
  whatsapp?: string;
  telegram?: string;
  about?: string;
  images?: string[];
  status: string;
  serviceRates?: ServiceRate[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  promoted?: boolean;
  isPromoted?: boolean;
  promotedFrom?: string | Date;
  promotedUntil?: string | Date;
  promoPackage?: string;
  promoTier?: string;
  promoShift?: string;
  isFreeAd?: boolean;
  isVisibleOnCityPage?: boolean;
  requiresPromotion?: boolean;
};

export type AdForm = {
  name: string;
  title?: string;
  age?: string;
  category: string;
  toServe?: string[];
  placeOfService?: string[];
  state?: string;
  city: string;
  localArea?: string;
  pincode?: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  about: string;
  images: string[];
  serviceRates?: ServiceRate[];
  termsAccepted: boolean;
};
