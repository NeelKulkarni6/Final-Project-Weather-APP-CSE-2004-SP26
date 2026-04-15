'use strict';

/* ════════════════════════════════════════════════════════
   Aura Weather — What Should I Wear?
   ════════════════════════════════════════════════════════ */

const OSTATE = { gender: 'male', weather: null, unit: 'F', location: null };

document.addEventListener('DOMContentLoaded', outfitInit);

async function outfitInit() {
  OSTATE.unit     = lsGet(LS.UNIT, 'F');
  OSTATE.location = lsGet(LS.LOCATION, {
    name: 'St. Louis', state: 'Missouri', country: 'US',
    lat: 38.627, lon: -90.197, timezone: 'America/Chicago',
  });

  document.querySelectorAll('.gender-card').forEach(btn => {
    btn.addEventListener('click', () => {
      OSTATE.gender = btn.dataset.gender;
      document.querySelectorAll('.gender-card').forEach(b => b.classList.toggle('active', b === btn));
      if (OSTATE.weather) renderOutfit();
    });
  });

  const loc  = OSTATE.location;
  const el   = document.getElementById('outfit-location');
  if (el) el.textContent = loc.name + (loc.state ? ', ' + loc.state : '');

  document.getElementById('outfit-loading').classList.add('active');
  try {
    const weather = await API.fetchWeather(loc.lat, loc.lon);
    OSTATE.weather = weather;
    renderOutfitContext(weather);
    renderOutfit();
  } catch(e) {
    console.error(e);
  } finally {
    document.getElementById('outfit-loading').classList.remove('active');
  }
}

/* ── Weather context bar ─────────────────────────── */
function renderOutfitContext(w) {
  const c    = w.current;
  const info = getWeatherInfo(c.weather_code);
  const temp = convertTemp(c.temperature_2m, OSTATE.unit);
  document.getElementById('outfit-temp').textContent      = temp + '\u00b0' + OSTATE.unit;
  document.getElementById('outfit-condition').textContent = info.label;
  document.getElementById('outfit-feels').textContent     =
    'Feels like ' + convertTemp(c.apparent_temperature, OSTATE.unit) + '\u00b0';
}

/* ── Build outfit list ───────────────────────────── */
function buildOutfitItems(weather, gender, unit) {
  const c      = weather.current;
  const d      = weather.daily;
  const tempF  = unit === 'F'
    ? convertTemp(c.temperature_2m, 'F')
    : Math.round(c.temperature_2m * 9/5 + 32);
  const rain   = d.precipitation_probability_max[0] ?? 0;
  const wind   = Math.round(c.wind_speed_10m * 0.621371);
  const uv     = c.uv_index ?? d.uv_index_max?.[0] ?? 0;
  const code   = c.weather_code;
  const isSnow = [71,73,75,77,85,86].includes(code);
  const isRain = rain >= 40 || [51,53,55,61,63,65,80,81,82].includes(code);
  const isHot  = tempF >= 80;
  const isCold = tempF < 50;

  const items = [];

  // Outer layer
  if (tempF < 20) {
    items.push({ key:'heavy_coat', reason:'Below 20°F: maximum insulation required' });
  } else if (tempF < 35) {
    items.push({ key:'puffer', reason:'Below 35°F: a puffer jacket provides critical warmth' });
  } else if (tempF < 50) {
    items.push({ key:'winter_jacket', reason:'Under 50°F: a mid-weight jacket is needed' });
  } else if (tempF < 65) {
    items.push({ key:'light_jacket', reason:'Under 65°F: a light jacket will keep you comfortable' });
  } else if (wind > 18 && tempF < 75) {
    items.push({ key:'windbreaker', reason:'Wind over 18 mph: a windbreaker cuts the chill' });
  }

  if (isRain && tempF < 65) {
    // Replace outer layer with rain jacket if cold and rainy
    items.splice(items.findIndex(i => i.key === 'light_jacket' || i.key === 'winter_jacket'), 1);
    items.unshift({ key:'rain_jacket', reason:'Rain forecast: a waterproof jacket is essential' });
  } else if (isRain && tempF >= 65) {
    // Warm and rainy: just umbrella
  }

  // Base layer (top)
  if (tempF < 20) {
    items.push({ key:'thermal', reason:'Frigid temps: thermal base layer locks in warmth' });
  } else if (tempF < 50) {
    items.push({ key:'sweater', reason: tempF < 35 ? 'A heavy sweater over thermals for insulation' : 'A sweater as your mid-layer' });
  } else if (tempF < 65) {
    items.push({ key:'long_sleeve', reason:'A long sleeve shirt is ideal at this temperature' });
  } else {
    if (gender === 'female' && tempF >= 75) {
      items.push({ key:'tank', reason:'Light and breathable for warm weather' });
    } else {
      items.push({ key:'tshirt', reason:'A t-shirt is all you need at this temperature' });
    }
  }

  // Bottom
  if (tempF < 35) {
    items.push({ key:'jeans', reason:'Heavy denim provides extra insulation in the cold' });
  } else if (tempF < 65) {
    items.push({ key:'chinos', reason:'Chinos strike the right balance of warmth and comfort' });
  } else if (tempF >= 80) {
    if (gender === 'female') {
      items.push({ key: isHot ? 'skirt' : 'shorts', reason: isHot ? 'A light skirt maximizes airflow in the heat' : 'Shorts keep you cool and comfortable' });
    } else {
      items.push({ key:'shorts', reason:'Shorts are the right call in the heat' });
    }
  } else {
    if (gender === 'female' && tempF >= 70) {
      items.push({ key:'light_pants', reason:'Light pants or a midi skirt work well at this temperature' });
    } else {
      items.push({ key:'light_pants', reason:'Light pants are comfortable in mild weather' });
    }
  }

  // Footwear
  if (isSnow || tempF < 25) {
    items.push({ key:'snow_boots', reason:'Snow or extreme cold: insulated waterproof boots are a must' });
  } else if (isRain && tempF < 65) {
    items.push({ key:'rain_boots', reason:'Rain and cool temps: waterproof boots keep your feet dry' });
  } else if (tempF < 50) {
    items.push({ key:'boots', reason:'Cool weather calls for ankle or knee boots' });
  } else if (tempF >= 80) {
    items.push({ key:'sandals', reason:'Sandals keep your feet cool and comfortable in the heat' });
  } else {
    items.push({ key:'sneakers', reason:'Sneakers are the versatile choice for this weather' });
  }

  // Accessories
  if (tempF < 35) {
    items.push({ key:'scarf',   reason:'A scarf shields your neck and chest from the cold' });
    items.push({ key:'gloves',  reason:'Gloves protect your hands in freezing temperatures' });
    items.push({ key:'beanie',  reason:'A beanie prevents significant heat loss from your head' });
  } else if (tempF < 50) {
    items.push({ key:'scarf', reason:'A light scarf adds warmth without bulk' });
  }

  if (isRain) {
    items.push({ key:'umbrella', reason:'Rain forecast above 40%: carry an umbrella' });
  }

  if (uv >= 5) {
    items.push({ key:'sunglasses', reason:'UV index ' + Math.round(uv) + ': protect your eyes' });
  }
  if (uv >= 7 && tempF >= 60) {
    items.push({ key:'sun_hat', reason:'Very high UV: a hat prevents sunburn and eye strain' });
  }

  return items;
}

/* ── SVG clothing icons ──────────────────────────── */
const SVG_ICONS = {
  heavy_coat: (c) => `<svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28,12 L10,24 L2,18 L6,40 L18,36 L18,82 L62,82 L62,36 L74,40 L78,18 L70,24 L52,12 L46,20 L40,23 L34,20 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="40" y1="23" x2="40" y2="82" stroke="${c}" stroke-width="1.5" opacity="0.5"/>
    <path d="M34,30 Q36,36 34,44 M46,30 Q44,36 46,44" stroke="${c}" stroke-width="1.5" fill="none" opacity="0.6"/>
    <path d="M18,55 L62,55 M18,65 L62,65" stroke="${c}" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.4"/>
  </svg>`,

  puffer: (c) => `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28,12 L12,22 L4,17 L7,36 L18,33 L18,70 L62,70 L62,33 L73,36 L76,17 L68,22 L52,12 L46,19 L40,22 L34,19 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="40" y1="22" x2="40" y2="70" stroke="${c}" stroke-width="1.5" opacity="0.5"/>
    <path d="M18,34 Q40,30 62,34 M18,44 Q40,40 62,44 M18,54 Q40,50 62,54 M18,64 Q40,60 62,64" stroke="${c}" stroke-width="1.8" fill="none" opacity="0.5"/>
  </svg>`,

  winter_jacket: (c) => `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M29,13 L13,23 L4,18 L7,36 L19,33 L19,70 L61,70 L61,33 L73,36 L76,18 L67,23 L51,13 L45,20 L40,22 L35,20 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="40" y1="22" x2="40" y2="70" stroke="${c}" stroke-width="1.5" opacity="0.5"/>
    <path d="M35,22 Q36,30 35,38 M45,22 Q44,30 45,38" stroke="${c}" stroke-width="1.5" fill="none" opacity="0.6"/>
  </svg>`,

  rain_jacket: (c) => `<svg viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28,12 L12,22 L4,17 L7,36 L18,33 L18,78 L62,78 L62,33 L73,36 L76,17 L68,22 L52,12 L47,10 Q40,6 33,10 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M33,10 Q40,14 47,10" stroke="${c}" stroke-width="2" fill="none"/>
    <line x1="40" y1="15" x2="40" y2="78" stroke="${c}" stroke-width="1.5" opacity="0.5"/>
    <path d="M25,50 L22,58 M35,50 L32,58 M45,50 L42,58 M55,50 L52,58" stroke="${c}" stroke-width="1.5" opacity="0.55" stroke-linecap="round"/>
  </svg>`,

  windbreaker: (c) => `<svg viewBox="0 0 80 75" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M29,12 L14,22 L5,17 L8,34 L19,31 L19,65 L61,65 L61,31 L72,34 L75,17 L66,22 L51,12 L45,18 L40,20 L35,18 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="40" y1="20" x2="40" y2="65" stroke="${c}" stroke-width="1.5" opacity="0.6"/>
    <path d="M19,38 L61,38" stroke="${c}" stroke-width="1.5" opacity="0.4"/>
  </svg>`,

  light_jacket: (c) => `<svg viewBox="0 0 80 75" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30,13 L15,22 L6,17 L9,34 L20,31 L20,65 L60,65 L60,31 L71,34 L74,17 L65,22 L50,13 L44,19 L40,21 L36,19 Z" stroke="${c}" stroke-width="2.5" fill="${c}18" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="40" y1="21" x2="40" y2="65" stroke="${c}" stroke-width="1.5" opacity="0.5"/>
  </svg>`,

  sweater: (c) => `<svg viewBox="0 0 80 75" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30,16 L15,25 L7,20 L10,36 L20,33 L20,65 L60,65 L60,33 L70,36 L73,20 L65,25 L50,16 Q45,11 40,11 Q35,11 30,16 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M20,62 L60,62 M20,65 L60,65" stroke="${c}" stroke-width="2" opacity="0.5"/>
    <path d="M33,16 Q37,20 40,19 Q43,20 47,16" stroke="${c}" stroke-width="2" fill="none"/>
  </svg>`,

  thermal: (c) => `<svg viewBox="0 0 80 75" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30,16 L14,26 L6,20 L9,38 L20,34 L20,65 L60,65 L60,34 L71,38 L74,20 L66,26 L50,16 Q45,10 40,10 Q35,10 30,16 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M20,38 Q40,34 60,38 M20,46 Q40,42 60,46 M20,54 Q40,50 60,54" stroke="${c}" stroke-width="1.3" fill="none" opacity="0.45"/>
  </svg>`,

  long_sleeve: (c) => `<svg viewBox="0 0 80 75" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30,15 L14,26 L6,20 L9,38 L20,34 L20,65 L60,65 L60,34 L71,38 L74,20 L66,26 L50,15 Q45,9 40,9 Q35,9 30,15 Z" stroke="${c}" stroke-width="2.5" fill="${c}18" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`,

  tshirt: (c) => `<svg viewBox="0 0 80 70" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30,14 L16,24 L8,18 L11,34 L22,30 L22,62 L58,62 L58,30 L69,34 L72,18 L64,24 L50,14 Q45,8 40,8 Q35,8 30,14 Z" stroke="${c}" stroke-width="2.5" fill="${c}18" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`,

  tank: (c) => `<svg viewBox="0 0 60 75" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18,10 Q22,6 30,6 Q38,6 42,10 L46,16 L40,20 L40,68 L20,68 L20,20 L14,16 Z" stroke="${c}" stroke-width="2.5" fill="${c}18" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`,

  jeans: (c) => `<svg viewBox="0 0 70 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12,6 L58,6 L62,48 L46,48 L40,84 L30,84 L24,48 L8,48 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="35" y1="6" x2="35" y2="48" stroke="${c}" stroke-width="2" opacity="0.6"/>
    <path d="M12,6 L14,18 L20,16 M58,6 L56,18 L50,16" stroke="${c}" stroke-width="1.5" fill="none" opacity="0.5"/>
    <line x1="12" y1="20" x2="58" y2="20" stroke="${c}" stroke-width="1.5" opacity="0.4"/>
  </svg>`,

  chinos: (c) => `<svg viewBox="0 0 70 88" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12,5 L58,5 L61,46 L46,46 L40,82 L30,82 L24,46 L9,46 Z" stroke="${c}" stroke-width="2.5" fill="${c}18" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="35" y1="5" x2="35" y2="46" stroke="${c}" stroke-width="2" opacity="0.5"/>
    <line x1="12" y1="18" x2="58" y2="18" stroke="${c}" stroke-width="1.5" opacity="0.4"/>
  </svg>`,

  light_pants: (c) => `<svg viewBox="0 0 70 85" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13,5 L57,5 L60,44 L45,44 L39,80 L31,80 L25,44 L10,44 Z" stroke="${c}" stroke-width="2.5" fill="${c}18" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="35" y1="5" x2="35" y2="44" stroke="${c}" stroke-width="2" opacity="0.5"/>
  </svg>`,

  shorts: (c) => `<svg viewBox="0 0 70 58" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10,5 L60,5 L63,40 L46,40 L40,54 L30,54 L24,40 L7,40 Z" stroke="${c}" stroke-width="2.5" fill="${c}18" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="35" y1="5" x2="35" y2="40" stroke="${c}" stroke-width="2" opacity="0.5"/>
    <line x1="10" y1="17" x2="60" y2="17" stroke="${c}" stroke-width="1.5" opacity="0.35"/>
  </svg>`,

  skirt: (c) => `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24,8 L56,8 L68,72 L12,72 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="24" y1="8" x2="56" y2="8" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
    <path d="M28,24 L16,72 M35,20 L26,72 M45,20 L54,72 M52,24 L64,72" stroke="${c}" stroke-width="1" opacity="0.25"/>
  </svg>`,

  snow_boots: (c) => `<svg viewBox="0 0 80 75" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16,8 L16,52 L8,56 L6,68 L66,68 L68,56 L52,50 L52,8 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M16,34 Q34,30 52,34" stroke="${c}" stroke-width="1.5" fill="none" opacity="0.5"/>
    <path d="M16,44 Q34,40 52,44" stroke="${c}" stroke-width="1.5" fill="none" opacity="0.5"/>
    <path d="M6,68 L66,68" stroke="${c}" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/>
  </svg>`,

  rain_boots: (c) => `<svg viewBox="0 0 80 85" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16,5 L16,58 L8,62 L6,74 L66,74 L68,62 L52,56 L52,5 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M16,22 Q34,18 52,22 M16,36 Q34,32 52,36 M16,50 Q34,46 52,50" stroke="${c}" stroke-width="1.2" fill="none" opacity="0.4"/>
    <path d="M6,74 L66,74" stroke="${c}" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/>
  </svg>`,

  boots: (c) => `<svg viewBox="0 0 80 75" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18,8 L18,50 L10,54 L8,66 L64,66 L66,54 L50,48 L50,8 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M18,38 Q34,34 50,38" stroke="${c}" stroke-width="1.5" fill="none" opacity="0.5"/>
    <path d="M8,66 L64,66" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity="0.65"/>
  </svg>`,

  sneakers: (c) => `<svg viewBox="0 0 90 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6,38 L6,24 Q8,16 24,14 L46,13 Q62,14 70,20 L74,32 L78,44 L78,50 L6,50 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M6,38 L78,38" stroke="${c}" stroke-width="1.5" opacity="0.4"/>
    <path d="M24,14 L20,38 M36,13 L34,38 M48,13 L48,38" stroke="${c}" stroke-width="1.2" opacity="0.35"/>
    <path d="M6,50 L78,50" stroke="${c}" stroke-width="3.5" stroke-linecap="round" opacity="0.6"/>
  </svg>`,

  sandals: (c) => `<svg viewBox="0 0 88 55" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8,38 Q8,28 20,26 L68,24 Q80,26 80,38 L80,44 L8,44 Z" stroke="${c}" stroke-width="2.5" fill="${c}18" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M26,26 L24,10 Q26,8 30,10 L32,26 M52,25 L52,10 Q54,8 58,10 L58,25" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
    <path d="M24,18 L58,16" stroke="${c}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <path d="M8,44 L80,44" stroke="${c}" stroke-width="3.5" stroke-linecap="round" opacity="0.65"/>
  </svg>`,

  umbrella: (c) => `<svg viewBox="0 0 80 85" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40,10 Q6,22 6,46 L40,46 Z" stroke="${c}" stroke-width="2.5" fill="${c}22" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M40,10 Q74,22 74,46 L40,46 Z" stroke="${c}" stroke-width="2.5" fill="${c}22" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M40,10 Q40,22 40,46" stroke="${c}" stroke-width="1.5" fill="none" opacity="0.5"/>
    <path d="M18,46 Q18,36 26,38 Q26,26 34,28" stroke="${c}" stroke-width="1.2" fill="none" opacity="0.4"/>
    <path d="M40,46 L40,74 Q40,80 34,80 Q28,80 28,74" stroke="${c}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <line x1="6" y1="46" x2="74" y2="46" stroke="${c}" stroke-width="1.5" opacity="0.4"/>
  </svg>`,

  scarf: (c) => `<svg viewBox="0 0 90 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8,20 Q22,12 36,20 Q50,28 64,20 Q72,16 80,20 L80,32 Q72,28 64,32 Q50,40 36,32 Q22,24 8,32 Z" stroke="${c}" stroke-width="2.5" fill="${c}22" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M64,20 L70,48 Q70,54 64,54 L58,54 Q54,54 52,48 L48,32" stroke="${c}" stroke-width="2.5" fill="${c}22" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`,

  gloves: (c) => `<svg viewBox="0 0 90 70" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10,40 L10,20 Q10,14 16,14 Q22,14 22,20 L22,30 L26,20 Q26,14 32,14 Q38,14 38,20 L38,30 L42,22 Q42,16 48,16 Q54,16 54,22 L54,32 L56,26 Q56,20 62,20 Q68,20 68,26 L68,44 Q68,56 56,60 L28,60 Q14,58 10,44 Z" stroke="${c}" stroke-width="2.5" fill="${c}20" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="22" y1="20" x2="22" y2="30" stroke="${c}" stroke-width="1" opacity="0.4"/>
    <line x1="38" y1="20" x2="38" y2="30" stroke="${c}" stroke-width="1" opacity="0.4"/>
    <line x1="54" y1="22" x2="54" y2="32" stroke="${c}" stroke-width="1" opacity="0.4"/>
  </svg>`,

  beanie: (c) => `<svg viewBox="0 0 80 70" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,50 Q14,16 40,14 Q66,16 66,50 Z" stroke="${c}" stroke-width="2.5" fill="${c}22" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M14,50 Q14,60 40,60 Q66,60 66,50" stroke="${c}" stroke-width="3" fill="${c}12" stroke-linecap="round"/>
    <path d="M34,22 Q40,14 46,22 Q50,28 40,30 Q30,28 34,22 Z" stroke="${c}" stroke-width="1.8" fill="${c}30" stroke-linejoin="round"/>
    <path d="M18,38 Q40,32 62,38 M18,46 Q40,40 62,46" stroke="${c}" stroke-width="1.5" fill="none" opacity="0.4"/>
  </svg>`,

  sunglasses: (c) => `<svg viewBox="0 0 90 45" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="12" width="32" height="24" rx="12" stroke="${c}" stroke-width="2.5" fill="${c}22"/>
    <rect x="52" y="12" width="32" height="24" rx="12" stroke="${c}" stroke-width="2.5" fill="${c}22"/>
    <line x1="38" y1="22" x2="52" y2="22" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="6" y1="22" x2="2" y2="16" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="84" y1="22" x2="88" y2="16" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M14,20 Q22,18 30,22" stroke="${c}" stroke-width="1.2" fill="none" opacity="0.45"/>
    <path d="M60,20 Q68,18 76,22" stroke="${c}" stroke-width="1.2" fill="none" opacity="0.45"/>
  </svg>`,

  sun_hat: (c) => `<svg viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="38" rx="46" ry="16" stroke="${c}" stroke-width="2.5" fill="${c}18"/>
    <path d="M20,38 Q20,10 50,8 Q80,10 80,38" stroke="${c}" stroke-width="2.5" fill="${c}22" stroke-linejoin="round"/>
    <ellipse cx="50" cy="38" rx="30" ry="8" stroke="${c}" stroke-width="2" fill="${c}12"/>
    <path d="M24,30 Q50,22 76,30" stroke="${c}" stroke-width="1.5" fill="none" opacity="0.4"/>
  </svg>`,
};

/* ── Outfit item metadata ─────────────────────────── */
const ITEM_META = {
  heavy_coat:    { label:'Heavy Coat',        color:'#90A4AE', category:'Outer Layer'   },
  puffer:        { label:'Puffer Jacket',     color:'#78909C', category:'Outer Layer'   },
  winter_jacket: { label:'Winter Jacket',     color:'#607D8B', category:'Outer Layer'   },
  rain_jacket:   { label:'Rain Jacket',       color:'#4FC3F7', category:'Outer Layer'   },
  windbreaker:   { label:'Windbreaker',       color:'#81C784', category:'Outer Layer'   },
  light_jacket:  { label:'Light Jacket',      color:'#A5D6A7', category:'Outer Layer'   },
  thermal:       { label:'Thermal Base',      color:'#BCAAA4', category:'Top'           },
  sweater:       { label:'Sweater',           color:'#CE93D8', category:'Top'           },
  long_sleeve:   { label:'Long Sleeve',       color:'#80DEEA', category:'Top'           },
  tshirt:        { label:'T-Shirt',           color:'#FFD54F', category:'Top'           },
  tank:          { label:'Tank Top',          color:'#FFAB91', category:'Top'           },
  jeans:         { label:'Jeans',             color:'#7986CB', category:'Bottoms'       },
  chinos:        { label:'Chinos',            color:'#BCAAA4', category:'Bottoms'       },
  light_pants:   { label:'Light Pants',       color:'#B0BEC5', category:'Bottoms'       },
  shorts:        { label:'Shorts',            color:'#80CBC4', category:'Bottoms'       },
  skirt:         { label:'Skirt',             color:'#F48FB1', category:'Bottoms'       },
  snow_boots:    { label:'Snow Boots',        color:'#B0BEC5', category:'Footwear'      },
  rain_boots:    { label:'Rain Boots',        color:'#4DD0E1', category:'Footwear'      },
  boots:         { label:'Boots',             color:'#A1887F', category:'Footwear'      },
  sneakers:      { label:'Sneakers',          color:'#E0E0E0', category:'Footwear'      },
  sandals:       { label:'Sandals',           color:'#FFCC80', category:'Footwear'      },
  umbrella:      { label:'Umbrella',          color:'#7986CB', category:'Accessories'   },
  scarf:         { label:'Scarf',             color:'#EF9A9A', category:'Accessories'   },
  gloves:        { label:'Gloves',            color:'#A5D6A7', category:'Accessories'   },
  beanie:        { label:'Beanie',            color:'#CE93D8', category:'Accessories'   },
  sunglasses:    { label:'Sunglasses',        color:'#90CAF9', category:'Accessories'   },
  sun_hat:       { label:'Sun Hat',           color:'#FFCC80', category:'Accessories'   },
};

/* ── Render outfit ───────────────────────────────── */
function renderOutfit() {
  const items = buildOutfitItems(OSTATE.weather, OSTATE.gender, OSTATE.unit);
  const grid  = document.getElementById('outfit-grid');
  grid.innerHTML = '';

  const categories = ['Outer Layer','Top','Bottoms','Footwear','Accessories'];
  const grouped = {};
  categories.forEach(c => grouped[c] = []);

  items.forEach(({ key, reason }) => {
    const meta = ITEM_META[key];
    if (!meta) return;
    grouped[meta.category].push({ key, reason, ...meta });
  });

  categories.forEach(cat => {
    if (!grouped[cat].length) return;
    const section = document.createElement('div');
    section.className = 'outfit-section';
    section.innerHTML = `<div class="outfit-section-label">${cat}</div>
      <div class="outfit-items-row" id="row-${cat.replace(/\s/g,'-')}"></div>`;
    grid.appendChild(section);

    const row = section.querySelector('.outfit-items-row');
    grouped[cat].forEach(item => {
      const card = document.createElement('div');
      card.className = 'outfit-item-card';
      card.style.setProperty('--item-color', item.color);
      card.innerHTML = `
        <div class="outfit-icon">${SVG_ICONS[item.key]?.(item.color) ?? ''}</div>
        <div class="outfit-item-label">${item.label}</div>
        <div class="outfit-item-reason">${item.reason}</div>
      `;
      row.appendChild(card);
    });
  });

  renderAdvisories();
}

function renderAdvisories() {
  const w     = OSTATE.weather;
  const c     = w.current;
  const d     = w.daily;
  const rain  = d.precipitation_probability_max[0] ?? 0;
  const uv    = c.uv_index ?? d.uv_index_max?.[0] ?? 0;
  const code  = c.weather_code;
  const wind  = Math.round(c.wind_speed_10m * 0.621371);
  const tempF = Math.round(c.temperature_2m * 9/5 + 32);
  const isSnow = [71,73,75,77,85,86].includes(code);
  const advisories = [];

  if (isSnow)      advisories.push({ icon: svgSnowflake(), text: 'Snow in the forecast. Waterproof boots and layers are critical.', color:'#90CAF9' });
  else if (rain >= 70) advisories.push({ icon: svgRainDrop(),  text: 'Heavy rain likely. An umbrella is strongly recommended.', color:'#64B5F6' });
  else if (rain >= 40) advisories.push({ icon: svgRainDrop(),  text: 'Rain possible. Carry an umbrella just in case.', color:'#90CAF9' });

  if (uv >= 8)     advisories.push({ icon: svgSun(), text: 'Very high UV today. Wear SPF 30 or higher and protect your eyes.', color:'#FFD54F' });
  else if (uv >= 5) advisories.push({ icon: svgSun(), text: 'Moderate UV. Sunscreen and sunglasses are a smart choice.', color:'#FFCC80' });

  if (wind >= 25)  advisories.push({ icon: svgWind(), text: `Gusty winds at ${wind} mph. Avoid loose scarves outdoors.`, color:'#A5D6A7' });
  if (tempF >= 95) advisories.push({ icon: svgThermo(), text: 'Extreme heat advisory. Stay hydrated and wear light, breathable fabrics.', color:'#EF9A9A' });

  const container = document.getElementById('outfit-advisories');
  container.innerHTML = '';
  advisories.forEach(a => {
    const el = document.createElement('div');
    el.className = 'outfit-advisory';
    el.style.borderColor = a.color + '55';
    el.innerHTML = `<div class="advisory-icon" style="color:${a.color}">${a.icon}</div>
      <div class="advisory-text">${a.text}</div>`;
    container.appendChild(el);
  });
}

/* ── Small advisory SVG icons ────────────────────── */
function svgSnowflake() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
    <line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>`;
}
function svgRainDrop() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M12 2 Q18 10 18 15 A6 6 0 0 1 6 15 Q6 10 12 2 Z"/>
  </svg>`;
}
function svgSun() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
    <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
  </svg>`;
}
function svgWind() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M5 8 Q10 4 15 8 Q20 12 15 16"/><path d="M3 12 L18 12"/><path d="M5 16 Q10 20 14 16"/>
  </svg>`;
}
function svgThermo() {
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z"/>
  </svg>`;
}
