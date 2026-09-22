/**
 * Automated Verification Suite for India Location Database Audit & Expansion.
 */

const fs = require('fs');
const path = require('path');

const {
  normalizeLocationName,
  slugifyLocation,
  resolveCanonicalState,
  resolveCanonicalCity,
  isDuplicateLocation,
} = require('./location-normalizer-helper.js');

const { existingStates: DEFAULT_INDIAN_STATES } = require('./audit-current.js');

// Read places
const placesContent = fs.readFileSync(path.join(__dirname, '../src/lib/places.ts'), 'utf8');
const cityMatchRegex = /name:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*state:\s*"([^"]+)"/g;
let cMatch;
const allPlaces = [];
const cityBySlug = new Map();
while ((cMatch = cityMatchRegex.exec(placesContent)) !== null) {
  const c = { name: cMatch[1], slug: cMatch[2], state: cMatch[3] };
  allPlaces.push(c);
  cityBySlug.set(c.slug.toLowerCase(), c);
}

const { MASTER_LOCAL_AREAS_MAP } = require('./master-local-areas.js');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(` PASS: ${message}`);
    passedTests++;
  } else {
    console.error(` FAIL: ${message}`);
  }
}

console.log('=== STARTING AUTOMATED LOCATION TESTS ===\n');

// Test 1: All 28 states + 8 UTs present
assert(DEFAULT_INDIAN_STATES.length === 36, `Total States + UTs is 36 (Actual: ${DEFAULT_INDIAN_STATES.length})`);

// Test 2: Every State and UT has at least one city in master places
const citiesByState = {};
for (const s of DEFAULT_INDIAN_STATES) citiesByState[s] = [];
for (const p of allPlaces) {
  if (citiesByState[p.state]) {
    citiesByState[p.state].push(p);
  }
}
let statesWithoutCities = 0;
for (const [st, cities] of Object.entries(citiesByState)) {
  if (cities.length === 0) {
    statesWithoutCities++;
    console.error(`State without cities: ${st}`);
  }
}
assert(statesWithoutCities === 0, `All 36 States/UTs have cities in master dataset (0 missing)`);

// Test 3: Punjab has all requested cities
const punjabCities = citiesByState["Punjab"].map(c => c.name);
const requiredPunjabCities = ["Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Hoshiarpur", "Moga", "Firozpur", "Batala", "Abohar", "Khanna", "Phagwara", "Kapurthala"];
let missingPunjab = requiredPunjabCities.filter(c => !punjabCities.includes(c));
assert(missingPunjab.length === 0, `Punjab contains all 15 required cities (Missing: ${missingPunjab.join(', ') || 'None'})`);

// Test 4: All original 50 cities exist and keep their exact slug
const ORIGINAL_50_SLUGS = [
  "mumbai", "delhi", "bengaluru", "kolkata", "chennai", "hyderabad", "pune", "jaipur",
  "ahmedabad", "surat", "lucknow", "kanpur", "nagpur", "indore", "patna", "bhopal",
  "coimbatore", "kochi", "mysuru", "madurai", "thiruvananthapuram", "visakhapatnam",
  "bhubaneswar", "chandigarh", "amritsar", "jodhpur", "udaipur", "ranchi", "raipur",
  "dehradun", "srinagar", "shimla", "gwalior", "varanasi", "agra", "ludhiana",
  "jalandhar", "mangalore", "kozhikode", "thrissur", "tiruchirappalli", "salem",
  "tirupati", "panaji", "nashik", "guwahati", "siliguri", "noida", "gurugram", "faridabad"
];
let missingOriginalSlugs = ORIGINAL_50_SLUGS.filter(slug => !cityBySlug.has(slug));
assert(missingOriginalSlugs.length === 0, `All 50 original city slugs preserved verbatim (Missing: ${missingOriginalSlugs.join(', ') || 'None'})`);

// Test 5: Alias Resolution
assert(resolveCanonicalCity("bangalore").canonicalName === "Bengaluru", 'Alias "bangalore" resolves to "Bengaluru"');
assert(resolveCanonicalCity("bombay").canonicalName === "Mumbai", 'Alias "bombay" resolves to "Mumbai"');
assert(resolveCanonicalCity("calcutta").canonicalName === "Kolkata", 'Alias "calcutta" resolves to "Kolkata"');
assert(resolveCanonicalCity("madras").canonicalName === "Chennai", 'Alias "madras" resolves to "Chennai"');
assert(resolveCanonicalCity("gurgaon").canonicalName === "Gurugram", 'Alias "gurgaon" resolves to "Gurugram"');
assert(resolveCanonicalCity("baroda").canonicalName === "Vadodara", 'Alias "baroda" resolves to "Vadodara"');
assert(resolveCanonicalCity("allahabad").canonicalName === "Prayagraj", 'Alias "allahabad" resolves to "Prayagraj"');
assert(resolveCanonicalState("orissa").canonicalName === "Odisha", 'Alias "orissa" resolves to "Odisha"');
assert(resolveCanonicalState("uttaranchal").canonicalName === "Uttarakhand", 'Alias "uttaranchal" resolves to "Uttarakhand"');
assert(resolveCanonicalState("pondicherry").canonicalName === "Puducherry", 'Alias "pondicherry" resolves to "Puducherry"');

// Test 6: Duplicate detection with whitespace, case, and aliases
const testExisting = [{ name: "Bengaluru", slug: "bengaluru" }];
assert(isDuplicateLocation("Bangalore", testExisting, "city") === true, 'Duplicate detected: "Bangalore" matches "Bengaluru"');
assert(isDuplicateLocation("  bengaluru  ", testExisting, "city") === true, 'Duplicate detected: whitespace & case variation');
assert(isDuplicateLocation("BENGALURU", testExisting, "city") === true, 'Duplicate detected: all uppercase');
assert(isDuplicateLocation("bengaluru", testExisting, "city") === true, 'Duplicate detected: all lowercase');
assert(isDuplicateLocation("Mysuru", testExisting, "city") === false, 'Different city "Mysuru" not flagged as duplicate');

// Test 7: Local Area Coverage for Major Cities
const delhiAreas = (MASTER_LOCAL_AREAS_MAP["delhi"] || []).map(a => a.name);
const requiredDelhiAreas = ["Connaught Place", "Karol Bagh", "Lajpat Nagar", "Saket", "Vasant Kunj", "Dwarka", "Rohini", "Pitampura", "Janakpuri", "Rajouri Garden", "Greater Kailash", "Hauz Khas", "Malviya Nagar", "South Extension", "Chandni Chowk", "Paharganj", "Defence Colony", "Mayur Vihar", "Shahdara", "Nehru Place"];
let missingDelhiAreas = requiredDelhiAreas.filter(a => !delhiAreas.includes(a));
assert(missingDelhiAreas.length === 0, `Delhi contains all 20 required neighborhoods (Missing: ${missingDelhiAreas.join(', ') || 'None'})`);

const mumbaiAreas = (MASTER_LOCAL_AREAS_MAP["mumbai"] || []).map(a => a.name);
const requiredMumbaiAreas = ["Andheri West", "Bandra West", "Borivali West", "Juhu", "Powai", "Worli", "Colaba", "Dadar", "Lower Parel", "Malad West", "Goregaon West", "Kandivali West", "Kurla West", "Chembur", "Vile Parle", "Ghatkopar", "Mulund", "Thane West"];
let missingMumbaiAreas = requiredMumbaiAreas.filter(a => !mumbaiAreas.includes(a));
assert(missingMumbaiAreas.length === 0, `Mumbai contains all required neighborhoods (Missing: ${missingMumbaiAreas.join(', ') || 'None'})`);

const bengaluruAreas = (MASTER_LOCAL_AREAS_MAP["bengaluru"] || []).map(a => a.name);
const requiredBengaluruAreas = ["Whitefield", "Indiranagar", "Koramangala", "HSR Layout", "Electronic City", "Marathahalli", "BTM Layout", "Jayanagar", "Rajajinagar", "Malleshwaram", "Yelahanka", "Hebbal", "Banashankari", "JP Nagar", "Bellandur", "Sarjapur Road"];
let missingBengaluruAreas = requiredBengaluruAreas.filter(a => !bengaluruAreas.includes(a));
assert(missingBengaluruAreas.length === 0, `Bengaluru contains all 16 required neighborhoods (Missing: ${missingBengaluruAreas.join(', ') || 'None'})`);

const hyderabadAreas = (MASTER_LOCAL_AREAS_MAP["hyderabad"] || []).map(a => a.name);
const requiredHydAreas = ["Banjara Hills", "Jubilee Hills", "Hitech City", "Madhapur", "Gachibowli", "Kondapur", "Kukatpally", "Begumpet", "Secunderabad", "Ameerpet", "Mehdipatnam", "Manikonda"];
let missingHydAreas = requiredHydAreas.filter(a => !hyderabadAreas.includes(a));
assert(missingHydAreas.length === 0, `Hyderabad contains all 12 required neighborhoods (Missing: ${missingHydAreas.join(', ') || 'None'})`);

// Summary
console.log('\n=======================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('=======================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
