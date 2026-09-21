export type CityPlace = {
  name: string;
  slug: string;
  state?: string;
  region: string;
  famousFood: string;
  seoDescription: string;
};

export const cityPlaces: CityPlace[] = [
  {
    name: "Mumbai",
    slug: "mumbai",
    state: "Maharashtra",
    region: "India",
    famousFood: "Vada pav, pav bhaji, bhel puri, and Bombay sandwich",
    seoDescription:
      "Mumbai is famous for street food favorites like vada pav, pav bhaji, bhel puri, and Bombay sandwich, making it one of India's most loved food cities.",
  },
  {
    name: "Delhi",
    slug: "delhi",
    state: "Delhi",
    region: "India",
    famousFood: "Chole bhature, parathas, kebabs, and chaat",
    seoDescription:
      "Delhi is known for chole bhature, stuffed parathas, flavorful kebabs, and tangy chaat found in old city lanes and modern markets across the capital.",
  },
  {
    name: "Bengaluru",
    slug: "bengaluru",
    state: "Karnataka",
    region: "India",
    famousFood: "Masala dosa, idli, filter coffee, and bisi bele bath",
    seoDescription:
      "Bengaluru is famous for masala dosa, soft idli, strong filter coffee, and bisi bele bath, blending South Indian comfort food with a lively cafe culture.",
  },
  {
    name: "Kolkata",
    slug: "kolkata",
    state: "West Bengal",
    region: "India",
    famousFood: "Kathi rolls, rosogolla, mishti doi, and fish curry",
    seoDescription:
      "Kolkata is famous for kathi rolls, rosogolla, mishti doi, and fish curry, making it one of India's richest cities for sweets and street food.",
  },
  {
    name: "Chennai",
    slug: "chennai",
    state: "Tamil Nadu",
    region: "India",
    famousFood: "Idli, dosa, pongal, filter coffee, and seafood",
    seoDescription:
      "Chennai is known for idli, dosa, pongal, strong filter coffee, and coastal seafood dishes that showcase the city's deep South Indian food traditions.",
  },
  {
    name: "Hyderabad",
    slug: "hyderabad",
    state: "Telangana",
    region: "India",
    famousFood: "Hyderabadi biryani, haleem, kebabs, and double ka meetha",
    seoDescription:
      "Hyderabad is famous for its aromatic biryani, rich haleem, juicy kebabs, and sweets like double ka meetha, giving the city a strong culinary identity.",
  },
  {
    name: "Pune",
    slug: "pune",
    state: "Maharashtra",
    region: "India",
    famousFood: "Misal pav, vada pav, bhakarwadi, and mastani",
    seoDescription:
      "Pune is famous for misal pav, vada pav, bhakarwadi, and mastani, with a street food culture loved by students and locals alike.",
  },
  {
    name: "Jaipur",
    slug: "jaipur",
    state: "Rajasthan",
    region: "India",
    famousFood: "Dal baati churma, ghewar, kachori, and laal maas",
    seoDescription:
      "Jaipur is known for dal baati churma, sweet ghewar, kachori, and spicy laal maas, giving the city a distinct Rajasthani food identity.",
  },
  {
    name: "Ahmedabad",
    slug: "ahmedabad",
    state: "Gujarat",
    region: "India",
    famousFood: "Dhokla, fafda, jalebi, and Gujarati thali",
    seoDescription:
      "Ahmedabad is famous for dhokla, fafda, jalebi, and the traditional Gujarati thali, making it a standout city for vegetarian food lovers.",
  },
  {
    name: "Surat",
    slug: "surat",
    state: "Gujarat",
    region: "India",
    famousFood: "Locho, khaman, sev khamani, and surti ghari",
    seoDescription:
      "Surat is well known for locho, khaman, sev khamani, and surti ghari, with a snack-rich food culture that keeps the city buzzing.",
  },
  {
    name: "Lucknow",
    slug: "lucknow",
    state: "Uttar Pradesh",
    region: "India",
    famousFood: "Tunday kebab, biryani, sheermal, and kulfi",
    seoDescription:
      "Lucknow is famous for Tunday kebabs, fragrant biryani, sheermal, and kulfi, reflecting its refined Awadhi culinary tradition.",
  },
  {
    name: "Kanpur",
    slug: "kanpur",
    state: "Uttar Pradesh",
    region: "India",
    famousFood: "Chaat, samosa, kachori, and thandai",
    seoDescription:
      "Kanpur is known for chaat, samosa, kachori, and thandai, with busy markets and local stalls offering simple but flavorful food.",
  },
  {
    name: "Nagpur",
    slug: "nagpur",
    state: "Maharashtra",
    region: "India",
    famousFood: "Saoji curry, tarri poha, oranges, and samosas",
    seoDescription:
      "Nagpur is famous for spicy Saoji curry, tarri poha, oranges, and samosas, creating a strong and memorable local food identity.",
  },
  {
    name: "Indore",
    slug: "indore",
    state: "Madhya Pradesh",
    region: "India",
    famousFood: "Poha jalebi, bhutte ka kees, garadu, and chaat",
    seoDescription:
      "Indore is famous for poha jalebi, bhutte ka kees, garadu, and chaat, making it one of India's most beloved street food destinations.",
  },
  {
    name: "Patna",
    slug: "patna",
    state: "Bihar",
    region: "India",
    famousFood: "Litti chokha, sattu paratha, tilkut, and khaja",
    seoDescription:
      "Patna is known for litti chokha, sattu paratha, tilkut, and khaja, showcasing the rich and rustic flavors of Bihar.",
  },
  {
    name: "Bhopal",
    slug: "bhopal",
    state: "Madhya Pradesh",
    region: "India",
    famousFood: "Biryani, kebabs, poha, and bhutte ka kees",
    seoDescription:
      "Bhopal blends royal and everyday flavors, with biryani, kebabs, poha, and bhutte ka kees among its most famous foods.",
  },
  {
    name: "Coimbatore",
    slug: "coimbatore",
    state: "Tamil Nadu",
    region: "India",
    famousFood: "Idli, dosa, biryani, and street filter coffee",
    seoDescription:
      "Coimbatore is known for idli, dosa, biryani, and strong filter coffee, offering the comforting flavors of Tamil Nadu cuisine.",
  },
  {
    name: "Kochi",
    slug: "kochi",
    state: "Kerala",
    region: "India",
    famousFood: "Appam, seafood curry, puttu, and banana chips",
    seoDescription:
      "Kochi is famous for appam, seafood curry, puttu, and banana chips, with coastal Kerala flavors shaping the city's food identity.",
  },
  {
    name: "Mysuru",
    slug: "mysuru",
    state: "Karnataka",
    region: "India",
    famousFood: "Mysore pak, dosa, idli, and bisibele bath",
    seoDescription:
      "Mysuru is known for Mysore pak, dosa, idli, and bisibele bath, offering a royal South Indian food experience with classic sweets and comfort meals.",
  },
  {
    name: "Madurai",
    slug: "madurai",
    state: "Tamil Nadu",
    region: "India",
    famousFood: "Jigarthanda, parotta, kari dosai, and idiyappam",
    seoDescription:
      "Madurai is famous for jigarthanda, flaky parotta, kari dosai, and idiyappam, making it one of Tamil Nadu's most iconic food cities.",
  },
  {
    name: "Thiruvananthapuram",
    slug: "thiruvananthapuram",
    state: "Kerala",
    region: "India",
    famousFood: "Puttu, kadala curry, appam, and fish curry",
    seoDescription:
      "Thiruvananthapuram is known for puttu, kadala curry, appam, and fish curry, highlighting the traditional flavors of Kerala cuisine.",
  },
  {
    name: "Visakhapatnam",
    slug: "visakhapatnam",
    state: "Andhra Pradesh",
    region: "India",
    famousFood: "Bongu chicken, fish fry, punugulu, and prawn curry",
    seoDescription:
      "Visakhapatnam is famous for bongu chicken, fish fry, punugulu, and prawn curry, with coastal Andhra flavors shaping the local food scene.",
  },
  {
    name: "Bhubaneswar",
    slug: "bhubaneswar",
    state: "Odisha",
    region: "India",
    famousFood: "Dalma, chhena poda, pakhala bhata, and bara ghuguni",
    seoDescription:
      "Bhubaneswar is known for dalma, chhena poda, pakhala bhata, and bara ghuguni, offering a strong taste of Odia traditional food.",
  },
  {
    name: "Chandigarh",
    slug: "chandigarh",
    state: "Chandigarh",
    region: "India",
    famousFood: "Chole bhature, butter chicken, paneer tikka, and lassi",
    seoDescription:
      "Chandigarh is famous for chole bhature, butter chicken, paneer tikka, and lassi, reflecting the rich North Indian food culture of the region.",
  },
  {
    name: "Amritsar",
    slug: "amritsar",
    state: "Punjab",
    region: "India",
    famousFood: "Amritsari kulcha, chole, lassi, and fish fry",
    seoDescription:
      "Amritsar is famous for Amritsari kulcha, spicy chole, creamy lassi, and crisp fish fry, making it a top destination for Punjabi food lovers.",
  },
  {
    name: "Jodhpur",
    slug: "jodhpur",
    state: "Rajasthan",
    region: "India",
    famousFood: "Makhaniya lassi, mirchi vada, pyaaz kachori, and dal bati",
    seoDescription:
      "Jodhpur is known for makhaniya lassi, mirchi vada, pyaaz kachori, and dal bati, giving the Blue City its signature Rajasthani flavors.",
  },
  {
    name: "Udaipur",
    slug: "udaipur",
    state: "Rajasthan",
    region: "India",
    famousFood: "Dal baati churma, gatte ki sabzi, kachori, and ghevar",
    seoDescription:
      "Udaipur is famous for dal baati churma, gatte ki sabzi, kachori, and ghevar, offering a rich and royal Rajasthani dining experience.",
  },
  {
    name: "Ranchi",
    slug: "ranchi",
    state: "Jharkhand",
    region: "India",
    famousFood: "Litti chokha, dhuska, chilka roti, and bamboo shoot dishes",
    seoDescription:
      "Ranchi is known for litti chokha, dhuska, chilka roti, and bamboo shoot dishes, showcasing the rustic flavors of Jharkhand cuisine.",
  },
  {
    name: "Raipur",
    slug: "raipur",
    state: "Chhattisgarh",
    region: "India",
    famousFood: "Chila, fara, muthiya, and amti",
    seoDescription:
      "Raipur is famous for chila, fara, muthiya, and amti, giving visitors a taste of traditional Chhattisgarhi food.",
  },
  {
    name: "Dehradun",
    slug: "dehradun",
    state: "Uttarakhand",
    region: "India",
    famousFood: "Bal mithai, aloo ke gutke, momos, and singori",
    seoDescription:
      "Dehradun is known for bal mithai, aloo ke gutke, momos, and singori, combining hill-state sweets with popular local snacks.",
  },
  {
    name: "Srinagar",
    slug: "srinagar",
    state: "Jammu and Kashmir",
    region: "India",
    famousFood: "Rogan josh, yakhni, kahwa, and wazwan dishes",
    seoDescription:
      "Srinagar is famous for rogan josh, yakhni, kahwa, and traditional wazwan dishes, reflecting the rich culinary heritage of Kashmir.",
  },
  {
    name: "Shimla",
    slug: "shimla",
    state: "Himachal Pradesh",
    region: "India",
    famousFood: "Madra, siddu, chana madra, and fruit chaat",
    seoDescription:
      "Shimla is known for madra, siddu, chana madra, and fruit chaat, bringing the flavors of Himachal Pradesh to the hill station table.",
  },
  {
    name: "Gwalior",
    slug: "gwalior",
    state: "Madhya Pradesh",
    region: "India",
    famousFood: "Bedai, jalebi, kachori, and poha",
    seoDescription:
      "Gwalior is famous for bedai, jalebi, kachori, and poha, making it a strong stop for classic North Indian breakfast and snack food.",
  },
  {
    name: "Varanasi",
    slug: "varanasi",
    state: "Uttar Pradesh",
    region: "India",
    famousFood: "Kachori sabzi, tamatar chaat, malaiyyo, and lassi",
    seoDescription:
      "Varanasi is famous for kachori sabzi, tamatar chaat, malaiyyo, and lassi, with its street food culture deeply tied to the city's heritage.",
  },
  {
    name: "Agra",
    slug: "agra",
    state: "Uttar Pradesh",
    region: "India",
    famousFood: "Petha, bedai, dalmoth, and chaat",
    seoDescription:
      "Agra is known for petha, bedai, dalmoth, and chaat, offering visitors sweet and savory specialties beyond its famous monuments.",
  },
  {
    name: "Ludhiana",
    slug: "ludhiana",
    state: "Punjab",
    region: "India",
    famousFood: "Butter chicken, paneer tikka, lassi, and parathas",
    seoDescription:
      "Ludhiana is famous for butter chicken, paneer tikka, lassi, and parathas, reflecting the hearty and rich flavors of Punjab.",
  },
  {
    name: "Jalandhar",
    slug: "jalandhar",
    state: "Punjab",
    region: "India",
    famousFood: "Amritsari kulcha, chole, tikki, and lassi",
    seoDescription:
      "Jalandhar is known for Amritsari kulcha, chole, tikki, and lassi, with strong Punjabi flavors that make the city a food favorite.",
  },
  {
    name: "Mangalore",
    slug: "mangalore",
    state: "Karnataka",
    region: "India",
    famousFood: "Mangalore bun, fish curry, neer dosa, and ghee roast",
    seoDescription:
      "Mangalore is famous for Mangalore bun, fish curry, neer dosa, and ghee roast, showcasing the coastal cuisine of Karnataka.",
  },
  {
    name: "Kozhikode",
    slug: "kozhikode",
    state: "Kerala",
    region: "India",
    famousFood: "Kallummakkaya, biryani, halwa, and pathiri",
    seoDescription:
      "Kozhikode is known for biryani, halwa, pathiri, and Kallummakkaya, making it one of Kerala's most celebrated food destinations.",
  },
  {
    name: "Thrissur",
    slug: "thrissur",
    state: "Kerala",
    region: "India",
    famousFood: "Puttu, kadala curry, palada pradhaman, and fish curry",
    seoDescription:
      "Thrissur is famous for puttu, kadala curry, palada pradhaman, and fish curry, offering a true taste of Kerala hospitality.",
  },
  {
    name: "Tiruchirappalli",
    slug: "tiruchirappalli",
    state: "Tamil Nadu",
    region: "India",
    famousFood: "Sambar, idli, dosa, and kavuni rice",
    seoDescription:
      "Tiruchirappalli is known for sambar, idli, dosa, and kavuni rice, bringing traditional Tamil food to the forefront.",
  },
  {
    name: "Salem",
    slug: "salem",
    state: "Tamil Nadu",
    region: "India",
    famousFood: "Kongunadu biryani, idiyappam, and spicy gravies",
    seoDescription:
      "Salem is famous for Kongunadu biryani, idiyappam, and spicy gravies, reflecting the bold flavors of western Tamil Nadu.",
  },
  {
    name: "Tirupati",
    slug: "tirupati",
    state: "Andhra Pradesh",
    region: "India",
    famousFood: "Laddu, pulihora, dosa, and vada",
    seoDescription:
      "Tirupati is famous for its laddu, pulihora, dosa, and vada, with temple food traditions playing a big role in the city's identity.",
  },
  {
    name: "Panaji",
    slug: "panaji",
    state: "Goa",
    region: "India",
    famousFood: "Goan fish curry, bebinca, xacuti, and cafreal",
    seoDescription:
      "Panaji is known for Goan fish curry, bebinca, xacuti, and cafreal, offering classic coastal flavors from the heart of Goa.",
  },
  {
    name: "Nashik",
    slug: "nashik",
    state: "Maharashtra",
    region: "India",
    famousFood: "Misal pav, sabudana vada, thalipeeth, and grapes",
    seoDescription:
      "Nashik is famous for misal pav, sabudana vada, thalipeeth, and grapes, with a food culture rooted in Maharashtra's comforting flavors.",
  },
  {
    name: "Guwahati",
    slug: "guwahati",
    state: "Assam",
    region: "India",
    famousFood: "Pitha, masor tenga, bamboo shoot dishes, and laru",
    seoDescription:
      "Guwahati is known for pitha, masor tenga, bamboo shoot dishes, and laru, offering a strong introduction to Assamese cuisine.",
  },
  {
    name: "Siliguri",
    slug: "siliguri",
    state: "West Bengal",
    region: "India",
    famousFood: "Momos, thukpa, phuchka, and tea snacks",
    seoDescription:
      "Siliguri is famous for momos, thukpa, phuchka, and tea snacks, reflecting its Himalayan influence and bustling food culture.",
  },
  {
    name: "Noida",
    slug: "noida",
    state: "Uttar Pradesh",
    region: "India",
    famousFood: "Street momos, chaat, rolls, and North Indian meals",
    seoDescription:
      "Noida is known for street momos, chaat, rolls, and North Indian meals, with a modern food scene that serves workers and families alike.",
  },
  {
    name: "Gurugram",
    slug: "gurugram",
    state: "Haryana",
    region: "India",
    famousFood: "Butter chicken, rolls, biryani, and cafe food",
    seoDescription:
      "Gurugram is famous for butter chicken, rolls, biryani, and cafe food, making it one of the most popular dining hubs in the Delhi NCR region.",
  },
  {
    name: "Faridabad",
    slug: "faridabad",
    state: "Haryana",
    region: "India",
    famousFood: "Chaat, tandoori snacks, parathas, and sweets",
    seoDescription:
      "Faridabad is known for chaat, tandoori snacks, parathas, and sweets, giving the city a simple but popular food identity.",
  },
];

// Precomputed O(1) Hash Maps and Adjacency Lists
const cityBySlugMap = new Map<string, CityPlace>();
const cityByNameMap = new Map<string, CityPlace>();
const citiesByStateMap = new Map<string, CityPlace[]>();

for (const city of cityPlaces) {
  const sSlug = city.slug.toLowerCase().trim();
  const sName = city.name.toLowerCase().trim();
  cityBySlugMap.set(sSlug, city);
  cityByNameMap.set(sName, city);

  if (city.state) {
    const stKey = city.state.toLowerCase().trim();
    let stateList = citiesByStateMap.get(stKey);
    if (!stateList) {
      stateList = [];
      citiesByStateMap.set(stKey, stateList);
    }
    stateList.push(city);
  }
}

/**
 * Constant-time O(1) lookup of a static city place by slug.
 */
export const getCityBySlug = (slug: string): CityPlace | undefined => {
  if (!slug) return undefined;
  return cityBySlugMap.get(slug.toLowerCase().trim());
};

/**
 * Constant-time O(1) lookup of a static city place by name.
 */
export const getCityByName = (name: string): CityPlace | undefined => {
  if (!name) return undefined;
  return cityByNameMap.get(name.toLowerCase().trim());
};

/**
 * Constant-time O(1) retrieval of all static cities belonging to a state.
 */
export const getCitiesByState = (stateName: string): CityPlace[] => {
  if (!stateName) return [];
  return citiesByStateMap.get(stateName.toLowerCase().trim()) ?? [];
};
