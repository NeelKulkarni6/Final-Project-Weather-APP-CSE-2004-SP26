'use strict';

/**
 * City fun facts — displayed below the hero card on load / city change
 * Keys should match city names returned by the Geocoding + Nominatim APIs
 */
const CITY_FACTS = {
  /* ── USA ── */
  'St. Louis':       'Known as the "Gateway to the West," St. Louis is home to the iconic 630-foot stainless steel Arch, invented toasted ravioli, and brewed Budweiser for over 150 years.',
  'New York':        'New York City\'s subway system has 472 stations — more than any other metro system on Earth — and the city is home to over 800 spoken languages.',
  'Los Angeles':     'LA has more museums per capita than any other city in the US, and gets more sunshine per year than Miami — about 284 sunny days on average.',
  'Chicago':         'Chicago\'s "L" train network has run continuously since 1897, and the city is technically home to the world\'s first skyscraper — the 10-story Home Insurance Building from 1884.',
  'Houston':         'Houston has no formal zoning laws, making it the largest American city to operate without them, and its underground tunnel system stretches over 6 miles beneath downtown.',
  'Phoenix':         'Phoenix averages 299 sunny days per year and sits at an elevation higher than Denver — despite being famous for desert heat.',
  'Philadelphia':    'Philadelphia was the US capital from 1790 to 1800 and has the country\'s most extensive collection of outdoor murals — over 4,000 across the city.',
  'San Antonio':     'The San Antonio River Walk, opened in 1941, runs 15 miles and hosts over 11 million visitors per year — more than the Alamo itself.',
  'San Diego':       'San Diego has maintained an average annual temperature within a few degrees of 70°F for recorded history, earning it the title "America\'s Finest City."',
  'Dallas':          'Dallas has more restaurants per capita than New York City, and the Dallas Arts District is the largest urban arts district in the entire United States.',
  'San Jose':        'San Jose is the largest city in Northern California and the third-largest in the state — yet nearly 40% of Silicon Valley\'s residents were born outside the US.',
  'Austin':          'Austin claims 250+ live music venues — more venues per capita than Nashville — and the city officially bats out over 1.5 million Mexican free-tailed bats nightly from under Congress Bridge.',
  'Jacksonville':    'Jacksonville is the largest city by area in the contiguous United States, covering over 840 square miles after merging with Duval County in 1968.',
  'San Francisco':   'San Francisco was almost entirely destroyed in 1906 and rebuilt within a decade. The Golden Gate Bridge uses enough steel wire to wrap the Earth three times over.',
  'Columbus':        'Columbus, Ohio, is home to the world\'s largest private research university by enrollment, Ohio State, and invented the drive-through window at a Wendy\'s in 1970.',
  'Indianapolis':    'Indianapolis hosts the largest single-day sporting event in the world — the Indy 500 — drawing over 300,000 fans to the 2.5-mile oval each May.',
  'Seattle':         'Seattle consumes the most coffee per capita of any US city, has more natural beauty within city limits than almost anywhere, and invented Amazon, Starbucks, and Boeing.',
  'Denver':          'Denver is exactly one mile above sea level (5,280 feet), the exact altitude is marked by a gold "C" on the State Capitol steps, and the city gets more annual sunshine than Miami.',
  'Nashville':       'Nashville has over 150 recording studios, and its nickname "Music City" is backed by 180+ live music venues — the city contributes $10 billion annually to the music economy.',
  'Oklahoma City':   'Oklahoma City moved an entire 1,000-ton church building in 1986 to make room for a highway, rolling it 150 feet on railroad tracks.',
  'El Paso':         'El Paso sits in a unique tri-state area where Texas, New Mexico, and the Mexican state of Chihuahua converge, making it one of the largest bilingual communities in North America.',
  'Washington':      'Washington, D.C. was designed by Pierre Charles L\'Enfant with embedded Masonic geometry, and no building in the city is allowed to be taller than the Capitol dome.',
  'Las Vegas':       'Las Vegas consumes more neon lighting than any other city on Earth, and the Strip uses so much electricity it can be clearly seen from space with the naked eye.',
  'Louisville':      'Louisville produces 95% of the world\'s bourbon supply, and its name is derived from French King Louis XVI who allied with the American Revolutionaries.',
  'Baltimore':       'Baltimore\'s Inner Harbor was once the second busiest port of entry in the US, and the city is credited with inventing the national anthem, the railway sleeping car, and the ice cream freezer.',
  'Milwaukee':       'Milwaukee is the beer capital of America — home to Pabst, Miller, and Schlitz — and once produced more beer than any other city in the world.',
  'Albuquerque':     'Albuquerque hosts the world\'s largest hot air balloon festival every October, with over 500 balloons filling the New Mexico sky for 9 days.',
  'Tucson':          'Tucson is home to one of the world\'s largest aircraft storage "boneyards" at Davis-Monthan Air Force Base, with over 4,000 aircraft parked in the desert.',
  'Kansas City':     'Kansas City has more fountains than any city in the world except Rome — over 200 — and the Kansas City BBQ tradition dates to the early 1900s.',
  'Atlanta':         'Atlanta is the birthplace of Coca-Cola, Martin Luther King Jr., and CNN, and it was burned to the ground in 1864 only to rise and host the 1996 Summer Olympics.',
  'Minneapolis':     'Minneapolis has over 22 miles of enclosed skyway bridges connecting 80 blocks of downtown — letting residents commute all winter without going outside.',
  'Portland':        'Portland, Oregon, has the largest urban forest in the United States — 5,000-acre Forest Park — and is the only US city with an extinct volcano within city limits (Mt. Tabor).',
  'Miami':           'Miami is the only major US city founded by a woman, Julia Tuttle, who convinced Henry Flagler to extend his railroad south by sending him orange blossoms during a freeze.',
  'Tampa':           'Tampa is home to the world\'s longest continuous sidewalk — a 6.5-mile promenade along Bayshore Boulevard — and produces more hand-rolled cigars than anywhere outside Cuba.',
  'Pittsburgh':      'Pittsburgh has more bridges than any other city in the world — 446 — even more than Venice. It sits at the confluence of three major rivers.',
  'Cincinnati':      'Cincinnati was the first professional baseball team city (1869 Red Stockings) and is credited with inventing the first practical mechanical potato peeler.',

  /* ── World Cities ── */
  'London':          'London has been continuously inhabited for over 2,000 years and served as capital of the Roman Empire\'s largest province. The city has seven World Heritage Sites within its boundaries.',
  'Paris':           'Paris has 6,100 streets, 470 underground Metro stations, and an entire city of catacombs beneath it — containing the remains of over 6 million people.',
  'Tokyo':           'Tokyo is the most populous metropolitan area in the world with 38 million people, yet its crime rate is among the lowest globally. The city has over 100,000 restaurants.',
  'Beijing':         'Beijing has been the capital of China for over 700 years and is home to the Forbidden City — the world\'s largest preserved palace complex with 980 buildings.',
  'Sydney':          'The Sydney Opera House took 14 years to build (1959–1973), cost 15 times the original budget, and its roof shells contain over 1 million tiles imported from Sweden.',
  'Dubai':           'Dubai built the world\'s tallest building (Burj Khalifa, 828m), the world\'s largest man-made island, and the world\'s largest shopping mall — all in roughly 20 years.',
  'Toronto':         'Toronto is the most culturally diverse city in the world — 51% of its residents were born outside Canada — and has hosted the NBA, MLB, and NHL simultaneously.',
  'Mumbai':          'Mumbai\'s Dabbawalas deliver 200,000 lunch boxes across the city every day with a near-perfect six-sigma accuracy rate, using no computers and almost entirely on bicycles.',
  'Singapore':       'Singapore is the only country to gain independence involuntarily. It produces no natural water, grows no food, and has no natural resources — yet has the world\'s third-highest GDP per capita.',
  'Berlin':          'Berlin has more bridges than Venice (over 1,700), more museums than rainy days per year, and was reunified in 1990 after 28 years of Cold War division.',
  'Mexico City':     'Mexico City is built on the ruins of the ancient Aztec capital Tenochtitlan, sinks about 50 cm per year on average, and is the largest city in North America.',
  'São Paulo':       'São Paulo is the largest city in the Southern Hemisphere with 22 million metro residents, has more helicopters per capita than any other city on Earth, and the world\'s most restaurants.',
  'Buenos Aires':    'Buenos Aires has more psychiatrists per capita than any city in the world and is named "The Paris of South America" for its European-style boulevards and architecture.',
  'Cairo':           'Cairo is home to the only surviving Wonder of the Ancient World — the Great Pyramid of Giza — and has been continuously inhabited for over 5,000 years.',
  'Istanbul':        'Istanbul is the only city in the world that spans two continents (Europe and Asia) and has served as the capital of three great empires: Roman, Byzantine, and Ottoman.',
};

/**
 * Look up a fun fact for a given city name.
 * Tries: exact match → partial match → null.
 * @param {string} cityName
 * @returns {string|null}
 */
function getCityFact(cityName) {
  if (!cityName) return null;

  // Exact match
  if (CITY_FACTS[cityName]) return CITY_FACTS[cityName];

  const lower = cityName.toLowerCase();

  // Key contains query or query contains key
  const match = Object.keys(CITY_FACTS).find(k => {
    const kl = k.toLowerCase();
    return lower.includes(kl) || kl.includes(lower) ||
           lower.split(',')[0].trim() === kl;
  });

  return match ? CITY_FACTS[match] : null;
}
