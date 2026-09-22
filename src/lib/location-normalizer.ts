/**
 * Complete Location Normalization and Duplicate Prevention Engine for Rojlo.
 * Handles Unicode diacritics, case-insensitivity, whitespace collapsing,
 * URL slugification, and official historical/common Indian location aliases.
 */

export function slugifyLocation(value: string): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Strips diacritics, normalizes whitespace, trims, and converts to lowercase.
 */
export function normalizeLocationName(value: string): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Historical and popular alternative state/UT names mapped to their canonical names.
 */
export const STATE_ALIASES: Record<string, string> = {
  orissa: "Odisha",
  uttaranchal: "Uttarakhand",
  pondicherry: "Puducherry",
  pondy: "Puducherry",
  "andaman & nicobar": "Andaman and Nicobar Islands",
  "andaman & nicobar islands": "Andaman and Nicobar Islands",
  "andaman and nicobar": "Andaman and Nicobar Islands",
  "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "dadra and nagar haveli & daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "jammu & kashmir": "Jammu and Kashmir",
  "j&k": "Jammu and Kashmir",
  "delhi ncr": "Delhi",
  "nct of delhi": "Delhi",
  "national capital territory of delhi": "Delhi",
};

/**
 * Historical and popular alternative city names mapped to their canonical names.
 */
export const CITY_ALIASES: Record<string, string> = {
  bangalore: "Bengaluru",
  bangaluru: "Bengaluru",
  bombay: "Mumbai",
  calcutta: "Kolkata",
  madras: "Chennai",
  gurgaon: "Gurugram",
  baroda: "Vadodara",
  poona: "Pune",
  cochin: "Kochi",
  cochi: "Kochi",
  trivandrum: "Thiruvananthapuram",
  calicut: "Kozhikode",
  mysore: "Mysuru",
  mangalore: "Mangalore", // preserve existing Rojlo static slug & name
  mangaluru: "Mangalore",
  belgaum: "Belagavi",
  hubli: "Hubballi-Dharwad",
  "hubli-dharwad": "Hubballi-Dharwad",
  "hubli dharwad": "Hubballi-Dharwad",
  hubballi: "Hubballi-Dharwad",
  gulbarga: "Kalaburagi",
  allahabad: "Prayagraj",
  benaras: "Varanasi",
  banaras: "Varanasi",
  kashi: "Varanasi",
  waltair: "Visakhapatnam",
  vizag: "Visakhapatnam",
  pondicherry: "Puducherry",
  simla: "Shimla",
  gauhati: "Guwahati",
  aurangabad: "Chhatrapati Sambhajinagar",
  "chhatrapati sambhaji nagar": "Chhatrapati Sambhajinagar",
  osmanabad: "Dharashiv",
  faizabad: "Ayodhya",
  fyzabad: "Ayodhya",
  bezwada: "Vijayawada",
  bellary: "Ballari",
  bijapur: "Vijayapura",
  shimoga: "Shivamogga",
  shivamogga: "Shivamogga",
  tumkur: "Tumakuru",
  chikmagalur: "Chikkamagaluru",
  alleppey: "Alappuzha",
  quilon: "Kollam",
  cannannore: "Kannur",
  palghat: "Palakkad",
  trichur: "Thrissur",
  badagara: "Vatakara",
  tellicherry: "Thalassery",
  trichy: "Tiruchirappalli",
  tiruchirapalli: "Tiruchirappalli",
  tanjore: "Thanjavur",
  tuticorin: "Thoothukudi",
  tirunelvely: "Tirunelveli",
  conjeevaram: "Kanchipuram",
  ooty: "Ooty",
  udhagamandalam: "Ooty",
  roorki: "Roorkee",
  hardwar: "Haridwar",
  haldwani: "Haldwani",
  gautam_buddh_nagar: "Noida",
  "gautam buddha nagar": "Noida",
};

/**
 * Resolves any state name to its official canonical state name and slug.
 */
export function resolveCanonicalState(name: string): {
  canonicalName: string;
  slug: string;
  isAlias: boolean;
} {
  const norm = normalizeLocationName(name);
  const aliasMatch = STATE_ALIASES[norm] || STATE_ALIASES[slugifyLocation(name)];
  const canonicalName = aliasMatch || name.trim();
  return {
    canonicalName,
    slug: slugifyLocation(canonicalName),
    isAlias: Boolean(aliasMatch),
  };
}

/**
 * Resolves any city name to its official canonical city name and slug.
 */
export function resolveCanonicalCity(name: string): {
  canonicalName: string;
  slug: string;
  isAlias: boolean;
} {
  const norm = normalizeLocationName(name);
  const aliasMatch = CITY_ALIASES[norm] || CITY_ALIASES[slugifyLocation(name)];
  const canonicalName = aliasMatch || name.trim();
  return {
    canonicalName,
    slug: slugifyLocation(canonicalName),
    isAlias: Boolean(aliasMatch),
  };
}

/**
 * Compares a candidate location name against a list of existing locations.
 * Returns true if a duplicate is found (matching exact, case, whitespace, slug, or alias).
 */
export function isDuplicateLocation(
  candidateName: string,
  existingList: Array<{ name: string; slug?: string }>,
  type: "state" | "city" | "area" = "city"
): boolean {
  if (!candidateName || !candidateName.trim()) return true;

  const candidateNorm = normalizeLocationName(candidateName);
  const candidateSlug = slugifyLocation(candidateName);

  let canonicalName = candidateName;
  let canonicalSlug = candidateSlug;

  if (type === "state") {
    const res = resolveCanonicalState(candidateName);
    canonicalName = res.canonicalName;
    canonicalSlug = res.slug;
  } else if (type === "city") {
    const res = resolveCanonicalCity(candidateName);
    canonicalName = res.canonicalName;
    canonicalSlug = res.slug;
  }

  const canonicalNorm = normalizeLocationName(canonicalName);

  for (const item of existingList) {
    if (!item || !item.name) continue;

    const itemNorm = normalizeLocationName(item.name);
    const itemSlug = item.slug ? item.slug.toLowerCase().trim() : slugifyLocation(item.name);

    // 1. Exact or normalized string match
    if (itemNorm === candidateNorm || itemNorm === canonicalNorm) {
      return true;
    }

    // 2. Slug match
    if (itemSlug === candidateSlug || itemSlug === canonicalSlug) {
      return true;
    }

    // 3. Reverse alias match: check if existing item resolves to the same canonical
    if (type === "state") {
      const itemCanonical = resolveCanonicalState(item.name);
      if (itemCanonical.slug === canonicalSlug || itemCanonical.slug === candidateSlug) {
        return true;
      }
    } else if (type === "city") {
      const itemCanonical = resolveCanonicalCity(item.name);
      if (itemCanonical.slug === canonicalSlug || itemCanonical.slug === candidateSlug) {
        return true;
      }
    }
  }

  return false;
}
