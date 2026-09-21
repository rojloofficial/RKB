export type LocalAreaEntry = {
  name: string;
  slug: string;
  cityName: string;
  citySlug: string;
  description?: string;
  highlights?: string[];
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const POPULAR_LOCAL_AREAS_MAP: Record<
  string,
  Array<{ name: string; slug: string; description?: string; highlights?: string[] }>
> = {
  mumbai: [
    {
      name: "Andheri West",
      slug: "andheri-west",
      description: "A prominent commercial and entertainment hub known for shopping, studios, and dining.",
      highlights: ["Lokhandwala Complex", "Versova Beach", "Infinity Mall", "Link Road"],
    },
    {
      name: "Andheri East",
      slug: "andheri-east",
      description: "Major corporate and transit center with direct metro and airport connectivity.",
      highlights: ["MIDC", "SEEPZ", "Chhatrapati Shivaji Maharaj Airport", "Metro Junction"],
    },
    {
      name: "Bandra West",
      slug: "bandra-west",
      description: "The Queen of the Suburbs, celebrated for seaside promenades, boutique cafes, and nightlife.",
      highlights: ["Bandstand", "Carter Road", "Hill Road", "Linking Road"],
    },
    {
      name: "Bandra East",
      slug: "bandra-east",
      description: "Premier financial district housing global institutions and convention centers.",
      highlights: ["Bandra Kurla Complex (BKC)", "MMRDA Grounds", "Kalanagar"],
    },
    {
      name: "Juhu",
      slug: "juhu",
      description: "Upscale seaside neighborhood famed for its expansive beach and celebrity residences.",
      highlights: ["Juhu Beach", "Prithvi Theatre", "JW Marriott", "Juhu Tara Road"],
    },
    {
      name: "Powai",
      slug: "powai",
      description: "Picturesque lakeside hub blending premier academic institutes with modern tech parks.",
      highlights: ["Powai Lake", "Hiranandani Gardens", "IIT Bombay", "Galleria Shopping"],
    },
    {
      name: "Colaba",
      slug: "colaba",
      description: "Historic South Mumbai district teeming with colonial architecture and bustling markets.",
      highlights: ["Gateway of India", "Colaba Causeway", "Taj Mahal Palace", "Regal Cinema"],
    },
    {
      name: "Borivali West",
      slug: "borivali-west",
      description: "Vibrant residential suburb with abundant green escapes and lively shopping bazaars.",
      highlights: ["Sanjay Gandhi National Park", "Gorai Beach Ferry", "Eksar Road", "Shimpoli"],
    },
    {
      name: "Malad West",
      slug: "malad-west",
      description: "Thriving residential and IT corridor known for malls, seaside access, and entertainment.",
      highlights: ["Inorbit Mall", "Mindspace", "Marve Beach", "Aksa Beach"],
    },
    {
      name: "Goregaon West",
      slug: "goregaon-west",
      description: "Centrally located suburban destination offering top entertainment and retail centers.",
      highlights: ["Film City", "Oberoi Mall", "Bangur Nagar", "Oshiwara Link Road"],
    },
    {
      name: "Dadar",
      slug: "dadar",
      description: "The cultural and transit heart of Mumbai connecting central and western corridors.",
      highlights: ["Shivaji Park", "Dadar Flower Market", "Siddhivinayak Temple", "Plaza Cinema"],
    },
    {
      name: "Thane West",
      slug: "thane-west",
      description: "The City of Lakes with modern urban infrastructure, expansive malls, and nature spots.",
      highlights: ["Viviana Mall", "Upvan Lake", "Ghopbunder Road", "Talao Pali"],
    },
    {
      name: "Navi Mumbai Vashi",
      slug: "vashi",
      description: "Well-planned commercial focal point of Navi Mumbai with tech parks and broad avenues.",
      highlights: ["Inorbit Vashi", "Vashi Bridge", "Sector 17 Market", "Palm Beach Road"],
    },
  ],
  delhi: [
    {
      name: "Connaught Place",
      slug: "connaught-place",
      description: "Iconic colonial-era circular heritage market, business center, and dining epicenter.",
      highlights: ["Central Park", "Janpath Market", "Palika Bazaar", "Barakhamba Road"],
    },
    {
      name: "South Extension",
      slug: "south-extension",
      description: "Elite South Delhi shopping and commercial hub with high-end designer stores.",
      highlights: ["South Ex 1", "South Ex 2", "Ring Road", "Ansal Plaza"],
    },
    {
      name: "Hauz Khas",
      slug: "hauz-khas",
      description: "Artistic neighborhood merging historic medieval ruins with chic boutiques and lakeside cafes.",
      highlights: ["Hauz Khas Village", "Deer Park", "Hauz Khas Fort", "Siri Fort"],
    },
    {
      name: "Karol Bagh",
      slug: "karol-bagh",
      description: "Bustling cultural shopping district acclaimed for fashion, jewelry, and street food.",
      highlights: ["Gaffar Market", "Ajmal Khan Road", "Pusa Road", "Jhandewalan"],
    },
    {
      name: "Rohini",
      slug: "rohini",
      description: "Expansive modern sub-city with amusement parks, educational hubs, and shopping plazas.",
      highlights: ["Adventure Island", "Unity One Mall", "Japanese Park", "Sector 14"],
    },
    {
      name: "Dwarka",
      slug: "dwarka",
      description: "Asia's largest planned residential sub-city with wide roads and prime airport proximity.",
      highlights: ["Vegas Mall", "Dwarka Sector 10 Market", "Dwarka Expressway", "Sector 21"],
    },
    {
      name: "Lajpat Nagar",
      slug: "lajpat-nagar",
      description: "Renowned market hub celebrated for authentic Indian attire, street food, and decor.",
      highlights: ["Central Market", "Ring Road", "Flyover Market", "Amar Colony"],
    },
    {
      name: "Saket",
      slug: "saket",
      description: "Premium South Delhi residential and lifestyle hub housing world-class luxury malls.",
      highlights: ["Select Citywalk", "DLF Avenue", "Max Hospital", "Garden of Five Senses"],
    },
    {
      name: "Vasant Kunj",
      slug: "vasant-kunj",
      description: "Affluent residential neighborhood adjacent to the Ridge with luxury shopping complexes.",
      highlights: ["DLF Promenade", "Ambience Mall", "Nelson Mandela Marg", "JNU Greenery"],
    },
    {
      name: "Pitampura",
      slug: "pitampura",
      description: "Vibrant North-West Delhi commercial and lifestyle hub famous for the TV Tower and food streets.",
      highlights: ["Pitampura TV Tower", "Dilli Haat Pitampura", "Netaji Subhash Place", "Pacific Mall"],
    },
  ],
  bengaluru: [
    {
      name: "Koramangala",
      slug: "koramangala",
      description: "India's startup capital neighborhood boasting countless cafes, co-working spaces, and nightlife.",
      highlights: ["80 Feet Road", "Forum Mall", "100 Feet Road", "Jyoti Nivas College Road"],
    },
    {
      name: "Indiranagar",
      slug: "indiranagar",
      description: "Tree-lined upscale urban destination renowned for craft breweries, restaurants, and shopping.",
      highlights: ["100 Feet Road", "12th Main Road", "CMH Road", "Defense Colony"],
    },
    {
      name: "Whitefield",
      slug: "whitefield",
      description: "Global IT powerhouse neighborhood with major international tech parks and residential estates.",
      highlights: ["ITPL", "Phoenix Marketcity", "Nexus Shantiniketan", "EPIP Zone"],
    },
    {
      name: "HSR Layout",
      slug: "hsr-layout",
      description: "Fast-growing residential and tech hotspot serving as a gateway to Electronic City and ORR.",
      highlights: ["27th Main Road", "Agara Lake", "Sector 1 to Sector 7", "Outer Ring Road"],
    },
    {
      name: "Jayanagar",
      slug: "jayanagar",
      description: "Heritage planned neighborhood celebrated for sprawling parks, traditional eateries, and serenity.",
      highlights: ["Jayanagar 4th Block Complex", "Madhavan Park", "South End Circle"],
    },
    {
      name: "Electronic City",
      slug: "electronic-city",
      description: "Massive high-tech industrial cluster connected by the elevated expressway.",
      highlights: ["Phase 1 IT Corridor", "Phase 2", "Elevated Tollway", "Infosys Campus"],
    },
    {
      name: "JP Nagar",
      slug: "jp-nagar",
      description: "Lively residential destination with theater spaces, microbreweries, and scenic lakes.",
      highlights: ["Ranga Shankara", "Sarakki Lake", "Dollar Layout", "Brigade Millennium"],
    },
    {
      name: "Marathahalli",
      slug: "marathahalli",
      description: "Bustling junction on the Outer Ring Road connecting key IT hubs and factory outlets.",
      highlights: ["Innovative Multiplex", "Outer Ring Road", "Kalamandir Junction", "HAL Airport Road"],
    },
  ],
  kolkata: [
    {
      name: "Park Street",
      slug: "park-street",
      description: "Kolkata's historic entertainment and dining boulevard famous for music, nightlife, and heritage eateries.",
      highlights: ["Flurys", "Peter Cat", "St. Xavier's", "Allen Park"],
    },
    {
      name: "Salt Lake",
      slug: "salt-lake",
      description: "Carefully planned satellite city featuring technology campuses, stadium, and lush green parks.",
      highlights: ["Sector V IT Hub", "City Centre 1", "Central Park", "Salt Lake Stadium"],
    },
    {
      name: "New Town",
      slug: "new-town",
      description: "Futuristic smart city hub hosting top multinational offices, eco-parks, and premier hotels.",
      highlights: ["Eco Park", "Biswa Bangla Gate", "Axis Mall", "Mother's Wax Museum"],
    },
    {
      name: "Ballygunge",
      slug: "ballygunge",
      description: "Prestigious South Kolkata locality known for tranquil avenues, clubs, and upscale lifestyle.",
      highlights: ["Ballygunge Circular Road", "Quest Mall", "Birla Mandir", "Lake Club"],
    },
  ],
  chennai: [
    {
      name: "T Nagar",
      slug: "t-nagar",
      description: "India's commercial retail powerhouse renowned for gold jewelry, silks, and buzzing bazaars.",
      highlights: ["Ranganathan Street", "Usman Road", "Panagal Park", "Pondy Bazaar"],
    },
    {
      name: "Anna Nagar",
      slug: "anna-nagar",
      description: "Prestigious North-West Chennai neighborhood with planned avenues, tower park, and cafes.",
      highlights: ["Anna Nagar Tower Park", "2nd Avenue", "VR Chennai Mall", "Roundtana"],
    },
    {
      name: "Adyar",
      slug: "adyar",
      description: "Serene coastal and riverside district known for natural beauty, heritage, and elite residences.",
      highlights: ["Elliot's Beach (Besant Nagar)", "Theosophical Society", "Adyar Eco Park", "Kasturba Nagar"],
    },
    {
      name: "Velachery",
      slug: "velachery",
      description: "Fast-developing transit and residential hub directly connecting to the IT Expressway.",
      highlights: ["Phoenix Marketcity", "Grand Square", "Velachery Railway Station", "Bypass Road"],
    },
  ],
  hyderabad: [
    {
      name: "Hitec City",
      slug: "hitec-city",
      description: "The technology nerve-center of Hyderabad featuring iconic modern architecture and tech campuses.",
      highlights: ["Cyber Towers", "Mindspace IT Park", "Inorbit Mall", "Durgam Cheruvu Bridge"],
    },
    {
      name: "Gachibowli",
      slug: "gachibowli",
      description: "Modern sports and IT corridor housing international corporations, universities, and stadiums.",
      highlights: ["Financial District", "GMC Balayogi Stadium", "ORR Junction", "ISB Road"],
    },
    {
      name: "Banjara Hills",
      slug: "banjara-hills",
      description: "Elite residential and commercial district with luxury hotels, fine dining, and hospitals.",
      highlights: ["Road No. 12", "Road No. 1", "GVK One Mall", "KBR National Park"],
    },
    {
      name: "Jubilee Hills",
      slug: "jubilee-hills",
      description: "High-end neighborhood home to prominent personalities, media houses, and upscale lounges.",
      highlights: ["Road No. 36", "Peddamma Temple", "Road No. 45", "Film Nagar"],
    },
    {
      name: "Madhapur",
      slug: "madhapur",
      description: "The heart of Cyberabad packed with modern apartments, restaurants, and direct metro link.",
      highlights: ["Ayyappa Society", "Image Hospitals Road", "100 Feet Road", "Durgam Cheruvu"],
    },
  ],
  pune: [
    {
      name: "Koregaon Park",
      slug: "koregaon-park",
      description: "Cosmopolitan leaf-shaded neighborhood famed for fine dining, boutiques, and nightlife.",
      highlights: ["North Main Road", "South Main Road", "Osho Teerth Park", "German Bakery"],
    },
    {
      name: "Viman Nagar",
      slug: "viman-nagar",
      description: "Dynamic neighborhood close to the airport with popular student spots and premium malls.",
      highlights: ["Phoenix Marketcity", "Symbiosis Campus", "Datta Mandir Chowk", "Air Force Station"],
    },
    {
      name: "Baner",
      slug: "baner",
      description: "Rapidly expanding residential and corporate hub with trendy cafes along Baner Road.",
      highlights: ["Baner Road", "High Street Balewadi", "Baner Hill", "Pashan Link Road"],
    },
    {
      name: "Hinjawadi",
      slug: "hinjawadi",
      description: "Pune's biggest IT park cluster powering global software exports.",
      highlights: ["Rajiv Gandhi Infotech Park Phase 1-3", "Wakad Link", "Maan", "Megapolis"],
    },
    {
      name: "Kothrud",
      slug: "kothrud",
      description: "Culturally rich residential area with excellent connectivity, parks, and colleges.",
      highlights: ["Paud Road", "Karve Road", "MIT College", "Vanaz Metro Station"],
    },
  ],
  jaipur: [
    {
      name: "Malviya Nagar",
      slug: "malviya-nagar",
      description: "Upscale residential and commercial locality housing Jaipur's premier malls and universities.",
      highlights: ["World Trade Park (WTP)", "Gaurav Tower (GT)", "Apex Circle", "Jawahar Circle"],
    },
    {
      name: "Vaishali Nagar",
      slug: "vaishali-nagar",
      description: "Vibrant and affluent western Jaipur hub filled with boutiques, cafes, and entertainment.",
      highlights: ["Amrapali Circle", "National Handloom", "Queens Road", "Gandhi Path"],
    },
    {
      name: "C Scheme",
      slug: "c-scheme",
      description: "Prestigious central district with heritage cafes, government offices, and lush avenues.",
      highlights: ["Statue Circle", "Ahinsa Circle", "MI Road Junction", "Central Park"],
    },
    {
      name: "Mansarovar",
      slug: "mansarovar",
      description: "One of Asia's largest residential colonies, equipped with metro connectivity and bustling markets.",
      highlights: ["Mansarovar Metro", "VT Road", "Madhyam Marg", "City Park Mansarovar"],
    },
  ],
  ahmedabad: [
    {
      name: "SG Highway",
      slug: "sg-highway",
      description: "The modern commercial spine of Ahmedabad linking top IT towers, malls, and entertainment.",
      highlights: ["Iskcon Cross Road", "Pakwan Cross Road", "Sola", "Gota"],
    },
    {
      name: "Satellite",
      slug: "satellite",
      description: "Lively, upscale neighborhood featuring premier residential communities and shopping streets.",
      highlights: ["Shivranjani Cross Road", "Jodhpur Cross Road", "Star Bazaar", "ISRO Colony"],
    },
    {
      name: "Vastrapur",
      slug: "vastrapur",
      description: "Scenic and bustling hub surrounding the lake, popular with college students and families.",
      highlights: ["Vastrapur Lake", "IIM Ahmedabad", "Alpha One Mall", "Gurukul Road"],
    },
    {
      name: "Bodakdev",
      slug: "bodakdev",
      description: "Elite residential district renowned for fine-dining restaurants and designer showrooms.",
      highlights: ["Judges Bungalow Road", "Sindhu Bhavan Road", "Pakwan", "Rajpath Club"],
    },
  ],
  surat: [
    {
      name: "Vesu",
      slug: "vesu",
      description: "Modern, high-end residential corridor with wide boulevards and university campuses.",
      highlights: ["VIP Road", "University Road", "Surat Airport Road", "Udhna-Magdalla Road"],
    },
    {
      name: "Adajan",
      slug: "adajan",
      description: "Well-established residential neighborhood across the Tapi river with lively markets.",
      highlights: ["Pal-Adajan Road", "Prime Arcade", "Cable Bridge", "Gujarat Gas Circle"],
    },
    {
      name: "Varachha",
      slug: "varachha",
      description: "The global epicenter of diamond cutting and polishing with vibrant trade culture.",
      highlights: ["Mini Bazaar", "Hirabaug", "Varachha Main Road", "Sarthana"],
    },
  ],
  lucknow: [
    {
      name: "Gomti Nagar",
      slug: "gomti-nagar",
      description: "Premier planned residential and commercial township featuring riverfront parks and malls.",
      highlights: ["Riverside Mall", "Lulu Mall", "Patrakar Puram", "Gomti Riverfront Park"],
    },
    {
      name: "Hazratganj",
      slug: "hazratganj",
      description: "The historic downtown shopping heart of Lucknow with Victorian-style facades and kebabs.",
      highlights: ["Ganj Carnival", "Janpath Market", "Mayfair", "Halwasiya"],
    },
    {
      name: "Indira Nagar",
      slug: "indira-nagar",
      description: "Sprawling residential colony with prominent medical centers and commercial markets.",
      highlights: ["Bhootnath Market", "Munshipulia", "Aravalli Market", "Lekhraj"],
    },
  ],
  chandigarh: [
    {
      name: "Sector 17",
      slug: "sector-17",
      description: "Chandigarh's central heritage plaza with open-air shopping, fountains, and government buildings.",
      highlights: ["Sector 17 Plaza", "Musical Fountain", "Neelam Cinema", "Shivalik View"],
    },
    {
      name: "Sector 35",
      slug: "sector-35",
      description: "Popular lifestyle and hospitality sector packed with hotels, pubs, and trendy cafes.",
      highlights: ["Sector 35 Inner Market", "JW Marriott", "Aroma Light Point", "Kisan Bhawan"],
    },
    {
      name: "Sector 22",
      slug: "sector-22",
      description: "One of the oldest and liveliest shopping districts famous for Shastri Market.",
      highlights: ["Shastri Market", "Mobile Market", "Kiran Cinema", "Sector 22-B"],
    },
  ],
};

// Precomputed O(1) Hash Maps and Static Array for Instant Retrieval
const POPULAR_LOCAL_AREAS_BY_CITY_MAP = new Map<string, LocalAreaEntry[]>();
const POPULAR_LOCAL_AREAS_BY_SLUG_MAP = new Map<string, LocalAreaEntry>();
const ALL_DEFAULT_LOCAL_AREAS_CACHE: LocalAreaEntry[] = [];

for (const [citySlug, areas] of Object.entries(POPULAR_LOCAL_AREAS_MAP)) {
  const normCity = slugify(citySlug);
  const cityNameFormatted = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
  const cityEntries: LocalAreaEntry[] = [];

  for (const a of areas) {
    const entry: LocalAreaEntry = {
      name: a.name,
      slug: a.slug,
      cityName: cityNameFormatted,
      citySlug: normCity,
      description: a.description,
      highlights: a.highlights,
    };

    cityEntries.push(entry);
    ALL_DEFAULT_LOCAL_AREAS_CACHE.push(entry);

    // Index by both exact slug and slugified name
    const key1 = `${normCity}::${a.slug.toLowerCase().trim()}`;
    const key2 = `${normCity}::${slugify(a.name)}`;
    POPULAR_LOCAL_AREAS_BY_SLUG_MAP.set(key1, entry);
    POPULAR_LOCAL_AREAS_BY_SLUG_MAP.set(key2, entry);
  }

  POPULAR_LOCAL_AREAS_BY_CITY_MAP.set(normCity, cityEntries);
  POPULAR_LOCAL_AREAS_BY_CITY_MAP.set(citySlug.toLowerCase().trim(), cityEntries);
}

/**
 * Get all default local areas for a given city slug or name.
 * Constant-time O(1) Hash Map lookup.
 */
export function getDefaultLocalAreasForCity(citySlugOrName: string): LocalAreaEntry[] {
  if (!citySlugOrName) return [];
  const normalized = slugify(citySlugOrName);
  return (
    POPULAR_LOCAL_AREAS_BY_CITY_MAP.get(normalized) ??
    POPULAR_LOCAL_AREAS_BY_CITY_MAP.get(citySlugOrName.toLowerCase().trim()) ??
    []
  );
}

/**
 * Find a specific default local area by city slug and area slug.
 * Constant-time O(1) composite key Hash Map lookup.
 */
export function findDefaultLocalArea(
  citySlug: string,
  areaSlug: string
): LocalAreaEntry | null {
  if (!citySlug || !areaSlug) return null;
  const normCity = slugify(citySlug);
  const normArea = slugify(areaSlug);
  const key = `${normCity}::${normArea}`;
  return POPULAR_LOCAL_AREAS_BY_SLUG_MAP.get(key) ?? null;
}

/**
 * Returns all default local areas across all cities.
 * Zero-allocation precomputed array reference in O(1) time.
 */
export function getAllDefaultLocalAreas(): LocalAreaEntry[] {
  return ALL_DEFAULT_LOCAL_AREAS_CACHE;
}
