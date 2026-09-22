const fs = require('fs');
const path = require('path');

// Read places.ts
const placesContent = fs.readFileSync(path.join(__dirname, '../src/lib/places.ts'), 'utf8');
const cityMatchRegex = /name:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*state:\s*"([^"]+)"/g;
let match;
const existingStaticCities = [];
while ((match = cityMatchRegex.exec(placesContent)) !== null) {
  existingStaticCities.push({ name: match[1], slug: match[2], state: match[3] });
}

// Read states from state.ts
const stateContent = fs.readFileSync(path.join(__dirname, '../src/lib/models/state.ts'), 'utf8');
const statesMatch = stateContent.match(/DEFAULT_INDIAN_STATES:\s*string\[\]\s*=\s*\[([\s\S]*?)\];/);
const existingStates = [];
if (statesMatch) {
  const lines = statesMatch[1].split('\n');
  for (const line of lines) {
    const m = line.match(/"([^"]+)"/);
    if (m) existingStates.push(m[1]);
  }
}

// Read local areas from local-areas-data.ts
const areaContent = fs.readFileSync(path.join(__dirname, '../src/lib/local-areas-data.ts'), 'utf8');
const cityAreaMatchRegex = /"?([a-z0-9_-]+)"?:\s*\[([\s\S]*?)\](?=,\s*"?[a-z0-9_-]+"?:|\s*\};)/g;
const existingAreasMap = {};
let areaCount = 0;
while ((match = cityAreaMatchRegex.exec(areaContent)) !== null) {
  const cSlug = match[1];
  const block = match[2];
  const names = [];
  const nameRegex = /name:\s*"([^"]+)"/g;
  let nMatch;
  while ((nMatch = nameRegex.exec(block)) !== null) {
    names.push(nMatch[1]);
    areaCount++;
  }
  existingAreasMap[cSlug] = names;
}

console.log('=== AUDIT RESULTS ===');
console.log('Total DEFAULT_INDIAN_STATES:', existingStates.length);
console.log('Total cityPlaces (static cities):', existingStaticCities.length);
console.log('Cities with local areas in POPULAR_LOCAL_AREAS_MAP:', Object.keys(existingAreasMap).length);
console.log('Total static local areas in POPULAR_LOCAL_AREAS_MAP:', areaCount);

// Group cities by state
const citiesByState = {};
for (const s of existingStates) {
  citiesByState[s] = [];
}
for (const c of existingStaticCities) {
  if (citiesByState[c.state]) {
    citiesByState[c.state].push(c.name);
  } else {
    console.log('City with state not in default states list:', c);
  }
}

console.log('\nCities count per state:');
for (const [st, cities] of Object.entries(citiesByState)) {
  console.log(`- ${st}: ${cities.length} cities ${cities.length === 0 ? '--> [MISSING COVERAGE]' : '(' + cities.join(', ') + ')'}`);
}

module.exports = { existingStates, existingStaticCities, existingAreasMap, areaCount };
