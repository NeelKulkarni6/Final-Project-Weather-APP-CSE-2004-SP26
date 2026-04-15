'use strict';

const CITY_FACTS = {
  /* ── USA ── */
  'St. Louis':      'St. Louis invented toasted ravioli, provel cheese, and gooey butter cake. The Gateway Arch at 630 feet is the tallest man-made monument in the Western Hemisphere, and its stainless steel shell expands up to three inches on the hottest summer days.',
  'New York':       'New York City\'s subway has 472 stations, more than any other metro on Earth, and the city is home to over 800 spoken languages, making it the most linguistically diverse urban area in history.',
  'San Francisco':  'San Francisco was almost entirely destroyed in 1906 and rebuilt within a decade. The Golden Gate Bridge uses enough steel wire to circle the Earth three times, and fog rolls through the strait so reliably the NWS issues seasonal fog forecasts for it.',
  'Chicago':        'Chicago\'s L train has run continuously since 1897, and the city built the world\'s first skyscraper in 1884. At its peak, the Chicago stockyards processed more livestock than any place on Earth, earning the city its "Hog Butcher of the World" nickname.',
  'Los Angeles':    'LA has more museums per capita than any other US city and averages 284 sunny days per year. The entire metro sits atop a maze of active fault lines, and the La Brea Tar Pits in the middle of the city still actively trap animals today.',
  'Houston':        'Houston has no formal zoning laws, making it the largest American city without them. Its underground tunnel system stretches over 6 miles beneath downtown, connecting 95 blocks without stepping outside.',
  'Phoenix':        'Phoenix averages 299 sunny days per year and sits at an elevation higher than Denver despite being famous for heat. It grew from 5,000 people in 1900 to over 1.6 million today, making it the fastest-growing major US city of the 20th century.',
  'Philadelphia':   'Philadelphia was the US capital from 1790 to 1800 and has the country\'s most extensive collection of outdoor murals, over 4,000 across the city. It\'s also home to the only remaining street George Washington walked regularly: Elfreth\'s Alley.',
  'San Antonio':    'The San Antonio River Walk runs 15 miles and draws 11 million visitors per year, more than the Alamo itself. The city\'s five Spanish colonial missions are a UNESCO World Heritage Site.',
  'San Diego':      'San Diego has maintained an average annual temperature within a few degrees of 70°F for all of recorded history. Its Balboa Park, built for the 1915 Panama-California Exposition, is larger than Central Park.',
  'Dallas':         'Dallas has more restaurants per capita than New York City, and its Arts District spanning 68 acres downtown is the largest urban arts district in the United States.',
  'San Jose':       'San Jose is the largest city in Northern California yet nearly 40% of Silicon Valley residents were born outside the US, making it one of the most internationally diverse tech hubs on the planet.',
  'Austin':         'Austin has 250 or more live music venues, more per capita than Nashville. Every spring and fall, over 1.5 million Mexican free-tailed bats emerge nightly from under Congress Bridge in the largest urban bat colony in North America.',
  'Seattle':        'Seattle consumes more coffee per capita than any other US city and is the birthplace of Amazon, Starbucks, and Boeing. Paradoxically, it gets less total annual rainfall than New York City, just spread across more grey drizzly days.',
  'Denver':         'Denver is exactly one mile above sea level, and that altitude is marked by a row of gold "C"s on the State Capitol steps. The thin air means a baseball travels about 9% farther there than at sea level.',
  'Nashville':      'Nashville has over 150 recording studios and its music economy contributes roughly $10 billion annually. The city has been "Music City" since WSM radio began broadcasting the Grand Ole Opry in 1927.',
  'Washington':     'Washington D.C. was designed by Pierre Charles L\'Enfant with a grand diagonal street grid, and no building is allowed to be taller than the Capitol. All 19 Smithsonian museums are free to enter.',
  'Las Vegas':      'Las Vegas consumes more neon lighting than any other city on Earth. The Strip uses so much electricity it is clearly visible from space with the naked eye, and the city hosts over 40 million visitors per year.',
  'Atlanta':        'Atlanta is the birthplace of Coca-Cola, Martin Luther King Jr., and CNN. Burned to the ground in 1864, it rose to host the 1996 Summer Olympics just 132 years later.',
  'Miami':          'Miami is the only major US city founded by a woman, Julia Tuttle, in 1896. It is the only US city that borders two national parks and serves as the gateway city to Latin America.',
  'Minneapolis':    'Minneapolis has over 22 miles of enclosed skyway bridges connecting 80 downtown blocks, letting residents commute all winter without going outside. It has more theater seats per capita than any US city except New York.',
  'Portland':       'Portland, Oregon, has the largest urban forest in the US, the 5,000-acre Forest Park, and is the only major American city with an extinct volcano inside its limits. It has more independent bookstores per capita than any other US city.',
  'Pittsburgh':     'Pittsburgh has more bridges than any other city in the world, 446 crossings, even more than Venice. It sits at the confluence of the Allegheny, Monongahela, and Ohio rivers.',
  'Louisville':     'Louisville produces 95% of the world\'s bourbon supply. Every May, the Kentucky Derby fills Churchill Downs with over 150,000 people, making it the most attended horse race on the planet.',
  'Kansas City':    'Kansas City has more public fountains than any city in the world except Rome, over 200. Its BBQ tradition dating to the early 1900s spawned over 100 distinct BBQ restaurants across the metro.',
  'Milwaukee':      'Milwaukee was once the beer capital of the world, home to Pabst, Miller, Schlitz, and Blatz simultaneously. At its early 1900s peak it produced more beer annually than any other city on Earth.',
  'Tampa':          'Tampa\'s Bayshore Boulevard is the world\'s longest continuous sidewalk at 6.5 miles. The Ybor City neighborhood once produced more hand-rolled cigars than anywhere outside Cuba.',
  'Indianapolis':   'Indianapolis hosts the largest single-day sporting event in the world. The Indy 500 draws over 300,000 fans to its 2.5-mile oval each May, roughly filling the Rose Bowl 12 times over.',
  'Baltimore':      'Baltimore\'s Inner Harbor was once the second busiest port of entry in the US. Francis Scott Key wrote the national anthem after watching the 1814 bombardment of Fort McHenry from a ship in the harbor.',
  'Columbus':       'Columbus, Ohio, claims to have invented the cheeseburger in 1934 at Kaelin\'s Restaurant and is home to Ohio State, one of the largest universities in the US by enrollment.',
  'Oklahoma City':  'Oklahoma City moved an entire 1,000-ton church building 150 feet on railroad tracks in 1986 without cracking a single stained-glass window, to make room for a highway.',
  'Tucson':         'Tucson is home to one of the world\'s largest aircraft boneyards at Davis-Monthan AFB, with over 4,000 planes parked in the desert. The dry air keeps them in remarkably good condition.',
  'Albuquerque':    'Albuquerque hosts the world\'s largest hot air balloon festival every October, with over 500 balloons filling the New Mexico sky for 9 days straight.',
  'El Paso':        'El Paso sits at a unique tri-state international convergence of Texas, New Mexico, and the Mexican state of Chihuahua, making it one of the largest bilingual communities in North America.',

  /* ── St. Louis suburbs ── */
  'Clayton':        'Clayton is the seat of St. Louis County, and just miles east the Gateway Arch rises 630 feet above the Mississippi, the tallest man-made monument in the Western Hemisphere. The broader region invented toasted ravioli, provel cheese, and gooey butter cake.',
  'University City':'University City borders St. Louis and is home to Washington University. Just east, the Gateway Arch stands 630 feet tall, and the St. Louis area invented both toasted ravioli and the ice cream cone at the 1904 World\'s Fair.',
  'Kirkwood':       'Kirkwood, founded in 1853, was among the first planned suburban communities west of the Mississippi. Nearby St. Louis hosted the 1904 World\'s Fair in Forest Park, where the ice cream cone and the hot dog bun were introduced to the world.',
  'Chesterfield':   'Chesterfield sits in the Missouri River valley west of St. Louis. The region\'s Gateway Arch, completed in 1965, is the tallest man-made monument in the Western Hemisphere and took exactly 2.5 years to build.',
  'Florissant':     'Florissant is one of Missouri\'s oldest communities, settled by French colonists in the 1780s. Greater St. Louis produced Budweiser beer for over 150 years and its 1904 World\'s Fair drew 20 million visitors.',

  /* ── Chicago suburbs ── */
  'Evanston':       'Evanston is home to Northwestern University and borders Chicago to the north. Chicago\'s L train has run continuously since 1897 and the city built the world\'s first skyscraper, the 10-story Home Insurance Building, in 1884.',
  'Oak Park':       'Oak Park is the birthplace of Ernest Hemingway and home to the world\'s largest collection of Frank Lloyd Wright architecture. Neighboring Chicago built the world\'s first skyscraper in 1884 and once processed more livestock than any place on Earth.',
  'Naperville':     'Naperville consistently ranks among the safest and most livable cities in the US. Just east, Chicago\'s L train has operated every day since 1897 and the city\'s deep-dish pizza has become a global icon.',

  /* ── NYC suburbs ── */
  'Jersey City':    'Jersey City sits across the Hudson from Manhattan and has some of the most dramatic skyline views in the US. New York City\'s subway system beneath it has 472 stations, more than any other metro on Earth.',
  'Hoboken':        'Hoboken is the birthplace of Frank Sinatra and the site of the first organized baseball game in 1846. Just across the Hudson, New York City speaks over 800 languages, more than any other city in history.',
  'Newark':         'Newark is one of the oldest major cities in America, founded in 1666, and home to one of the East Coast\'s busiest airports. The surrounding New York metro has the highest concentration of Fortune 500 headquarters of any US region.',

  /* ── Bay Area suburbs ── */
  'Oakland':        'Oakland is home to the first BART station and one of the West Coast\'s busiest ports. Across the bay, San Francisco\'s Golden Gate Bridge used enough steel wire in its cables to circle the Earth three times.',
  'Berkeley':       'Berkeley\'s UC campus is the world\'s top public university by many rankings and birthplace of the Free Speech Movement in 1964. The broader Bay Area launched Apple, Google, Facebook, and companies now worth over $5 trillion combined.',
  'Palo Alto':      'Palo Alto is the heart of Silicon Valley and home to Stanford University. Companies founded by Stanford alumni have created revenues equivalent to the world\'s tenth-largest economy.',
  'Cupertino':      'Cupertino is the global home of Apple Inc., whose circular campus spans 175 acres and is visible from space. The broader Bay Area files roughly 10% of all US patents annually.',

  /* ── International ── */
  'London':         'London has been continuously inhabited for over 2,000 years. Its Underground, opened in 1863, is the oldest metro system in the world, and the city has seven UNESCO World Heritage Sites, more than any other capital in Europe.',
  'Paris':          'Paris has 6,100 named streets and an entire underground city, the Catacombs, containing the remains of over 6 million people. The Eiffel Tower was originally intended to be torn down after 20 years but was saved because it made a useful radio antenna.',
  'Tokyo':          'Tokyo is the most populous metro area in the world at 38 million people, yet has one of the lowest crime rates of any global megacity. Its rail network moves over 8.7 million passengers per day with average delays under a minute.',
  'Beijing':        'Beijing has been China\'s capital for over 700 years. The Forbidden City contains 980 buildings and housed 24 emperors over five centuries. No foreign army had entered Beijing\'s walls until 1860.',
  'Shanghai':       'Shanghai is the world\'s busiest container port and China\'s financial capital. Its skyline has more buildings over 200 meters tall than New York City, and its Maglev airport train reaches 430 km/h, the fastest commercial train on Earth.',
  'New Delhi':      'New Delhi is part of the world\'s second-largest metro area at over 32 million people. India\'s capital houses the world\'s largest democracy, and Humayun\'s Tomb here, completed in 1572, directly inspired the design of the Taj Mahal.',
  'Mumbai':         'Mumbai\'s Dabbawalas deliver 200,000 lunch boxes daily with near-perfect six-sigma accuracy using no computers. The city generates roughly half of India\'s entire income tax revenue.',
  'Dubai':          'Dubai built the world\'s tallest building (Burj Khalifa, 828m), the world\'s largest man-made island chain, and the world\'s largest indoor ski slope all in roughly 25 years. Less than 15% of Dubai residents are UAE citizens.',
  'Singapore':      'Singapore is the only country to gain independence involuntarily. It produces no natural water, grows almost no food, and has no natural resources, yet boasts one of the world\'s three highest GDP-per-capita figures.',
  'Sydney':         'The Sydney Opera House took 14 years to build and cost 15 times its original budget. Its roof shells contain over a million tiles imported from Sweden, and the Sydney Harbour Bridge opened in 1932 is still the world\'s largest steel arch bridge.',
  'Toronto':        'Toronto is the most culturally diverse city in the world: 51% of residents were born outside Canada. It simultaneously fields major league franchises in the NBA, MLB, NHL, and MLS.',
  'Berlin':         'Berlin has more bridges than Venice (over 1,700) and more museums than rainy days per year. The city was divided by a 96-mile wall for 28 years and is now Europe\'s fastest-growing startup hub.',
  'Amsterdam':      'Amsterdam has more bicycles than people: 900,000 bikes for 800,000 residents. The entire historic city center is built on 11 million wooden piles driven into the marshy ground centuries ago.',
  'Seoul':          'Seoul is home to the world\'s fastest average internet speeds and the world\'s largest indoor theme park. The city\'s Gyeongbokgung Palace was built in 1395 and was the seat of the Joseon dynasty for 500 years.',
  'Mexico City':    'Mexico City is built on the ruins of the Aztec capital Tenochtitlan and sinks about 50 cm per year as ancient lakebed sediment compresses beneath it. It is the largest city in North America.',
  'São Paulo':      'São Paulo is the largest city in the Southern Hemisphere at over 22 million metro residents and has more helicopters per capita than any city on Earth. It hosts the largest Japanese community outside Japan.',
  'Buenos Aires':   'Buenos Aires has more psychiatrists per capita than any city in the world. Named the Paris of South America for its European-style boulevards, it was laid out by French urban planner Joseph-Antoine Bouvard in the early 1900s.',
  'Cairo':          'Cairo is home to the only surviving Wonder of the Ancient World. The Great Pyramid of Giza stood as the tallest man-made structure on Earth for 3,800 years and the city itself has been continuously inhabited for over 5,000 years.',
  'Istanbul':       'Istanbul is the only city in the world spanning two continents and has served as the capital of three great empires: Roman, Byzantine, and Ottoman. The Grand Bazaar, one of the oldest covered markets on Earth, has over 4,000 shops.',
  'Rome':           'Rome contains an entire sovereign nation, Vatican City, within its city limits. Continuously inhabited for over 2,800 years, it has more ancient fountains than any other city on Earth and the Colosseum still stands after 1,900 years.',
  'Bangalore':      'Bangalore, India\'s Silicon Valley, is home to over 1,000 tech companies including the Indian offices of Google, Amazon, and Microsoft. At 3,000 feet above sea level, it has one of the most temperate climates of any major South Asian city.',
  'Bangkok':        'Bangkok\'s full ceremonial name is 168 characters long, officially the longest place name in the world. The city\'s canal network once earned it the nickname "Venice of the East" and it remains the world\'s most visited city by international tourists.',
  'Jakarta':        'Jakarta is sinking faster than almost any other city on Earth, some districts by up to 25 cm per year, due to excessive groundwater extraction. It was the commercial hub of the Dutch East Indies for over 300 years.',
  'Lagos':          'Lagos is Africa\'s largest city and fastest-growing mega-city, adding roughly 77 new residents per hour. It hosts Africa\'s largest film industry, Nollywood, which produces more films annually than Hollywood.',
  'Johannesburg':   'Johannesburg sits atop the world\'s largest gold deposit and was founded in 1886 solely because of the Witwatersrand gold rush. The greater metro is home to more skyscrapers than any other city in sub-Saharan Africa.',
  'Cape Town':      'Cape Town is one of only six places on Earth with a Mediterranean climate and is home to the Cape Floral Region, the world\'s smallest and most biodiverse of the six plant kingdoms. Table Mountain is one of the oldest mountains on Earth at over 600 million years.',
};

/* ── Suburb-to-parent fallback map ─────────────────── */
const SUBURB_PARENT = {
  // St. Louis metro
  'Webster Groves': 'St. Louis', 'Ladue': 'St. Louis', 'Creve Coeur': 'St. Louis',
  'Ballwin': 'St. Louis', 'Maplewood': 'St. Louis', 'Brentwood': 'St. Louis',
  'Belleville': 'St. Louis', 'O\'Fallon': 'St. Louis', 'St. Charles': 'St. Louis',
  // Chicago metro
  'Schaumburg': 'Chicago', 'Skokie': 'Chicago', 'Elgin': 'Chicago',
  'Aurora': 'Chicago', 'Joliet': 'Chicago', 'Rockford': 'Chicago',
  // NYC metro
  'Yonkers': 'New York', 'Stamford': 'New York', 'White Plains': 'New York',
  // Bay Area
  'Mountain View': 'San Francisco', 'Sunnyvale': 'San Francisco',
  'San Mateo': 'San Francisco', 'Fremont': 'San Francisco', 'Hayward': 'San Francisco',
  // DC metro
  'Bethesda': 'Washington', 'Arlington': 'Washington', 'Alexandria': 'Washington',
  // LA area
  'Pasadena': 'Los Angeles', 'Santa Monica': 'Los Angeles', 'Burbank': 'Los Angeles',
  'Glendale': 'Los Angeles', 'Long Beach': 'Los Angeles',
  // Phoenix area
  'Scottsdale': 'Phoenix', 'Tempe': 'Phoenix', 'Mesa': 'Phoenix', 'Chandler': 'Phoenix',
  // Seattle area
  'Bellevue': 'Seattle', 'Redmond': 'Seattle', 'Kirkland': 'Seattle',
};

function getCityFact(cityName) {
  if (!cityName) return null;
  const name = cityName.trim();

  // 1. Exact match
  if (CITY_FACTS[name]) return CITY_FACTS[name];

  // 2. Suburb-to-parent lookup
  if (SUBURB_PARENT[name]) return CITY_FACTS[SUBURB_PARENT[name]] ?? null;

  const lower = name.toLowerCase();

  // 3. Key contains query or query contains key (case-insensitive)
  const match = Object.keys(CITY_FACTS).find(k => {
    const kl = k.toLowerCase();
    return lower === kl || lower.includes(kl) || kl.includes(lower) ||
           lower.split(',')[0].trim() === kl;
  });

  if (match) return CITY_FACTS[match];

  // 4. Suburb parent partial match
  const parentKey = Object.keys(SUBURB_PARENT).find(k => lower.includes(k.toLowerCase()));
  if (parentKey) return CITY_FACTS[SUBURB_PARENT[parentKey]] ?? null;

  return null;
}
